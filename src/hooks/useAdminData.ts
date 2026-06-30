import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

export type Counter = { id: string; name: string; username?: string; password?: string; login_count?: number };
export type Warehouse = { id: string; name: string; username?: string; password?: string; login_count?: number };
export type TeamLead = { id: string; name: string; username?: string; password?: string; assigned_counters?: string[]; assigned_warehouses?: string[]; login_count?: number };
export type Cashier = { id: string; name: string; username?: string; password?: string; assigned_counters?: string[]; login_count?: number };
export type InventoryItem = { id: string; counter_id: string; counter_name: string; vehicle_model: string; name: string; accessory_code?: string; quantity: number; price: number; cgst_percent?: number; sgst_percent?: number; created_at: string };
export type LoginDetail = { user_id: string; name: string; login_count: number };
export type SalesReport = { counter_id: string; counter_name: string; total_bills: number; total_items: number; total_sales: number; total_collected: number; outstanding: number };
export interface CashierReport {
  cashier_id: string;
  cashier_name: string;
  total_cash_collected: number;
  pending_handover: number;
  approved_handover: number;
  drawer_balance: number;
}

export interface TeamLeadReport {
  team_lead_id: string;
  team_lead_name: string;
  assigned_counters_count: number;
  assigned_counters_names: string[];
  assigned_counters_ids: string[];
  pending_approvals: number;
  approved_approvals: number;
};
export type InventorySummary = { counter_id: string; counter_name: string; surplus_count: number; shortage_count: number };
export type AmountCollectedReport = {
  counter_id: string;
  counter_name: string;
  cash_collected: number;
  upi_collected: number;
  card_collected: number;
  bank_transfer_collected: number;
  bills_data: any[];
};
export type ModelAccessory = { id: string; counter_id: string; vehicle_model: string; created_at: string; name: string; accessory_code?: string; counter_name: string; quantity: number; price: number; cgst_percent?: number; sgst_percent?: number; };
export type CounterBill = { 
  id: string; 
  bill_number?: string; 
  created_at: string; 
  accessory_name: string; 
  accessory_code?: string; 
  vehicle_model: string; 
  quantity: number; 
  base_amount?: number;
  cgst_amount?: number;
  sgst_amount?: number;
  total_amount: number; 
  payment_method: string; 
  payment_details?: any[];
  amount_paid: number; 
  amount_left: number; 
  chassis_number?: string; 
  engine_number?: string; 
  checklist_number?: string;
  items?: any[];
  counter_id?: string;
  profiles?: { name: string };
  approval_status?: string;
};

const syncAuthCredentials = async (
  oldUsername: string,
  oldPassword: string,
  newUsername?: string,
  newPassword?: string,
  role?: 'counter' | 'team_lead' | 'cashier'
) => {
  if (!oldUsername || !oldPassword) return;
  if ((!newUsername || newUsername === oldUsername) && (!newPassword || newPassword === oldPassword)) return;

  const tempSupabase = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  let emailToTry = `${oldUsername.trim().toLowerCase()}@portal.local`;
  let { error: signInError } = await tempSupabase.auth.signInWithPassword({
    email: emailToTry,
    password: oldPassword
  });

  if (signInError && role === 'team_lead') {
    emailToTry = `${oldUsername.trim().toLowerCase()}@teamlead.local`;
    const fallback = await tempSupabase.auth.signInWithPassword({
      email: emailToTry,
      password: oldPassword
    });
    signInError = fallback.error;
  } else if (signInError && role === 'cashier') {
    emailToTry = `${oldUsername.trim().toLowerCase()}@cashier.local`;
    const fallback = await tempSupabase.auth.signInWithPassword({
      email: emailToTry,
      password: oldPassword
    });
    signInError = fallback.error;
  }

  if (signInError) {
    console.warn("Could not sync auth credentials:", signInError.message);
    throw new Error("Could not authenticate with current credentials. If you previously updated this user and they cannot log in, they are out of sync. Please delete and recreate this account.");
  }

  const authUpdates: any = {};
  if (newUsername && newUsername !== oldUsername) {
     authUpdates.email = `${newUsername.trim().toLowerCase()}@portal.local`;
  }
  if (newPassword && newPassword !== oldPassword) {
     authUpdates.password = newPassword;
  }

  if (Object.keys(authUpdates).length > 0) {
    const { error: updateError } = await tempSupabase.auth.updateUser(authUpdates);
    if (updateError) {
      console.warn("Error updating auth user:", updateError.message);
      if (updateError.message.includes('invalid') || updateError.message.includes('email')) {
        throw new Error("Cannot update username (email) because 'Secure Email Change' is enabled in your Supabase project settings. Please turn it off in Authentication -> Providers -> Email, or create a new account instead.");
      }
      throw new Error("Failed to update login credentials: " + updateError.message);
    }
  }

  await tempSupabase.auth.signOut();
};

