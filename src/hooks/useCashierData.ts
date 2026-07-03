// src/hooks/useCashierData.ts
import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
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
  const [cashierProfile, setCashierProfile] = useState<any>(null);
  const [assignedCounters, setAssignedCounters] = useState<{id: string, name: string}[]>([]);
  const [transactions, setTransactions] = useState<DrawerTransaction[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchProfileAndData = useCallback(async () => {
    try {
      setLoading(true);
      const prof = await api.fetch('/api/protected/profiles/me');
      setCashierProfile(prof);
      
      const counterIds: string[] = prof?.assigned_counters || [];
      if (counterIds.length === 0) {
        setAssignedCounters([]);
        setTransactions([]);
        setBills([]);
        return;
      }

      // Fetch counter profile names
      const countersData = await api.fetch('/api/protected/profiles/list', {
        method: 'POST',
        body: JSON.stringify({ ids: counterIds })
      });
      setAssignedCounters(countersData || []);

      // Fetch consolidated drawer transactions (counters + cashier self transactions)
      const transData = await api.fetch('/api/protected/drawer_transactions/list', {
        method: 'POST',
        body: JSON.stringify({ counter_ids: [...counterIds, prof.id] })
      });
      setTransactions(transData || []);

      // Fetch consolidated bills
      const billsData = await api.fetch('/api/protected/bills/list', {
        method: 'POST',
        body: JSON.stringify({ counter_ids: counterIds })
      });
      setBills(billsData || []);
    } catch (error) {
      console.error('Error fetching cashier data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfileAndData();
  }, [fetchProfileAndData]);

  const updateTransactionStatus = async (id: string, status: 'approved' | 'reverted') => {
    try {
      await api.fetch(`/api/protected/drawer_transactions/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status })
      });
      toast.success(`Transaction ${status} successfully`);
      fetchProfileAndData();
    } catch (error: any) { toast.error(error.message || `Error updating transaction`); }
  };

  const createDrawerAction = async (actionData: Partial<DrawerTransaction>) => {
    if (!cashierProfile) return false;
    try {
      await api.fetch('/api/protected/drawer_transactions', {
        method: 'POST',
        body: JSON.stringify({ ...actionData, status: 'approved' })
      });
      toast.success('Drawer action posted successfully');
      fetchProfileAndData();
      return true;
    } catch (error: any) { toast.error(error.message || 'Error posting drawer action'); return false; }
  };

  return { assignedCounters, transactions, bills, loading, updateTransactionStatus, createDrawerAction, fetchTransactions: fetchProfileAndData, fetchBills: fetchProfileAndData };
}