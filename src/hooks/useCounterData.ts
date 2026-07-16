import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import type { User } from '@supabase/supabase-js';

export type Accessory = {
  id: string;
  name: string;
  accessory_code?: string;
  quantity: number;
  price: number;
  vehicle_model: string;
  cgst_percent?: number;
  sgst_percent?: number;
};

export type Bill = {
  id: string;
  counter_id?: string;
  bill_number?: string;
  chassis_number: string;
  engine_number: string;
  checklist_number: string;
  customer_name?: string;
  customer_phone?: string;
  customer_id?: string;
  quantity: number;
  base_amount?: number;
  cgst_amount?: number;
  sgst_amount?: number;
  total_amount: number;
  payment_method: string;
  payment_details?: any[];
  amount_paid: number;
  amount_left: number;
  created_at: string;
  accessories: { name: string; accessory_code?: string; vehicle_model: string };
  items?: Bill[];
  approval_status?: string;
  excess_adjustment?: number;
  discount_approved?: number;
  approval_note?: string;
  excellon_receipt_number?: string;
};

type RawBill = {
  id: string;
  counter_id?: string;
  bill_number?: string;
  chassis_number: string;
  engine_number: string;
  checklist_number: string;
  customer_name?: string;
  customer_phone?: string;
  customer_id?: string;
  quantity: number;
  base_amount?: number;
  cgst_amount?: number;
  sgst_amount?: number;
  total_amount: number;
  payment_method: string;
  payment_details?: any[];
  amount_paid: number;
  amount_left: number;
  created_at: string;
  accessories: { name: string; accessory_code?: string; vehicle_model: string };
  approval_status?: string;
  excess_adjustment?: number;
  discount_approved?: number;
  approval_note?: string;
  excellon_receipt_number?: string;
};

