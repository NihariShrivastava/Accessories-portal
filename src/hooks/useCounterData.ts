import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import type { User } from '@supabase/supabase-js';

export type Accessory = {
  id: string;
  name: string;
  quantity: number;
  price: number;
  vehicle_model: string;
};

export type Bill = {
  id: string;
  chassis_number: string;
  engine_number: string;
  checklist_number: string;
  quantity: number;
  total_amount: number;
  payment_method: string;
  amount_paid: number;
  amount_left: number;
  created_at: string;
  accessories: { name: string; vehicle_model: string };
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

  useEffect(() => {
    if (user) {
      fetchModels();
      fetchRecentBills();
    }
  }, [user]);

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

  const fetchModels = async () => {
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
  };

  const fetchRecentBills = async () => {
    try {
      const { data, error } = await supabase
        .from('bills')
        .select('*, accessories (name, vehicle_model)')
        .eq('counter_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      setRecentBills(data as any);
    } catch (error) {
      console.error('Error fetching bills:', error);
    }
  };

  const fetchAllBills = async () => {
    try {
      const { data, error } = await supabase
        .from('bills')
        .select('*, accessories (name, vehicle_model)')
        .eq('counter_id', user?.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setAllBills(data as any);
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

  return {
    models,
    selectedModel,
    accessories,
    recentBills,
    allBills: filteredBills,
    rawBills: allBills,
    loading,
    startDate,
    endDate,
    setStartDate,
    setEndDate,
    handleModelChange,
    fetchAllBills,
    fetchAccessories,
    fetchRecentBills
  };
}
