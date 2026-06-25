import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import type { InventoryItem, SalesReport, CounterBill, Counter } from './useAdminData';

export function useTeamLeadData(user: any) {
  const [profile, setProfile] = useState<any>(null);
  const [assignedCounters, setAssignedCounters] = useState<Counter[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [bills, setBills] = useState<CounterBill[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProfileAndData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    
    try {
      // 1. Fetch Team Lead Profile to get assigned counters
      const { data: prof, error: profErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
        
      if (profErr) throw profErr;
      setProfile(prof);
      
      const counterIds: string[] = prof?.assigned_counters || [];
      
      if (counterIds.length === 0) {
        setAssignedCounters([]);
        setInventory([]);
        setBills([]);
        setLoading(false);
        return;
      }

      // 2. Fetch specific counters, inventory, and bills in parallel
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const [countersRes, invRes, billsRes] = await Promise.all([
        supabase.from('profiles').select('id, name').in('id', counterIds),
        supabase.from('accessories').select('*').in('counter_id', counterIds),
        supabase.from('bills')
          .select(`
            id, bill_number, created_at, total_amount, payment_method, amount_paid, amount_left, quantity, counter_id,
            accessories:accessory_id (name, accessory_code, vehicle_model)
          `)
          .in('counter_id', counterIds)
          .gte('created_at', thirtyDaysAgo.toISOString())
          .order('created_at', { ascending: false })
      ]);

      const countersData = countersRes.data || [];
      const invData = invRes.data || [];
      const billsData = billsRes.data || [];

      if (invRes.error) console.error("Team Lead Inventory Fetch Error:", invRes.error);
      if (billsRes.error) console.error("Team Lead Bills Fetch Error:", billsRes.error);

      setAssignedCounters(countersData);

      // 3. Enrich inventory with counter names
      const enrichedInv = invData.map(item => {
        const c = countersData.find(c => c.id === item.counter_id);
        return { ...item, counter_name: c?.name || 'Unknown' };
      });
      setInventory(enrichedInv);

      // 4. Process Bills

      // Group bills by bill_number
      const groupedBills = new Map<string, any>();
      const standaloneBills: any[] = [];

      (billsData || []).forEach(item => {
        const bNo = item.bill_number ? item.bill_number.replace(/-\d+$/, '') : `TEMP-${item.id}`;
        const acc = item.accessories as any;
        if (!item.bill_number) {
          standaloneBills.push({
            ...item,
            bill_number: bNo,
            accessory_name: acc?.name || 'Unknown',
            vehicle_model: acc?.vehicle_model || 'Unknown',
            items: [item]
          });
          return;
        }

        if (!groupedBills.has(bNo)) {
          groupedBills.set(bNo, { 
            ...item, 
            bill_number: bNo,
            accessory_name: 'Multiple Items',
            vehicle_model: 'Multiple Models',
            items: [item]
          });
        } else {
          const group = groupedBills.get(bNo);
          group.items.push(item);
          group.total_amount += item.total_amount || 0;
          group.amount_paid += item.amount_paid || 0;
          group.amount_left += item.amount_left || 0;
          group.quantity += item.quantity || 0;
        }
      });

      const finalBills = [...Array.from(groupedBills.values()), ...standaloneBills].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setBills(finalBills);

    } catch (err) {
      console.error('Error fetching team lead data:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProfileAndData();
  }, [fetchProfileAndData]);

  // Aggregate Sales Report
  const salesReport = useMemo(() => {
    const reportMap = new Map<string, SalesReport>();
    
    assignedCounters.forEach(c => {
      reportMap.set(c.id, {
        counter_id: c.id,
        counter_name: c.name,
        total_bills: 0,
        total_items: 0,
        total_sales: 0,
        total_collected: 0,
        outstanding: 0
      });
    });

    bills.forEach(b => {
      const cId = b.counter_id;
      if (!cId || !reportMap.has(cId)) return;
      const r = reportMap.get(cId)!;
      r.total_bills += 1;
      r.total_sales += b.total_amount || 0;
      r.total_collected += b.amount_paid || 0;
      r.outstanding += b.amount_left || 0;
      
      const qty = b.items ? b.items.reduce((sum: number, i: any) => sum + (i.quantity || 1), 0) : b.quantity || 1;
      r.total_items += qty;
    });

    return Array.from(reportMap.values());
  }, [bills, assignedCounters]);

  // Aggregate Inventory Report
  const inventoryReport = useMemo(() => {
    const reportMap = new Map<string, any>();
    
    assignedCounters.forEach(c => {
      reportMap.set(c.id, {
        counter_id: c.id,
        counter_name: c.name,
        surplus_count: 0,
        shortage_count: 0
      });
    });

    inventory.forEach(i => {
      const cId = i.counter_id;
      if (!cId || !reportMap.has(cId)) return;
      const r = reportMap.get(cId)!;
      if (i.quantity > 5) r.surplus_count += 1;
      if (i.quantity <= 5) r.shortage_count += 1;
    });

    return Array.from(reportMap.values());
  }, [inventory, assignedCounters]);

  return {
    profile,
    assignedCounters,
    inventory,
    bills,
    salesReport,
    inventoryReport,
    loading,
    refreshData: fetchProfileAndData
  };
}
