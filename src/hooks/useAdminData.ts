import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

export type Counter = { id: string; name: string; username?: string; password?: string };
export type InventoryItem = { id: string; counter_id: string; counter_name: string; vehicle_model: string; name: string; accessory_code?: string; quantity: number; price: number };
export type LoginDetail = { user_id: string; name: string; login_count: number };
export type SalesReport = { counter_id: string; counter_name: string; total_bills: number; total_items: number; total_sales: number; total_collected: number; outstanding: number };
export type InventorySummary = { counter_id: string; counter_name: string; surplus_count: number; shortage_count: number };
export type ModelAccessory = { name: string; accessory_code?: string; counter_name: string; quantity: number; price: number };
export type CounterBill = { 
  id: string; 
  bill_number?: string; 
  created_at: string; 
  accessory_name: string; 
  accessory_code?: string; 
  vehicle_model: string; 
  quantity: number; 
  total_amount: number; 
  payment_method: string; 
  amount_paid: number; 
  amount_left: number; 
  chassis_number?: string; 
  engine_number?: string; 
  checklist_number?: string;
  items?: any[];
  counter_id?: string;
  profiles?: { name: string };
};

export function useAdminData() {
  const [stats, setStats] = useState({ uniqueLogins: 0, items: 0, models: 0 });
  const [counters, setCounters] = useState<Counter[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loginDetails, setLoginDetails] = useState<LoginDetail[]>([]);
  const [vehicleModels, setVehicleModels] = useState<string[]>([]);
  const [modelAccessories, setModelAccessories] = useState<ModelAccessory[]>([]);
  const [allBills, setAllBills] = useState<CounterBill[]>([]);
  const [uploading, setUploading] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    fetchStats();
    fetchCounters();
    fetchInventory();
    fetchBills();
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const { data: loginData } = await supabase.from('login_logs').select('user_id');
      const { data: accessoryData } = await supabase.from('accessories').select('vehicle_model');
      setStats({
        uniqueLogins: new Set(loginData?.map(l => l.user_id) || []).size,
        items: accessoryData?.length || 0,
        models: new Set(accessoryData?.map(a => a.vehicle_model) || []).size
      });
    } catch (error) { console.error(error); }
  }, []);

  const fetchCounters = useCallback(async () => {
    // 1. Try to fetch all fields (including username/password)
    let profilesData: any[] | null = null;
    const { data, error } = await supabase.from('profiles').select('id, name, username, password').eq('role', 'counter');
    profilesData = data;
    
    if (error) {
      console.warn('Could not fetch counter credentials, falling back to basic info:', error);
      // Fallback: Fetch only id and name
      const { data: fallbackData, error: fallbackError } = await supabase.from('profiles').select('id, name').eq('role', 'counter');
      if (fallbackError) {
        console.error('Error fetching counters:', fallbackError);
        return;
      }
      profilesData = fallbackData;
      // Optional: Inform the user that columns are missing
      // toast.error('Username/Password columns missing in database profiles table.');
    }
    
    // 2. Fetch login counts
    const { data: logsData } = await supabase.from('login_logs').select('user_id');
    
    const loginMap = new Map<string, number>();
    (logsData || []).forEach(log => {
      loginMap.set(log.user_id, (loginMap.get(log.user_id) || 0) + 1);
    });

    const merged = (profilesData || []).map(p => ({
      ...p,
      login_count: loginMap.get(p.id) || 0
    }));

    setCounters(merged);
    setStats(prev => ({ ...prev, uniqueLogins: merged.length }));
  }, []);

  const updateCounter = async (id: string, updates: Partial<Counter>) => {
    try {
      const { error } = await supabase.from('profiles').update(updates).eq('id', id);
      if (error) throw error;
      toast.success('Counter updated successfully');
      fetchCounters();
    } catch (error: any) {
      toast.error(error.message || 'Error updating counter');
    }
  };

  const deleteCounter = async (id: string) => {
    if (!confirm('Are you sure you want to delete this counter? This will permanently remove all associated bills, logs, and inventory.')) return;
    
    try {
      // 1. Delete Bills first (they reference accessories and profiles)
      const { error: billError } = await supabase.from('bills').delete().eq('counter_id', id);
      if (billError) {
        console.error('Bill deletion error:', billError);
        throw new Error(`Failed to delete bills: ${billError.message}`);
      }

      // 2. Delete Login Logs
      const { error: logError } = await supabase.from('login_logs').delete().eq('user_id', id);
      if (logError) {
        console.error('Log deletion error:', logError);
        throw new Error(`Failed to delete login logs: ${logError.message}`);
      }

      // 3. Delete Accessories (Inventory)
      const { error: invError } = await supabase.from('accessories').delete().eq('counter_id', id);
      if (invError) {
        console.error('Inventory deletion error:', invError);
        throw new Error(`Failed to delete inventory: ${invError.message}`);
      }

      // 4. Finally delete the Profile
      const { error: profileError } = await supabase.from('profiles').delete().eq('id', id);
      if (profileError) {
        console.error('Profile deletion error:', profileError);
        throw new Error(`Failed to delete profile: ${profileError.message}`);
      }

      // 5. Update local state immediately for instant UI response
      setCounters(prev => prev.filter(c => c.id !== id));
      
      // Update stats locally as well
      setStats(prev => ({ ...prev, uniqueLogins: Math.max(0, prev.uniqueLogins - 1) }));

      toast.success('Counter and all data deleted successfully');
      
      // We explicitly DO NOT fetchCounters here to avoid race conditions 
      // where the DB might still return the deleted record for a few milliseconds.
      // The local state update above is sufficient for the UI.
    } catch (error: any) {
      toast.error(error.message || 'Error during deletion');
    }
  };

  const fetchInventory = useCallback(async () => {
    const { data } = await supabase.from('accessories').select(`id, counter_id, vehicle_model, name, accessory_code, quantity, price, profiles!inner(name)`).order('vehicle_model', { ascending: true });
    setInventory((data as any[] || []).map((item) => ({
      id: item.id, counter_id: item.counter_id, counter_name: item.profiles.name, vehicle_model: item.vehicle_model, name: item.name, accessory_code: item.accessory_code, quantity: item.quantity, price: item.price
    })));
  }, []);

  const groupBills = useCallback((data: any[]): CounterBill[] => {
    const map = new Map<string, CounterBill>();
    data.forEach(item => {
      // Group by base bill number (strip suffix like -1, -2 if present)
      const bNo = item.bill_number ? item.bill_number.replace(/-\d+$/, '') : `TEMP-${item.id}`;
      
      const existing = map.get(bNo);
      if (!existing) {
        map.set(bNo, { 
          ...item, 
          bill_number: bNo, // Show the base number in the list
          items: [item],
          accessory_name: item.accessories?.name || 'Unknown',
          vehicle_model: item.accessories?.vehicle_model || '-',
          quantity: Number(item.quantity) || 0,
          total_amount: Number(item.total_amount) || 0,
          amount_paid: Number(item.amount_paid) || 0,
          amount_left: Number(item.amount_left) || 0
        });
      } else {
        if (!existing.items) existing.items = [];
        existing.items.push(item);
        existing.quantity += Number(item.quantity) || 0;
        existing.total_amount += Number(item.total_amount) || 0;
        existing.amount_paid += Number(item.amount_paid) || 0;
        existing.amount_left += Number(item.amount_left) || 0;
      }
    });
    return Array.from(map.values());
  }, []);

  const fetchBills = useCallback(async () => {
    const { data } = await supabase.from('bills').select(`*, profiles!inner(name), accessories (name, accessory_code, vehicle_model)`);
    setAllBills(groupBills(data || []));
  }, [groupBills]);

  const filteredBills = useMemo(() => {
    return allBills.filter(bill => {
      if (!startDate && !endDate) return true;
      const billDate = new Date(bill.created_at);
      const billDateStr = billDate.toISOString().split('T')[0];
      if (startDate && billDateStr < startDate) return false;
      if (endDate && billDateStr > endDate) return false;
      return true;
    });
  }, [allBills, startDate, endDate]);

  const salesReport = useMemo(() => {
    const map = new Map<string, SalesReport>();
    filteredBills.forEach((bill: any) => {
      const existing = map.get(bill.counter_id);
      if (existing) {
        existing.total_bills++;
        existing.total_items += Number(bill.quantity) || 0;
        existing.total_sales += Number(bill.total_amount) || 0;
        existing.total_collected += Number(bill.amount_paid) || 0;
        existing.outstanding += Number(bill.amount_left) || 0;
      } else {
        map.set(bill.counter_id, {
          counter_id: bill.counter_id, counter_name: bill.profiles?.name || 'Unknown', total_bills: 1,
          total_items: Number(bill.quantity) || 0,
          total_sales: Number(bill.total_amount) || 0, total_collected: Number(bill.amount_paid) || 0, outstanding: Number(bill.amount_left) || 0
        });
      }
    });
    return Array.from(map.values());
  }, [filteredBills]);

  const inventoryReport = useMemo(() => {
    const map = new Map<string, InventorySummary>();
    inventory.forEach((item: any) => {
      const existing = map.get(item.counter_id);
      const isSurplus = item.quantity > 5;
      const isShortage = item.quantity <= 5;

      if (existing) {
        if (isSurplus) existing.surplus_count++;
        if (isShortage) existing.shortage_count++;
      } else {
        map.set(item.counter_id, {
          counter_id: item.counter_id,
          counter_name: item.counter_name,
          surplus_count: isSurplus ? 1 : 0,
          shortage_count: isShortage ? 1 : 0
        });
      }
    });
    return Array.from(map.values());
  }, [inventory]);

  const fetchLoginDetails = useCallback(async () => {
    // 1. Fetch all counters
    const { data: countersData } = await supabase.from('profiles').select('id, name').eq('role', 'counter');
    
    // 2. Fetch all login logs
    const { data: logsData } = await supabase.from('login_logs').select('user_id');
    
    const countMap = new Map<string, { name: string; count: number }>();
    
    // Initialize map with 0 counts for all counters
    (countersData || []).forEach((c: any) => {
      countMap.set(c.id, { name: c.name, count: 0 });
    });

    // Increment count for existing logs
    (logsData || []).forEach((row: any) => {
      const existing = countMap.get(row.user_id);
      if (existing) {
        existing.count++;
      }
    });

    setLoginDetails(Array.from(countMap.entries()).map(([user_id, v]) => ({ user_id, name: v.name, login_count: v.count })));
  }, []);

  const fetchVehicleModels = useCallback(async () => {
    const { data } = await supabase.from('accessories').select('vehicle_model');
    setVehicleModels([...new Set((data || []).map(d => d.vehicle_model))].sort());
  }, []);

  const fetchModelAccessories = useCallback(async (model: string) => {
    const { data } = await supabase.from('accessories').select(`name, accessory_code, quantity, price, profiles!inner(name)`).eq('vehicle_model', model);
    setModelAccessories((data || []).map((item: any) => ({ name: item.name, accessory_code: item.accessory_code, counter_name: item.profiles.name, quantity: item.quantity, price: item.price })));
  }, []);

  const fetchCounterBills = useCallback((counterId: string) => {
    return filteredBills.filter(b => b.counter_id === counterId);
  }, [filteredBills]);

  const handleFileUpload = useCallback(async (file: File, counterId: string) => {
    setUploading(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
      const consolidatedData = new Map<string, any>();
      
      jsonData.forEach((row: any) => {
        const rowKeys = Object.keys(row);
        const getVal = (searchKeys: string[]) => {
          for (const sKey of searchKeys) {
            if (row[sKey] !== undefined) return row[sKey];
            const foundKey = rowKeys.find(k => k.toLowerCase().includes(sKey.toLowerCase()));
            if (foundKey) return row[foundKey];
          }
          return '';
        };
        const parseNum = (val: any) => { 
          if (typeof val === 'number') return val; 
          if (!val) return 0; 
          const cleaned = val.toString().replace(/[^\d.-]/g, ''); 
          const parsed = parseFloat(cleaned); 
          return isNaN(parsed) ? 0 : parsed; 
        };
        const vehicle_model = getVal(['Vehicle Model', 'Model', 'vehicle_model', 'model']).toString().trim();
        const name = getVal(['Accessory Name', 'Accessory', 'name', 'accessory_name']).toString().trim();
        const accessory_code = getVal(['Accessory Code', 'Code', 'Item Code', 'Part Number', 'accessory_code']).toString().trim();
        const quantity = Math.abs(parseInt(getVal(['Quantity', 'Qty', 'quantity', 'qty']) || '0'));
        const price = parseNum(getVal(['Price (₹)', 'Price', 'Cost', 'MRP', 'Rate', 'Amount', 'Unit Price', 'Sale Price', 'price', 'cost', 'mrp']));
        if (!name || !vehicle_model) return;
        
        // We include accessory_code in the data but use vehicle_model and name for tracking existing rows in this batch
        const key = `${vehicle_model.toLowerCase()}|${name.toLowerCase()}`;
        const existing = consolidatedData.get(key);
        if (existing) { 
          existing.quantity += quantity; 
          existing.price = price > 0 ? price : existing.price; 
          if (!existing.accessory_code) existing.accessory_code = accessory_code;
        }
        else { consolidatedData.set(key, { counter_id: counterId, vehicle_model, name, accessory_code, quantity, price }); }
      });

      const rowsToInsert = Array.from(consolidatedData.values());
      if (rowsToInsert.length === 0) throw new Error('No valid data found.');
      const { error } = await supabase.from('accessories').upsert(rowsToInsert, { onConflict: 'counter_id,vehicle_model,name' });
      if (error) throw error;
      toast.success(`Successfully uploaded ${rowsToInsert.length} accessories!`);
      fetchInventory(); fetchStats();
    } catch (error: any) { toast.error(error.message || 'Error processing Excel file'); }
    finally { setUploading(false); }
  }, [fetchInventory, fetchStats]);

  return {
    stats, counters, inventory, loginDetails, vehicleModels, modelAccessories, salesReport, inventoryReport, uploading,
    startDate, endDate, setStartDate, setEndDate,
    fetchLoginDetails, fetchCounters, fetchVehicleModels, fetchModelAccessories, fetchCounterBills, handleFileUpload, fetchBills,
    updateCounter, deleteCounter
  };
}
