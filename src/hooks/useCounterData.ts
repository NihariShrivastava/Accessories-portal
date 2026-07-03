// src/hooks/useCounterData.ts
import { useState, useEffect, useMemo, useCallback } from 'react';
import { api } from '../lib/api';
import { toast } from 'sonner';

export type Accessory = { id: string; name: string; accessory_code?: string; quantity: number; price: number; vehicle_model: string; cgst_percent?: number; sgst_percent?: number; };
export type Bill = { id: string; bill_number?: string; chassis_number: string; engine_number: string; checklist_number: string; customer_name?: string; customer_phone?: string; customer_id?: string; quantity: number; base_amount?: number; cgst_amount?: number; sgst_amount?: number; total_amount: number; payment_method: string; payment_details?: any[]; amount_paid: number; amount_left: number; created_at: string; accessories: { name: string; accessory_code?: string; vehicle_model: string }; items?: Bill[]; approval_status?: string; };

export function useCounterData(user: any | null) {
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
      const data = await api.fetch(`/api/protected/accessories/stats?counter_id=${user.id}`);
      setShortageCount(data.shortageCount || 0);
      setSurplusCount(data.surplusCount || 0);
    } catch (e) { console.error(e); }
  }, [user]);

  const fetchModels = useCallback(async () => {
    if (!user) return;
    try {
      const data = await api.fetch(`/api/protected/accessories/models?counter_id=${user.id}`);
      setModels(data || []);
    } catch (error) { console.error('Error fetching models:', error); }
  }, [user]);

  const groupBills = useCallback((data: any[]): Bill[] => {
    const map = new Map<string, Bill>();
    data.forEach(item => {
      const bNo = item.bill_number ? (item.bill_number.split('-').length > 2 ? item.bill_number.substring(0, item.bill_number.lastIndexOf('-')) : item.bill_number) : `TEMP-${item.id}`;
      const existing = map.get(bNo);
      if (!existing) {
        map.set(bNo, { ...item, bill_number: bNo, items: [item as any], customer_name: item.customer_name, customer_phone: item.customer_phone, customer_id: item.customer_id, quantity: item.quantity || 0, base_amount: item.base_amount || 0, cgst_amount: item.cgst_amount || 0, sgst_amount: item.sgst_amount || 0, total_amount: item.total_amount || 0, amount_paid: item.amount_paid || 0, amount_left: item.amount_left || 0 });
      } else {
        if (!existing.items) existing.items = [];
        existing.items.push(item as any);
        existing.quantity += item.quantity || 0;
        existing.base_amount = (existing.base_amount || 0) + (item.base_amount || 0);
        existing.cgst_amount = (existing.cgst_amount || 0) + (item.cgst_amount || 0);
        existing.sgst_amount = (existing.sgst_amount || 0) + (item.sgst_amount || 0);
        existing.total_amount += item.total_amount || 0;
        existing.amount_paid += item.amount_paid || 0;
        existing.amount_left += item.amount_left || 0;
        existing.approval_status = existing.approval_status || item.approval_status;
      }
    });
    return Array.from(map.values());
  }, []);

  const fetchAllBills = useCallback(async () => {
    if(!user) return;
    try {
      const data = await api.fetch(`/api/protected/bills?counter_id=${user.id}`);
      const grouped = groupBills(data || []);
      setAllBills(grouped);
      setRecentBills(grouped.slice(0, 10));
    } catch (error) { console.error('Error fetching all bills:', error); }
  }, [user, groupBills]);

  const fetchDrawerTransactions = useCallback(async () => {
    if (!user) return;
    try {
      const data = await api.fetch(`/api/protected/drawer_transactions?counter_id=${user.id}`);
      setDrawerTransactions(data || []);
    } catch (error) { console.error('Error fetching drawer transactions:', error); }
  }, [user]);

  const createCashierTransfer = async (amount: number) => {
    if (!user) return false;
    try {
      await api.fetch('/api/protected/drawer_transactions', {
        method: 'POST',
        body: JSON.stringify({ counter_id: user.id, transaction_type: 'cashier_transfer', amount, status: 'pending' })
      });
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
      fetchModels();
      fetchAllBills();
      fetchDashboardStats();
      fetchDrawerTransactions();
    }
  }, [user, fetchModels, fetchAllBills, fetchDashboardStats, fetchDrawerTransactions]);

  const filteredBills = useMemo(() => {
    return allBills.filter(bill => {
      if (!startDate && !endDate) return true;
      const billDateStr = new Date(bill.created_at).toISOString().split('T')[0];
      if (startDate && billDateStr < startDate) return false;
      if (endDate && billDateStr > endDate) return false;
      return true;
    });
  }, [allBills, startDate, endDate]);

  const fetchAccessories = async (model: string) => {
    setLoading(true);
    try {
      const data = await api.fetch(`/api/protected/accessories?counter_id=${user?.id}&model=${encodeURIComponent(model)}`);
      setAccessories(data || []);
    } catch (error) { toast.error('Failed to load accessories'); } 
    finally { setLoading(false); }
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
      const data = await api.fetch(`/api/protected/accessories/search?counter_id=${user?.id}&q=${encodeURIComponent(query)}`);
      setSearchResults(data || []);
    } catch (error) { console.error(error); } 
    finally { setLoading(false); }
  };

  const fetchShortageModels = async () => {
    const data = await api.fetch(`/api/protected/accessories?counter_id=${user?.id}`);
    return Array.from(new Set(data.filter((d:any) => d.quantity <= 5).map((d:any) => d.vehicle_model))) as string[];
  };

  const fetchSurplusModels = async () => {
    const data = await api.fetch(`/api/protected/accessories?counter_id=${user?.id}`);
    return Array.from(new Set(data.filter((d:any) => d.quantity > 5).map((d:any) => d.vehicle_model))) as string[];
  };

  const fetchShortageAccessories = async (model: string) => {
    setLoading(true);
    const data = await api.fetch(`/api/protected/accessories?counter_id=${user?.id}&model=${encodeURIComponent(model)}`);
    const filtered = data.filter((d:any) => d.quantity <= 5);
    setAccessories(filtered);
    setLoading(false);
    return filtered;
  };

  const fetchSurplusAccessories = async (model: string) => {
    setLoading(true);
    const data = await api.fetch(`/api/protected/accessories?counter_id=${user?.id}&model=${encodeURIComponent(model)}`);
    const filtered = data.filter((d:any) => d.quantity > 5);
    setAccessories(filtered);
    setLoading(false);
    return filtered;
  };

  return { models, selectedModel, setSelectedModel, accessories, recentBills, allBills: filteredBills, rawBills: allBills, loading, startDate, endDate, setStartDate, setEndDate, shortageCount, surplusCount, searchResults, setSearchResults, handleModelChange, fetchAllBills, fetchAccessories, fetchRecentBills: fetchAllBills, fetchDashboardStats, searchAccessories, fetchShortageModels, fetchSurplusModels, fetchShortageAccessories, fetchSurplusAccessories, drawerTransactions, fetchDrawerTransactions, createCashierTransfer };
}