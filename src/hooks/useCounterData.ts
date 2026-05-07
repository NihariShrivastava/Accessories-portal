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
};

export type Bill = {
  id: string;
  bill_number?: string;
  chassis_number: string;
  engine_number: string;
  checklist_number: string;
  quantity: number;
  total_amount: number;
  payment_method: string;
  amount_paid: number;
  amount_left: number;
  created_at: string;
  accessories: { name: string; accessory_code?: string; vehicle_model: string };
};

export function useCounterData(user: User | null) {
  const [models, setModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [accessories, setAccessories] = useState<Accessory[]>([]);
  const [recentBills, setRecentBills] = useState<Bill[]>([]);
  const [allBills, setAllBills] = useState<Bill[]>([]);
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
      setModels(Array.from(new Set(data.map(item => item.vehicle_model))));
    } catch (error) {
      console.error('Error fetching models:', error);
    }
  }, [user?.id]);

  const fetchRecentBills = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('bills')
        .select('*, accessories (name, accessory_code, vehicle_model)')
        .eq('counter_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      setRecentBills(data as unknown as Bill[]);
    } catch (error) {
      console.error('Error fetching bills:', error);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user) {
      fetchModels();
      fetchRecentBills();
      fetchDashboardStats();
    }
  }, [user, fetchModels, fetchRecentBills, fetchDashboardStats]);

  const filteredBills = useMemo(() => {
    return allBills.filter(bill => {
      if (!startDate && !endDate) return true;
      
      // Convert bill date to local date string for comparison
      const billDate = new Date(bill.created_at);
      const billDateStr = billDate.toISOString().split('T')[0];
      
      if (startDate && billDateStr < startDate) return false;
      if (endDate && billDateStr > endDate) return false;
      return true;
    });
  }, [allBills, startDate, endDate]);

  const fetchAllBills = async () => {
    try {
      const { data, error } = await supabase
        .from('bills')
        .select('*, accessories (name, accessory_code, vehicle_model)')
        .eq('counter_id', user?.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setAllBills(data as unknown as Bill[]);
    } catch (error) {
      console.error('Error fetching all bills:', error);
    }
  };



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
  };

  const fetchSurplusAccessories = async (model: string) => {
    setLoading(true);
    const { data } = await supabase.from('accessories').select('*').gt('quantity', 5).eq('counter_id', user?.id).eq('vehicle_model', model);
    setAccessories(data || []);
    setLoading(false);
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
    fetchSurplusAccessories
  };
}
