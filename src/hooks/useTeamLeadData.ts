// src/hooks/useTeamLeadData.ts
import { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../lib/api';
import { toast } from 'sonner';
import type { InventoryItem, SalesReport, CounterBill, Counter, AmountCollectedReport } from './useAdminData';

export function useTeamLeadData(user: any) {
  const [profile, setProfile] = useState<any>(null);
  const [assignedCounters, setAssignedCounters] = useState<Counter[]>([]);
  const [assignedWarehouses, setAssignedWarehouses] = useState<Counter[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [bills, setBills] = useState<CounterBill[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProfileAndData = useCallback(async (showLoading = true) => {
    if (!user) {
      setLoading(false);
      return;
    }
    if (showLoading) setLoading(true);
    
    try {
      const prof = await api.fetch('/api/protected/profiles/me');
      setProfile(prof);
      
      const counterIds: string[] = prof?.assigned_counters || [];
      const warehouseIds: string[] = prof?.assigned_warehouses || [];
      
      if (counterIds.length === 0) {
        setAssignedCounters([]);
        setInventory([]);
        setBills([]);
        setLoading(false);
        return;
      }

      // Fetch specific counter and warehouse profile names
      const countersData = await api.fetch('/api/protected/profiles/list', {
        method: 'POST',
        body: JSON.stringify({ ids: counterIds })
      });
      setAssignedCounters(countersData);

      let warehousesData = [];
      if (warehouseIds.length > 0) {
        warehousesData = await api.fetch('/api/protected/profiles/list', {
          method: 'POST',
          body: JSON.stringify({ ids: warehouseIds })
        });
      }
      setAssignedWarehouses(warehousesData);

      // Fetch accessories and bills for counter IDs
      const [invData, billsData] = await Promise.all([
        Promise.all(counterIds.map(id => api.fetch(`/api/protected/accessories?counter_id=${id}`))).then(res => res.flat()),
        api.fetch('/api/protected/bills/list', {
          method: 'POST',
          body: JSON.stringify({ counter_ids: counterIds, limit: 1000 })
        })
      ]);

      const enrichedInv = invData.map((item: any) => {
        const c = countersData.find((ctr: any) => ctr.id === item.counter_id);
        return { ...item, counter_name: c?.name || 'Unknown' };
      });
      setInventory(enrichedInv);

      // Group bills
      const groupedBills = new Map<string, any>();
      const standaloneBills: any[] = [];

      (billsData || []).forEach((item: any) => {
        const bNo = item.bill_number ? (item.bill_number.split('-').length > 2 ? item.bill_number.substring(0, item.bill_number.lastIndexOf('-')) : item.bill_number) : `TEMP-${item.id}`;
        const acc = item.accessories as any;
        const counterObj = countersData.find((c: any) => c.id === item.counter_id);
        
        if (!item.bill_number) {
          standaloneBills.push({
            ...item, bill_number: bNo, accessory_name: acc?.name || 'Unknown',
            vehicle_model: acc?.vehicle_model || 'Unknown',
            profiles: { name: counterObj?.name || 'Unknown Counter' }, items: [item]
          });
          return;
        }

        if (!groupedBills.has(bNo)) {
          groupedBills.set(bNo, { 
            ...item, bill_number: bNo, accessory_name: 'Multiple Items',
            vehicle_model: 'Multiple Models', profiles: { name: counterObj?.name || 'Unknown Counter' },
            items: [item], customer_name: item.customer_name, customer_phone: item.customer_phone,
            customer_id: item.customer_id, customer_address: item.customer_address,
            base_amount: item.base_amount || 0, cgst_amount: item.cgst_amount || 0, sgst_amount: item.sgst_amount || 0
          });
        } else {
          const group = groupedBills.get(bNo);
          group.items.push(item);
          group.total_amount += item.total_amount || 0;
          group.amount_paid += item.amount_paid || 0;
          group.amount_left += item.amount_left || 0;
          group.quantity += item.quantity || 0;
          group.base_amount = (group.base_amount || 0) + (item.base_amount || 0);
          group.cgst_amount = (group.cgst_amount || 0) + (item.cgst_amount || 0);
          group.sgst_amount = (group.sgst_amount || 0) + (item.sgst_amount || 0);
          group.approval_status = group.approval_status || item.approval_status;
        }
      });

      const finalBills = [...Array.from(groupedBills.values()), ...standaloneBills].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setBills(finalBills);
    } catch (err) { console.error('Error fetching team lead data:', err); } finally { setLoading(false); }
  }, [user]);

  useEffect(() => {
    fetchProfileAndData(true);
  }, [fetchProfileAndData]);

  const salesReport = useMemo(() => {
    const reportMap = new Map<string, SalesReport>();
    assignedCounters.forEach(c => {
      reportMap.set(c.id, { counter_id: c.id, counter_name: c.name, total_bills: 0, total_items: 0, total_sales: 0, total_collected: 0, outstanding: 0 });
    });

    bills.forEach(b => {
      if (b.approval_status === 'reverted') return;
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

  const inventoryReport = useMemo(() => {
    const reportMap = new Map<string, any>();
    assignedCounters.forEach(c => {
      reportMap.set(c.id, { counter_id: c.id, counter_name: c.name, surplus_count: 0, shortage_count: 0 });
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

  const amountCollectedReport = useMemo(() => {
    const map = new Map<string, AmountCollectedReport>();
    const countersMap = new Map(assignedCounters.map(c => [c.id, c.name]));

    bills.forEach((bill: any) => {
      if (bill.approval_status === 'reverted') return;
      const cId = bill.counter_id;
      if (!cId || !countersMap.has(cId)) return;
      
      const existing: AmountCollectedReport = map.get(cId) || {
        counter_id: cId, counter_name: countersMap.get(cId) || 'Unknown',
        cash_collected: 0, upi_collected: 0, card_collected: 0, bank_transfer_collected: 0, bills_data: []
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
      existing.bills_data.push({ bill_number: bill.bill_number, cash_amount: cash, payment_details: bill.payment_details || [{ method: bill.payment_method, amount: bill.amount_paid }] });
      map.set(cId, existing);
    });
    return Array.from(map.values());
  }, [bills, assignedCounters]);

  const updateBillStatus = async (billId: string, status: 'approved' | 'reverted', counterId: string) => {
    try {
      const billToUpdate = bills.find(b => b.id === billId);
      if (!billToUpdate) throw new Error('Bill not found');
      
      const itemIds = billToUpdate.items ? billToUpdate.items.map((i: any) => i.id) : [billId];
      const itemsToRestore = (billToUpdate.items || [billToUpdate]).map((item: any) => ({
        accessory_id: item.accessory_id,
        quantity: item.quantity || 1,
        vehicle_model: item.accessories?.vehicle_model || item.vehicle_model,
        name: item.accessories?.name || item.accessory_name
      }));

      await api.fetch('/api/protected/bills/status', {
        method: 'PUT',
        body: JSON.stringify({ itemIds, status, counterId, itemsToRestore })
      });

      toast.success(`Bill ${billToUpdate.bill_number} updated successfully.`);
      fetchProfileAndData(false);
    } catch (error: any) { toast.error(error.message || 'Error updating bill status'); }
  };

  const executeTransfer = async (_sourceWarehouseId: string, targetCounterId: string, items: { id: string, name: string, quantity: number }[]) => {
    try {
      if (items.length === 0) throw new Error("No items to transfer");

      await api.fetch('/api/protected/admin/accessories/transfer-bulk', {
        method: 'POST',
        body: JSON.stringify({ items: items.map(i => ({ id: i.id, quantity: i.quantity })), targetCounterId })
      });

      toast.success("Transfer completed successfully!");
      fetchProfileAndData(false);
      return true;
    } catch (error: any) { toast.error(error.message || "Failed to complete transfer"); return false; }
  };

  return { profile, assignedCounters, assignedWarehouses, inventory, bills, salesReport, inventoryReport, amountCollectedReport, loading, updateBillStatus, executeTransfer, fetchProfileAndData };
}