export function useAdminData() {
  const [stats, setStats] = useState({ uniqueLogins: 0, items: 0, models: 0 });
  const [counters, setCounters] = useState<Counter[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [teamLeads, setTeamLeads] = useState<TeamLead[]>([]);
  const [cashiers, setCashiers] = useState<Cashier[]>([]);
  const [cashierReports, setCashierReports] = useState<CashierReport[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loginDetails, setLoginDetails] = useState<LoginDetail[]>([]);
  const [vehicleModels, setVehicleModels] = useState<string[]>([]);
  const [modelAccessories, setModelAccessories] = useState<ModelAccessory[]>([]);
  const [allBills, setAllBills] = useState<CounterBill[]>([]);
  const [transferCart, setTransferCart] = useState<(InventoryItem & { transferQuantity: number })[]>([]);
  const [uploading, setUploading] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

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
    console.log('Fetching counters...');
    const { data, error } = await supabase.from('profiles').select('*').eq('role', 'counter');
    
    if (error) {
      console.error('Fetch Counters Error:', error);
      const { data: fallback, error: fallbackErr } = await supabase.from('profiles').select('id, name').eq('role', 'counter');
      if (fallbackErr) {
        console.error('Critical Fallback Error:', fallbackErr);
        return;
      }
      console.warn('Using fallback data (missing columns?)');
      setCounters(fallback.map(p => ({ ...p, login_count: 0 })));
      return;
    }

    console.log('Raw Profiles Data (first 1):', data?.[0]);
    if (data && data.length > 0) {
      console.log('Available Columns:', Object.keys(data[0]));
    }
    
    const { data: logsData } = await supabase.from('login_logs').select('user_id');
    const loginMap = new Map<string, number>();
    (logsData || []).forEach(log => {
      loginMap.set(log.user_id, (loginMap.get(log.user_id) || 0) + 1);
    });

    const merged = (data || []).map(p => ({
      ...p,
      login_count: loginMap.get(p.id) || 0
    }));

    console.log('Merged Counters Data (first 1):', merged[0]);
    setCounters(merged);
    setStats(prev => ({ ...prev, uniqueLogins: merged.length }));
  }, []);

  const fetchWarehouses = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('role', 'warehouse');
      if (error) throw error;
      
      const { data: logsData } = await supabase.from('login_logs').select('user_id');
      const loginMap = new Map<string, number>();
      (logsData || []).forEach(log => {
        loginMap.set(log.user_id, (loginMap.get(log.user_id) || 0) + 1);
      });
      
      const formatted = (data || []).map(p => ({
        id: p.id,
        name: p.name || p.username || 'Unknown',
        username: p.username || '',
        password: p.password || '',
        login_count: loginMap.get(p.id) || 0
      }));
      
      setWarehouses(formatted);
    } catch (err) {
      console.error('Error fetching warehouses:', err);
    }
  }, []);

  const fetchTeamLeads = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('role', 'team_lead');
      if (error) throw error;
      
      const { data: logsData } = await supabase.from('login_logs').select('user_id');
      const loginMap = new Map<string, number>();
      (logsData || []).forEach(log => {
        loginMap.set(log.user_id, (loginMap.get(log.user_id) || 0) + 1);
      });
      
      const formatted = (data || []).map(p => ({
        id: p.id,
        name: p.name || p.username || 'Unknown',
        username: p.username || '',
        password: p.password || '',
        assigned_counters: p.assigned_counters || [],
        assigned_warehouses: p.assigned_warehouses || [],
        login_count: loginMap.get(p.id) || 0
      }));
      
      setTeamLeads(formatted);
    } catch (err) {
      console.error('Error fetching team leads:', err);
    }
  }, []);

  const fetchCashiers = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('role', 'cashier');
      if (error) throw error;
      
      const { data: logsData } = await supabase.from('login_logs').select('user_id');
      const loginMap = new Map<string, number>();
      (logsData || []).forEach(log => {
        loginMap.set(log.user_id, (loginMap.get(log.user_id) || 0) + 1);
      });
      
      const { data: drawerData } = await supabase.from('drawer_transactions').select('*');
      const reports: CashierReport[] = [];

      const formatted = (data || []).map(p => {
        const assigned = p.assigned_counters || [];
        const allowedIds = [...assigned, p.id];
        let cashCollected = 0;
        let pendingHandover = 0;
        let approvedHandover = 0;
        let expenses = 0;
        let bankTransfers = 0;
        let refunds = 0;

        (drawerData || []).forEach(t => {
          if (allowedIds.includes(t.counter_id)) {
            if (t.transaction_type === 'cashier_transfer') {
              if (t.status === 'pending') {
                pendingHandover += Number(t.amount);
              } else if (t.status === 'approved') {
                approvedHandover += Number(t.amount);
                cashCollected += Number(t.amount);
              }
            } else if (t.status === 'approved') {
              if (t.transaction_type === 'daily_expense') expenses += Number(t.amount);
              if (t.transaction_type === 'bank_transfer') bankTransfers += Number(t.amount);
              if (t.transaction_type === 'refund') refunds += Number(t.amount);
            }
          }
        });

        reports.push({
          cashier_id: p.id,
          cashier_name: p.name || p.username || 'Unknown',
          total_cash_collected: cashCollected,
          pending_handover: pendingHandover,
          approved_handover: approvedHandover,
          drawer_balance: cashCollected - expenses - bankTransfers - refunds
        });

        return {
          id: p.id,
          name: p.name || p.username || 'Unknown',
          username: p.username || '',
          password: p.password || '',
          assigned_counters: assigned,
          login_count: loginMap.get(p.id) || 0
        };
      });
      
      setCashiers(formatted);
      setCashierReports(reports);
    } catch (err) {
      console.error('Error fetching cashiers:', err);
    }
  }, []);

  const updateCounter = async (id: string, updates: Partial<Counter>) => {
    console.log('Updating Counter:', id, updates);
    try {
      const oldData = counters.find(c => c.id === id);
      if (oldData && oldData.username && oldData.password) {
        await syncAuthCredentials(oldData.username, oldData.password, updates.username, updates.password, 'counter');
      }
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
      const { error: billError } = await supabase.from('bills').delete().eq('counter_id', id);
      if (billError) throw billError;

      const { error: logError } = await supabase.from('login_logs').delete().eq('user_id', id);
      if (logError) throw logError;

      const { error: invError } = await supabase.from('accessories').delete().eq('counter_id', id);
      if (invError) throw invError;

      const { error: profileError } = await supabase.from('profiles').delete().eq('id', id);
      if (profileError) throw profileError;

      setCounters(prev => prev.filter(c => c.id !== id));
      setStats(prev => ({ ...prev, uniqueLogins: Math.max(0, prev.uniqueLogins - 1) }));
      toast.success('Counter and all data deleted successfully');
    } catch (error: any) {
      toast.error(error.message || 'Error during deletion');
    }
  };

  const fetchInventory = useCallback(async () => {
    let query = supabase.from('accessories').select(`id, created_at, counter_id, vehicle_model, name, accessory_code, quantity, price, cgst_percent, sgst_percent, profiles!inner(name)`);
    
    if (startDate) {
      query = query.gte('created_at', `${startDate}T00:00:00`);
    }
    if (endDate) {
      query = query.lte('created_at', `${endDate}T23:59:59`);
    }

    const { data } = await query.order('created_at', { ascending: false });
    
    setInventory((data as any[] || []).map((item) => ({
      id: item.id, 
      counter_id: item.counter_id, 
      counter_name: item.profiles.name, 
      vehicle_model: item.vehicle_model, 
      name: item.name, 
      accessory_code: item.accessory_code, 
      quantity: item.quantity, 
      price: item.price,
      cgst_percent: item.cgst_percent,
      sgst_percent: item.sgst_percent,
      created_at: item.created_at
    })));
  }, [startDate, endDate]);

  const deleteAccessory = async (id: string) => {
    if (!confirm('Are you sure you want to delete this accessory from this counter?')) return;
    try {
      const { error } = await supabase.from('accessories').delete().eq('id', id);
      if (error) throw new Error('Failed to delete accessory: ' + error.message);
      
      toast.success('Accessory deleted successfully');
      fetchInventory();
    } catch (error: any) {
      toast.error(error.message || 'Error deleting accessory');
    }
  };

  const updateAccessory = async (id: string, updates: Partial<InventoryItem>) => {
    try {
      const { error } = await supabase.from('accessories').update(updates).eq('id', id);
      if (error) throw error;
      toast.success('Accessory updated successfully');
      fetchInventory();
    } catch (error: any) {
      toast.error(error.message || 'Error updating accessory');
    }
  };

  const transferAccessory = async (item: InventoryItem, targetCounterId: string, quantity: number) => {
    if (quantity > item.quantity) {
      toast.error('Transfer quantity exceeds available stock');
      return;
    }

    try {
      const { error: sourceError } = await supabase.from('accessories')
        .update({ quantity: item.quantity - quantity })
        .eq('id', item.id);
      
      if (sourceError) throw sourceError;

      const { data: existingTarget } = await supabase.from('accessories')
        .select('id, quantity')
        .eq('counter_id', targetCounterId)
        .eq('vehicle_model', item.vehicle_model)
        .eq('name', item.name)
        .maybeSingle();

      if (existingTarget) {
        const { error: targetError } = await supabase.from('accessories')
          .update({ quantity: existingTarget.quantity + quantity })
          .eq('id', existingTarget.id);
        if (targetError) throw targetError;
      } else {
        const { error: targetError } = await supabase.from('accessories')
          .insert({
            counter_id: targetCounterId,
            vehicle_model: item.vehicle_model,
            name: item.name,
            accessory_code: item.accessory_code,
            price: item.price,
            cgst_percent: item.cgst_percent,
            sgst_percent: item.sgst_percent,
            quantity: quantity,
            created_at: new Date().toISOString()
          });
        if (targetError) throw targetError;
      }

      toast.success('Accessory transferred successfully');
      fetchInventory();
    } catch (error: any) {
      toast.error(error.message || 'Error transferring accessory');
    }
  };

  const transferAllAccessories = async (items: InventoryItem[], targetCounterId: string) => {
    if (items.length === 0) {
      toast.error('No items to transfer');
      return;
    }
    
    setUploading(true);
    try {
      // 1. Set quantity to 0 for all source items in bulk
      const itemIds = items.map(i => i.id);
      const { error: sourceError } = await supabase.from('accessories')
        .update({ quantity: 0 })
        .in('id', itemIds);
        
      if (sourceError) throw sourceError;

      // 2. Transfer logic: loop to handle potential existing target items
      // Since upsert doesn't increment, we check each item.
      for (const item of items) {
        const { data: existingTarget } = await supabase.from('accessories')
          .select('id, quantity')
          .eq('counter_id', targetCounterId)
          .eq('vehicle_model', item.vehicle_model)
          .eq('name', item.name)
          .maybeSingle();

        if (existingTarget) {
          const { error: targetError } = await supabase.from('accessories')
            .update({ quantity: existingTarget.quantity + item.quantity })
            .eq('id', existingTarget.id);
          if (targetError) throw targetError;
        } else {
          const { error: targetError } = await supabase.from('accessories')
            .insert({
              counter_id: targetCounterId,
              vehicle_model: item.vehicle_model,
              name: item.name,
              accessory_code: item.accessory_code,
              price: item.price,
              cgst_percent: item.cgst_percent,
              sgst_percent: item.sgst_percent,
              quantity: item.quantity
            });
          if (targetError) throw targetError;
        }
      }

      toast.success(`Successfully transferred ${items.length} items to target counter!`);
      fetchInventory();
    } catch (error: any) {
      toast.error(error.message || 'Error during bulk transfer');
    } finally {
      setUploading(false);
    }
  };

  const addToTransferCart = (item: InventoryItem, quantity: number) => {
    if (quantity > item.quantity) {
      toast.error(`Only ${item.quantity} units available`);
      return;
    }
    setTransferCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        const newQty = existing.transferQuantity + quantity;
        if (newQty > item.quantity) {
          toast.error(`Total cart quantity exceeds available stock`);
          return prev;
        }
        return prev.map(i => i.id === item.id ? { ...i, transferQuantity: newQty } : i);
      }
      return [...prev, { ...item, transferQuantity: quantity }];
    });
    toast.success('Added to transfer cart');
  };

  const removeFromTransferCart = (id: string) => {
    setTransferCart(prev => prev.filter(i => i.id !== id));
  };

  const clearTransferCart = () => setTransferCart([]);

  const executeCartTransfer = async (targetCounterId: string) => {
    if (transferCart.length === 0) return;
    setUploading(true);
    try {
      for (const item of transferCart) {
        // Source update
        await supabase.from('accessories')
          .update({ quantity: item.quantity - item.transferQuantity })
          .eq('id', item.id);

        // Target upsert
        const { data: existingTarget } = await supabase.from('accessories')
          .select('id, quantity')
          .eq('counter_id', targetCounterId)
          .eq('vehicle_model', item.vehicle_model)
          .eq('name', item.name)
          .maybeSingle();

        if (existingTarget) {
          await supabase.from('accessories')
            .update({ quantity: existingTarget.quantity + item.transferQuantity })
            .eq('id', existingTarget.id);
        } else {
          await supabase.from('accessories').insert({
            counter_id: targetCounterId,
            vehicle_model: item.vehicle_model,
            name: item.name,
            accessory_code: item.accessory_code,
            price: item.price,
            cgst_percent: item.cgst_percent,
            sgst_percent: item.sgst_percent,
            quantity: item.transferQuantity
          });
        }
      }
      toast.success(`Successfully transferred ${transferCart.length} items!`);
      clearTransferCart();
      fetchInventory();
    } catch (error: any) {
      toast.error(error.message || 'Error during cart transfer');
    } finally {
      setUploading(false);
    }
  };

  const groupBills = useCallback((data: any[]): CounterBill[] => {
    const map = new Map<string, CounterBill>();
    data.forEach(item => {
      const bNo = item.bill_number 
        ? (item.bill_number.split('-').length > 2 ? item.bill_number.substring(0, item.bill_number.lastIndexOf('-')) : item.bill_number) 
        : `TEMP-${item.id}`;
      const existing = map.get(bNo);
      if (!existing) {
        map.set(bNo, { 
          ...item, 
          bill_number: bNo,
          items: [item],
          accessory_name: item.accessories?.name || 'Unknown',
          vehicle_model: item.accessories?.vehicle_model || '-',
          quantity: Number(item.quantity) || 0,
          base_amount: Number(item.base_amount) || 0,
          cgst_amount: Number(item.cgst_amount) || 0,
          sgst_amount: Number(item.sgst_amount) || 0,
          total_amount: Number(item.total_amount) || 0,
          amount_paid: Number(item.amount_paid) || 0,
          amount_left: Number(item.amount_left) || 0
        });
      } else {
        if (!existing.items) existing.items = [];
        existing.items.push(item);
        existing.quantity += Number(item.quantity) || 0;
        existing.base_amount = (existing.base_amount || 0) + (Number(item.base_amount) || 0);
        existing.cgst_amount = (existing.cgst_amount || 0) + (Number(item.cgst_amount) || 0);
        existing.sgst_amount = (existing.sgst_amount || 0) + (Number(item.sgst_amount) || 0);
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
      if (bill.approval_status === 'reverted' || bill.approval_status === 'reverted_by_admin') return false;
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

  const amountCollectedReport = useMemo(() => {
    const map = new Map<string, AmountCollectedReport>();
    filteredBills.forEach((bill: any) => {
      const existing: AmountCollectedReport = map.get(bill.counter_id) || {
        counter_id: bill.counter_id,
        counter_name: bill.profiles?.name || 'Unknown',
        cash_collected: 0,
        upi_collected: 0,
        card_collected: 0,
        bank_transfer_collected: 0,
        bills_data: []
      };
      
      let cash = 0, upi = 0, card = 0, bank = 0;
      
      if (bill.payment_method === 'Split Payment' && bill.payment_details) {
        bill.payment_details.forEach((p: any) => {
          const amt = Number(p.amount) || 0;
          const m = (p.method || '').toLowerCase();
          if (m.includes('cash')) cash += amt;
          else if (m.includes('upi')) upi += amt;
          else if (m.includes('card')) card += amt;
          else if (m.includes('bank')) bank += amt;
        });
      } else {
        const amt = Number(bill.amount_paid) || 0;
        const m = (bill.payment_method || '').toLowerCase();
        if (m.includes('cash')) cash += amt;
        else if (m.includes('upi')) upi += amt;
        else if (m.includes('card')) card += amt;
        else if (m.includes('bank')) bank += amt;
      }
      
      existing.cash_collected += cash;
      existing.upi_collected += upi;
      existing.card_collected += card;
      existing.bank_transfer_collected += bank;
      
      existing.bills_data.push({
        bill_number: bill.bill_number,
        cash_amount: cash,
        payment_details: bill.payment_details || [{ method: bill.payment_method, amount: bill.amount_paid }]
      });
      
      map.set(bill.counter_id, existing);
    });
    return Array.from(map.values());
  }, [filteredBills]);

  const teamLeadReports = useMemo(() => {
    if (!teamLeads || teamLeads.length === 0) return [];
    
    return teamLeads.map((tl: any) => {
      const assignedIds = tl.assigned_counters || [];
      const assignedNames = counters.filter(c => assignedIds.includes(c.id)).map(c => c.name);
      
      const tlBills = filteredBills.filter(b => assignedIds.includes(b.counter_id));
      const pendingCount = tlBills.filter(b => b.approval_status === 'pending').length;
      const approvedCount = tlBills.filter(b => b.approval_status === 'approved').length;
      
      return {
        team_lead_id: tl.id,
        team_lead_name: tl.name,
        assigned_counters_count: assignedIds.length,
        assigned_counters_names: assignedNames,
        assigned_counters_ids: assignedIds,
        pending_approvals: pendingCount,
        approved_approvals: approvedCount
      };
    });
  }, [teamLeads, counters, filteredBills]);

  const fetchLoginDetails = useCallback(async () => {
    const { data: countersData } = await supabase.from('profiles').select('id, name').eq('role', 'counter');
    const { data: logsData } = await supabase.from('login_logs').select('user_id');
    const countMap = new Map<string, { name: string; count: number }>();
    (countersData || []).forEach((c: any) => {
      countMap.set(c.id, { name: c.name, count: 0 });
    });
    (logsData || []).forEach((row: any) => {
      const existing = countMap.get(row.user_id);
      if (existing) existing.count++;
    });
    setLoginDetails(Array.from(countMap.entries()).map(([user_id, v]) => ({ user_id, name: v.name, login_count: v.count })));
  }, []);

  const fetchVehicleModels = useCallback(async () => {
    const { data } = await supabase.from('accessories').select('vehicle_model');
    setVehicleModels([...new Set((data || []).map(d => d.vehicle_model))].sort());
  }, []);

  const fetchModelAccessories = useCallback(async (model: string) => {
    const { data } = await supabase.from('accessories').select(`id, counter_id, vehicle_model, created_at, name, accessory_code, quantity, price, cgst_percent, sgst_percent, profiles!inner(name)`).eq('vehicle_model', model);
    setModelAccessories((data || []).map((item: any) => ({ 
      id: item.id,
      counter_id: item.counter_id,
      vehicle_model: item.vehicle_model,
      created_at: item.created_at,
      name: item.name, 
      accessory_code: item.accessory_code, 
      counter_name: item.profiles.name, 
      quantity: item.quantity, 
      price: item.price,
      cgst_percent: item.cgst_percent,
      sgst_percent: item.sgst_percent
    })));
  }, []);

  const fetchCounterBills = useCallback((counterId: string) => {
    return filteredBills.filter(b => b.counter_id === counterId);
  }, [filteredBills]);

  const deleteDataByDate = async (date: string) => {
    if (!confirm(`Are you sure you want to delete ALL inventory data uploaded on ${date}? This cannot be undone.`)) return;
    setUploading(true);
    try {
      let allAccessoryIds: string[] = [];
      let start = 0;
      const limit = 1000;
      let hasMore = true;

      // Fetch all accessory IDs for the given date using pagination
      while (hasMore) {
        const { data, error: fetchError } = await supabase.from('accessories')
          .select('id')
          .gte('created_at', `${date}T00:00:00`)
          .lte('created_at', `${date}T23:59:59`)
          .range(start, start + limit - 1);
        
        if (fetchError) throw new Error('Failed fetching accessories: ' + fetchError.message);
        
        if (data && data.length > 0) {
          allAccessoryIds.push(...data.map(a => a.id));
          start += limit;
          if (data.length < limit) hasMore = false;
        } else {
          hasMore = false;
        }
      }

      if (allAccessoryIds.length > 0) {
        const chunkSize = 100;
        // Delete the accessories in chunks
        for (let i = 0; i < allAccessoryIds.length; i += chunkSize) {
          const chunk = allAccessoryIds.slice(i, i + chunkSize);
          const { error: accError } = await supabase.from('accessories')
            .delete()
            .in('id', chunk);
          if (accError) throw new Error('Failed deleting accessories: ' + accError.message);
        }
      }

      toast.success(`Successfully deleted all data from ${date}`);
      fetchInventory();
      fetchStats();
    } catch (error: any) {
      toast.error(error.message || 'Error deleting data');
    } finally {
      setUploading(false);
    }
  };

  const handleFileUpload = useCallback(async (file: File, counterId: string, customDate?: string) => {
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
        const gstRaw = parseNum(getVal(['GST', 'GST %', 'gst', 'Tax', 'tax', 'GST Percentage']));
        const cgst_percent = gstRaw / 2;
        const sgst_percent = gstRaw / 2;

        if (!name || !vehicle_model) return;
        
        const key = `${vehicle_model.toLowerCase()}|${name.toLowerCase()}`;
        const existing = consolidatedData.get(key);
        if (existing) { 
          existing.quantity += quantity; 
          existing.price = price > 0 ? price : existing.price; 
          if (!existing.accessory_code) existing.accessory_code = accessory_code;
          if (gstRaw > 0) {
            existing.cgst_percent = cgst_percent;
            existing.sgst_percent = sgst_percent;
          }
        }
        else { 
          const uploadTimestamp = customDate ? `${customDate}T12:00:00Z` : new Date().toISOString();
          consolidatedData.set(key, { counter_id: counterId, vehicle_model, name, accessory_code, quantity, price, cgst_percent, sgst_percent, created_at: uploadTimestamp }); 
        }
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

  const updateTeamLead = async (id: string, updates: any) => {
    try {
      const oldData = teamLeads.find(t => t.id === id);
      if (oldData && oldData.username && oldData.password) {
        await syncAuthCredentials(oldData.username, oldData.password, updates.username, updates.password, 'team_lead');
      }
      const { error } = await supabase.from('profiles').update(updates).eq('id', id);
      if (error) throw error;
      toast.success('Team Lead updated');
      fetchTeamLeads();
    } catch (err) {
      toast.error('Failed to update team lead');
      console.error(err);
    }
  };

  const deleteTeamLead = async (id: string) => {
    try {
      await supabase.from('login_logs').delete().eq('user_id', id);
      const { error } = await supabase.from('profiles').delete().eq('id', id);
      if (error) throw error;
      toast.success('Team Lead deleted');
      fetchTeamLeads();
    } catch (err) {
      toast.error('Failed to delete team lead');
      console.error(err);
    }
  };

  const updateCashier = async (id: string, updates: any) => {
    try {
      const oldData = cashiers.find(c => c.id === id);
      if (oldData && oldData.username && oldData.password) {
        await syncAuthCredentials(oldData.username, oldData.password, updates.username, updates.password, 'cashier');
      }
      const { error } = await supabase.from('profiles').update(updates).eq('id', id);
      if (error) throw error;
      toast.success('Cashier updated');
      fetchCashiers();
    } catch (err) {
      toast.error('Failed to update cashier');
      console.error(err);
    }
  };

  const deleteCashier = async (id: string) => {
    try {
      await supabase.from('login_logs').delete().eq('user_id', id);
      const { error } = await supabase.from('profiles').delete().eq('id', id);
      if (error) throw error;
      toast.success('Cashier deleted');
      fetchCashiers();
    } catch (err) {
      toast.error('Failed to delete cashier');
      console.error(err);
    }
  };


  const updateWarehouse = async (id: string, updates: any) => {
    try {
      const oldData = warehouses.find(w => w.id === id);
      if (oldData && oldData.username && oldData.password) {
        await syncAuthCredentials(oldData.username, oldData.password, updates.username, updates.password, 'counter');
      }
      const { error } = await supabase.from('profiles').update(updates).eq('id', id);
      if (error) throw error;
      toast.success('Warehouse updated successfully');
      fetchWarehouses();
    } catch (error: any) {
      toast.error(error.message || 'Error updating warehouse');
    }
  };

  const deleteWarehouse = async (id: string) => {
    if (!confirm('Are you sure you want to delete this warehouse?')) return;
    try {
      const { error } = await supabase.from('profiles').delete().eq('id', id);
      if (error) throw error;
      toast.success('Warehouse deleted successfully');
      fetchWarehouses();
    } catch (error: any) {
      toast.error('Error deleting warehouse');
      console.error(error);
    }
  };

  const updateBillStatusAdmin = async (billId: string, status: 'approved' | 'reverted' | 'reverted_by_admin', counterId: string) => {
    try {
      const billToUpdate = allBills.find(b => b.id === billId);
      if (!billToUpdate) throw new Error('Bill not found');
      
      const itemIds = billToUpdate.items ? billToUpdate.items.map((i: any) => i.id) : [billId];

      const { error: billError } = await supabase
        .from('bills')
        .update({ approval_status: status })
        .in('id', itemIds)
        .select();

      if (billError) throw billError;

      if (status === 'reverted' || status === 'reverted_by_admin') {
        for (const item of (billToUpdate.items || [billToUpdate])) {
          if (!item.accessories || !item.accessories.name) continue;
          
          let query = supabase.from('accessories').select('id, quantity');
          if (item.accessory_id) {
             query = query.eq('id', item.accessory_id);
          } else {
             query = query.eq('counter_id', counterId)
                          .eq('vehicle_model', item.accessories.vehicle_model)
                          .eq('name', item.accessories.name);
          }
          
          const { data: accData } = await query.maybeSingle();

          if (accData) {
            await supabase
              .from('accessories')
              .update({ quantity: accData.quantity + (item.quantity || 1) })
              .eq('id', accData.id);
          }
        }
        toast.success(`Bill ${billToUpdate.bill_number} reverted and inventory restored.`);
      } else {
        toast.success(`Bill ${billToUpdate.bill_number} approved successfully.`);
      }

      await fetchBills();
      await fetchInventory();
    } catch (error: any) {
      toast.error(error.message || 'Error updating bill status');
    }
  };

  useEffect(() => {
    fetchStats();
    fetchCounters();
    fetchWarehouses();
    fetchTeamLeads();
    fetchCashiers();
    fetchBills();
  }, [fetchStats, fetchCounters, fetchWarehouses, fetchTeamLeads, fetchCashiers, fetchBills]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  return {
    stats, counters, warehouses, inventory, loginDetails, vehicleModels, modelAccessories, salesReport, inventoryReport, amountCollectedReport, uploading, cashierReports, teamLeadReports, allBills,
    startDate, endDate, setStartDate, setEndDate,
    fetchLoginDetails, fetchCounters, fetchWarehouses, fetchVehicleModels, fetchModelAccessories, fetchCounterBills, handleFileUpload, fetchBills,
    updateCounter, deleteCounter, updateWarehouse, deleteWarehouse,
    deleteAccessory, updateAccessory, transferAccessory, transferAllAccessories, fetchInventory,
    transferCart, addToTransferCart, removeFromTransferCart, clearTransferCart, executeCartTransfer,
    deleteDataByDate,
    teamLeads, fetchTeamLeads, updateTeamLead, deleteTeamLead,
    cashiers, fetchCashiers, updateCashier, deleteCashier,
    updateBillStatusAdmin
  };
}
