import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

export type Counter = { id: string; name: string };
export type InventoryItem = { id: string; counter_name: string; vehicle_model: string; name: string; accessory_code?: string; quantity: number; price: number };
export type LoginDetail = { user_id: string; name: string; login_count: number };
export type SalesReport = { counter_id: string; counter_name: string; total_bills: number; total_sales: number; total_collected: number; outstanding: number };
export type ModelAccessory = { name: string; accessory_code?: string; counter_name: string; quantity: number; price: number };
export type CounterBill = { id: string; bill_number?: string; created_at: string; accessory_name: string; accessory_code?: string; vehicle_model: string; quantity: number; total_amount: number; payment_method: string; amount_paid: number; amount_left: number; chassis_number?: string; engine_number?: string; checklist_number?: string };

export function useAdminData() {
  const [stats, setStats] = useState({ uniqueLogins: 0, items: 0, models: 0 });
  const [counters, setCounters] = useState<Counter[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loginDetails, setLoginDetails] = useState<LoginDetail[]>([]);
  const [vehicleModels, setVehicleModels] = useState<string[]>([]);
  const [modelAccessories, setModelAccessories] = useState<ModelAccessory[]>([]);
  const [allBills, setAllBills] = useState<any[]>([]);
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
    const { data } = await supabase.from('profiles').select('id, name').eq('role', 'counter');
    setCounters(data || []);
  }, []);

  const fetchInventory = useCallback(async () => {
    const { data } = await supabase.from('accessories').select(`id, vehicle_model, name, accessory_code, quantity, price, profiles!inner(name)`).order('vehicle_model', { ascending: true });
    setInventory(data?.map((item: any) => ({
      id: item.id, counter_name: item.profiles.name, vehicle_model: item.vehicle_model, name: item.name, accessory_code: item.accessory_code, quantity: item.quantity, price: item.price
    })) || []);
  }, []);

  const fetchBills = useCallback(async () => {
    const { data } = await supabase.from('bills').select(`*, profiles!inner(name), accessories (name, accessory_code, vehicle_model)`);
    setAllBills(data || []);
  }, []);

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
        existing.total_sales += Number(bill.total_amount) || 0;
        existing.total_collected += Number(bill.amount_paid) || 0;
        existing.outstanding += Number(bill.amount_left) || 0;
      } else {
        map.set(bill.counter_id, {
          counter_id: bill.counter_id, counter_name: bill.profiles?.name || 'Unknown', total_bills: 1,
          total_sales: Number(bill.total_amount) || 0, total_collected: Number(bill.amount_paid) || 0, outstanding: Number(bill.amount_left) || 0
        });
      }
    });
    return Array.from(map.values());
  }, [filteredBills]);

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
    return filteredBills.filter(b => b.counter_id === counterId).map((b: any) => ({
      id: b.id, bill_number: b.bill_number, created_at: b.created_at, accessory_name: b.accessories?.name || 'Unknown', accessory_code: b.accessories?.accessory_code, vehicle_model: b.accessories?.vehicle_model || '-',
      quantity: b.quantity, total_amount: b.total_amount, payment_method: b.payment_method || 'Cash', amount_paid: b.amount_paid, amount_left: b.amount_left,
      chassis_number: b.chassis_number, engine_number: b.engine_number, checklist_number: b.checklist_number
    }));
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
    stats, counters, inventory, loginDetails, vehicleModels, modelAccessories, salesReport, uploading,
    startDate, endDate, setStartDate, setEndDate,
    fetchLoginDetails, fetchVehicleModels, fetchModelAccessories, fetchCounterBills, handleFileUpload
  };
}