export function useCounterData(user: User | null) {
  const [models, setModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [accessories, setAccessories] = useState<Accessory[]>([]);
  const [recentBills, setRecentBills] = useState<Bill[]>([]);
  const [allBills, setAllBills] = useState<Bill[]>([]);
  const [drawerTransactions, setDrawerTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const [shortageCount, setShortageCount] = useState(0);
  const [surplusCount, setSurplusCount] = useState(0);
  const [searchResults, setSearchResults] = useState<Accessory[]>([]);

  const fetchDashboardStats = useCallback(async () => {
    if (!user) return;
    try {
      const { count: sCount } = await supabase.from('accessories').select('*', { count: 'exact', head: true }).lte('quantity', 5).eq('counter_id', user.id);
      setShortageCount(sCount || 0);

      const { count: surCount } = await supabase.from('accessories').select('*', { count: 'exact', head: true }).gt('quantity', 5).eq('counter_id', user.id);
      setSurplusCount(surCount || 0);
    } catch (e) {
      console.error(e);
    }
  }, [user]);

  const fetchModels = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('accessories')
        .select('vehicle_model')
        .eq('counter_id', user?.id);
      if (error) throw error;
      setModels(Array.from(new Set((data || []).map(item => item.vehicle_model))));
    } catch (error) {
      console.error('Error fetching models:', error);
    }
  }, [user]);

  const groupBills = useCallback((data: RawBill[]): Bill[] => {
    const map = new Map<string, Bill>();
    data.forEach(item => {
      // Group by base bill number (strip suffix like -1, -2 if present, but preserve INV-XXXX)
      const bNo = item.bill_number 
        ? (/^\d+-\d+$/.test(item.bill_number) ? item.bill_number.split('-')[0] : (item.bill_number.split('-').length > 2 ? item.bill_number.substring(0, item.bill_number.lastIndexOf('-')) : item.bill_number)) 
        : `TEMP-${item.id}`;
      const groupKey = `${item.counter_id || 'unknown'}_${bNo}_${(item.created_at || '').substring(0, 16)}`;
      
      const existing = map.get(groupKey);
      if (!existing) {
        map.set(groupKey, { 
          ...item, 
          bill_number: bNo, // Show the base number in the list
          items: [item as any as Bill],
          customer_name: item.customer_name,
          customer_phone: item.customer_phone,
          customer_id: item.customer_id,
          quantity: item.quantity || 0,
          base_amount: item.base_amount || 0,
          cgst_amount: item.cgst_amount || 0,
          sgst_amount: item.sgst_amount || 0,
          total_amount: item.total_amount || 0,
          amount_left: item.amount_left || 0,
          excellon_receipt_number: item.excellon_receipt_number
        });
      } else {
        if (!existing.items) existing.items = [];
        existing.items.push(item as any as Bill);
        existing.quantity += item.quantity || 0;
        existing.base_amount = (existing.base_amount || 0) + (item.base_amount || 0);
        existing.cgst_amount = (existing.cgst_amount || 0) + (item.cgst_amount || 0);
        existing.sgst_amount = (existing.sgst_amount || 0) + (item.sgst_amount || 0);
        existing.total_amount += item.total_amount || 0;
        existing.amount_paid += item.amount_paid || 0;
        existing.amount_left += item.amount_left || 0;
        existing.approval_status = existing.approval_status || item.approval_status;
        existing.excess_adjustment = existing.excess_adjustment || item.excess_adjustment;
        existing.discount_approved = existing.discount_approved || item.discount_approved;
        existing.approval_note = existing.approval_note || item.approval_note;
        existing.excellon_receipt_number = existing.excellon_receipt_number || item.excellon_receipt_number;
      }
    });
    return Array.from(map.values());
  }, []);

  const fetchRecentBills = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('bills')
        .select('*, accessories (name, accessory_code, vehicle_model)')
        .eq('counter_id', user?.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;

      // Group by bill_number
      const grouped = groupBills((data as any as RawBill[]) || []);
      setRecentBills(grouped.slice(0, 10));
    } catch (error) {
      console.error('Error fetching bills:', error);
    }
  }, [user, groupBills]);
  


  const fetchDrawerTransactions = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('drawer_transactions')
        .select('*')
        .eq('counter_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setDrawerTransactions(data || []);
    } catch (error) {
      console.error('Error fetching drawer transactions:', error);
    }
  }, [user]);

  const createCashierTransfer = async (amount: number) => {
    if (!user) return false;
    try {
      const { error } = await supabase.from('drawer_transactions').insert([{
        counter_id: user.id,
        transaction_type: 'cashier_transfer',
        amount,
        status: 'pending'
      }]);
      if (error) throw error;
      toast.success('Transfer submitted to cashier successfully');
      fetchDrawerTransactions();
      return true;
    } catch (error: any) {
      toast.error(error.message || 'Error submitting transfer');
      return false;
    }
  };

  useEffect(() => {
    if (user) {
      fetchDrawerTransactions();
    }
  }, [user, fetchDrawerTransactions]);
  
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

  const fetchAllBills = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('bills')
        .select('*, accessories (name, accessory_code, vehicle_model)')
        .eq('counter_id', user?.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setAllBills(groupBills((data as any as RawBill[]) || []));
    } catch (error) {
      console.error('Error fetching all bills:', error);
    }
  }, [user, groupBills]);
  useEffect(() => {
    if (user) {
      fetchModels();
      fetchRecentBills();
      fetchAllBills();
      fetchDashboardStats();
      fetchDrawerTransactions();
    }
  }, [user, fetchModels, fetchRecentBills, fetchAllBills, fetchDashboardStats, fetchDrawerTransactions]);


  const fetchAccessories = async (model: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('accessories')
        .select('*')
        .eq('counter_id', user?.id)
        .eq('vehicle_model', model);
      if (error) throw error;
      setAccessories(data || []);
    } catch (error) {
      console.error('Error fetching accessories:', error);
      toast.error('Failed to load accessories');
    } finally {
      setLoading(false);
    }
  };

  const handleModelChange = (model: string) => {
    setSelectedModel(model);
    if (model) fetchAccessories(model);
    else setAccessories([]);
  };

  const searchAccessories = async (query: string) => {
    if (!query) { setSearchResults([]); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.from('accessories').select('*').eq('counter_id', user?.id)
        .or(`name.ilike.%${query}%,accessory_code.ilike.%${query}%,vehicle_model.ilike.%${query}%`).limit(20);
      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) { console.error(error); } 
    finally { setLoading(false); }
  };

  const fetchShortageModels = async () => {
    const { data } = await supabase.from('accessories').select('vehicle_model').lte('quantity', 5).eq('counter_id', user?.id);
    return Array.from(new Set((data || []).map(d => d.vehicle_model)));
  };

  const fetchSurplusModels = async () => {
    const { data } = await supabase.from('accessories').select('vehicle_model').gt('quantity', 5).eq('counter_id', user?.id);
    return Array.from(new Set((data || []).map(d => d.vehicle_model)));
  };

  const fetchShortageAccessories = async (model: string) => {
    setLoading(true);
    const { data } = await supabase.from('accessories').select('*').lte('quantity', 5).eq('counter_id', user?.id).eq('vehicle_model', model);
    setAccessories(data || []);
    setLoading(false);
    return data || [];
  };

  const fetchSurplusAccessories = async (model: string) => {
    setLoading(true);
    const { data } = await supabase.from('accessories').select('*').gt('quantity', 5).eq('counter_id', user?.id).eq('vehicle_model', model);
    setAccessories(data || []);
    setLoading(false);
    return data || [];
  };

  return {
    models,
    selectedModel,
    setSelectedModel,
    accessories,
    recentBills,
    allBills: filteredBills,
    rawBills: allBills,
    loading,
    startDate,
    endDate,
    setStartDate,
    setEndDate,
    shortageCount,
    surplusCount,
    searchResults,
    setSearchResults,
    handleModelChange,
    fetchAllBills,
    fetchAccessories,
    fetchRecentBills,
    fetchDashboardStats,
    searchAccessories,
    fetchShortageModels,
    fetchSurplusModels,
    fetchShortageAccessories,
    fetchSurplusAccessories,
    drawerTransactions,
    fetchDrawerTransactions,
    createCashierTransfer
  };
}
