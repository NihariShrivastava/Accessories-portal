import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../components/auth-provider';
import { toast } from 'sonner';
import type { Bill } from './useCounterData';

export type DrawerTransaction = {
  id: string;
  counter_id: string;
  counter_name?: string;
  transaction_type: 'cashier_transfer' | 'daily_expense' | 'bank_transfer' | 'refund';
  amount: number;
  status: 'pending' | 'approved' | 'reverted';
  category?: string;
  details?: string;
  bank_name?: string;
  account_number?: string;
  ifsc_code?: string;
  created_at: string;
};

export function useCashierData() {
  const { profile } = useAuth();
  const [assignedCounters, setAssignedCounters] = useState<{id: string, name: string}[]>([]);
  const [transactions, setTransactions] = useState<DrawerTransaction[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAssignedCounters = useCallback(async () => {
    if (!profile?.assigned_counters?.length) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', profile.assigned_counters);
      
      if (error) throw error;
      setAssignedCounters(data || []);
    } catch (error) {
      console.error('Error fetching assigned counters:', error);
    }
  }, [profile]);

  const fetchTransactions = useCallback(async () => {
    if (!profile?.assigned_counters?.length) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('drawer_transactions')
        .select(`*, profiles(name)`)
        .in('counter_id', [...(profile.assigned_counters || []), profile.id])
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setTransactions((data || []).map(t => ({
        ...t,
        counter_name: t.profiles?.name
      })));
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  }, [profile]);

  const fetchBills = useCallback(async () => {
    if (!profile?.assigned_counters?.length) return;
    try {
      const { data, error } = await supabase
        .from('bills')
        .select(`
          *,
          accessories (*),
          items:bill_items(
            quantity,
            price_at_time,
            accessories(*)
          )
        `)
        .in('counter_id', profile.assigned_counters);

      if (error) throw error;
      setBills(data || []);
    } catch (error) {
      console.error('Error fetching bills:', error);
    }
  }, [profile]);

  useEffect(() => {
    fetchAssignedCounters();
    fetchTransactions();
    fetchBills();
  }, [fetchAssignedCounters, fetchTransactions, fetchBills]);

  const updateTransactionStatus = async (id: string, status: 'approved' | 'reverted') => {
    try {
      const { error } = await supabase
        .from('drawer_transactions')
        .update({ status })
        .eq('id', id);
        
      if (error) throw error;
      toast.success(`Transaction ${status} successfully`);
      fetchTransactions();
    } catch (error: any) {
      toast.error(error.message || `Error updating transaction`);
    }
  };

  const createDrawerAction = async (actionData: Partial<DrawerTransaction>) => {
    try {
      const { error } = await supabase
        .from('drawer_transactions')
        .insert([{
          ...actionData,
          status: 'approved' // Direct actions by cashier are auto-approved
        }]);
        
      if (error) throw error;
      toast.success('Drawer action posted successfully');
      fetchTransactions();
      return true;
    } catch (error: any) {
      toast.error(error.message || 'Error posting drawer action');
      return false;
    }
  };

  return {
    assignedCounters,
    transactions,
    bills,
    loading,
    updateTransactionStatus,
    createDrawerAction,
    fetchTransactions,
    fetchBills
  };
}
