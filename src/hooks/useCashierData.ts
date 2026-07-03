// src/hooks/useCashierData.ts
import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
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
      const data = await api.fetch('/api/protected/profiles/list', {
        method: 'POST',
        body: JSON.stringify({ ids: profile.assigned_counters })
      });
      setAssignedCounters(data || []);
    } catch (error) { console.error('Error fetching assigned counters:', error); }
  }, [profile]);

  const fetchTransactions = useCallback(async () => {
    if (!profile?.assigned_counters?.length) return;
    try {
      setLoading(true);
      const data = await api.fetch('/api/protected/drawer_transactions/list', {
        method: 'POST',
        body: JSON.stringify({ counter_ids: [...profile.assigned_counters, profile.id] })
      });
      setTransactions(data || []);
    } catch (error) { console.error('Error fetching transactions:', error); } finally { setLoading(false); }
  }, [profile]);

  const fetchBills = useCallback(async () => {
    if (!profile?.assigned_counters?.length) return;
    try {
      const data = await api.fetch('/api/protected/bills/list', {
        method: 'POST',
        body: JSON.stringify({ counter_ids: profile.assigned_counters })
      });
      setBills(data || []);
    } catch (error) { console.error('Error fetching bills:', error); }
  }, [profile]);

  useEffect(() => {
    fetchAssignedCounters();
    fetchTransactions();
    fetchBills();
  }, [fetchAssignedCounters, fetchTransactions, fetchBills]);

  const updateTransactionStatus = async (id: string, status: 'approved' | 'reverted') => {
    try {
      await api.fetch(`/api/protected/drawer_transactions/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status })
      });
      toast.success(`Transaction ${status} successfully`);
      fetchTransactions();
    } catch (error: any) { toast.error(error.message || `Error updating transaction`); }
  };

  const createDrawerAction = async (actionData: Partial<DrawerTransaction>) => {
    try {
      await api.fetch('/api/protected/drawer_transactions', {
        method: 'POST',
        body: JSON.stringify({ ...actionData, status: 'approved' })
      });
      toast.success('Drawer action posted successfully');
      fetchTransactions();
      return true;
    } catch (error: any) { toast.error(error.message || 'Error posting drawer action'); return false; }
  };

  return { assignedCounters, transactions, bills, loading, updateTransactionStatus, createDrawerAction, fetchTransactions, fetchBills };
}