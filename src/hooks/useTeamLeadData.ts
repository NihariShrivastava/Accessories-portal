import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import type { InventoryItem, SalesReport, CounterBill, Counter, AmountCollectedReport, AccessoryMovementReport } from './useAdminData';

export function useTeamLeadData(user: any) {
  const [profile, setProfile] = useState<any>(null);
  const [assignedCounters, setAssignedCounters] = useState<Counter[]>([]);
  const [assignedWarehouses, setAssignedWarehouses] = useState<Counter[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [bills, setBills] = useState<CounterBill[]>([]);
  const [cashierReports, setCashierReports] = useState<any[]>([]);
  const [drawerTransactions, setDrawerTransactions] = useState<any[]>([]);
  const [billingCounterReports, setBillingCounterReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProfileAndData = useCallback(async (showLoading = true) => {
    if (!user) {
      setLoading(false);
      return;
    }
    if (showLoading) setLoading(true);
    
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
      
      const [countersRes, warehousesRes, invRes, billsRes, cashiersRes, drawerRes, bcRes] = await Promise.all([
        supabase.from('profiles').select('id, name').in('id', counterIds),
        prof?.assigned_warehouses && prof.assigned_warehouses.length > 0 
          ? supabase.from('profiles').select('id, name').in('id', prof.assigned_warehouses)
          : Promise.resolve({ data: [], error: null }),
        supabase.from('accessories').select('*').in('counter_id', counterIds),
        supabase
          .from('bills')
          .select(`
            *,
            accessories:accessory_id (name, accessory_code, vehicle_model)
          `)
          .in('counter_id', counterIds)
          .gte('created_at', thirtyDaysAgo.toISOString())
          .order('created_at', { ascending: false })
          .limit(1000), // Added limit to prevent massive payload issues
        supabase.from('profiles').select('*').eq('role', 'cashier'),
        supabase.from('drawer_transactions').select('*').in('counter_id', counterIds),
        supabase.from('profiles').select('*').eq('role', 'billing_counter')
      ]);

      const countersData = countersRes.data || [];
      const warehousesData = warehousesRes?.data || [];
      const invData = invRes.data || [];
      const billsData = billsRes.data || [];
      const cashiersData = cashiersRes.data || [];
      const drawerData = drawerRes.data || [];
      const billingCountersData = bcRes.data || [];

      if (invRes.error) console.error("Team Lead Inventory Fetch Error:", invRes.error);
      if (billsRes.error) console.error("Team Lead Bills Fetch Error:", billsRes.error);

      setAssignedCounters(countersData);
      setAssignedWarehouses(warehousesData);
      setDrawerTransactions(drawerData);

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
        const bNo = item.bill_number 
          ? (/^\d+-\d+$/.test(item.bill_number) ? item.bill_number.split('-')[0] : (item.bill_number.split('-').length > 2 ? item.bill_number.substring(0, item.bill_number.lastIndexOf('-')) : item.bill_number)) 
          : `TEMP-${item.id}`;
        const groupKey = `${item.counter_id || 'unknown'}_${bNo}_${(item.created_at || '').substring(0, 16)}`;
        const acc = item.accessories as any;
        const counterObj = countersData.find(c => c.id === item.counter_id);
        
        if (!item.bill_number) {
          standaloneBills.push({
            ...item,
            bill_number: bNo,
            accessory_name: acc?.name || 'Unknown',
            vehicle_model: acc?.vehicle_model || 'Unknown',
            profiles: { name: counterObj?.name || 'Unknown Counter' },
            items: [item]
          });
          return;
        }

        if (!groupedBills.has(groupKey)) {
          groupedBills.set(groupKey, { 
            ...item, 
            bill_number: bNo,
            accessory_name: acc?.name || 'Unknown',
            vehicle_model: acc?.vehicle_model || 'Unknown',
            profiles: { name: counterObj?.name || 'Unknown Counter' },
            items: [item],
            customer_name: item.customer_name,
            customer_phone: item.customer_phone,
            customer_id: item.customer_id,
            customer_address: item.customer_address,
            base_amount: item.base_amount || 0,
            cgst_amount: item.cgst_amount || 0,
            sgst_amount: item.sgst_amount || 0
          });
        } else {
          const group = groupedBills.get(groupKey);
          group.items.push(item);
          group.accessory_name = 'Multiple Items';
          group.vehicle_model = 'Multiple Models';
          group.total_amount += item.total_amount || 0;
          group.amount_paid += item.amount_paid || 0;
          group.amount_left += item.amount_left || 0;
          group.quantity += item.quantity || 0;
          group.base_amount = (group.base_amount || 0) + (item.base_amount || 0);
          group.cgst_amount = (group.cgst_amount || 0) + (item.cgst_amount || 0);
          group.sgst_amount = (group.sgst_amount || 0) + (item.sgst_amount || 0);
          // Status from the first item
          group.approval_status = group.approval_status || item.approval_status;
        }
      });

      const finalBills = [...Array.from(groupedBills.values()), ...standaloneBills].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setBills(finalBills);

      // 5. Calculate Cashier Reports for assigned counters
      const relevantCashiers = cashiersData.filter((c: any) => (c.assigned_counters || []).some((id: string) => counterIds.includes(id)));
      const cashierRpts: any[] = [];
      
      relevantCashiers.forEach((p: any) => {
        let cashCollected = 0;
        let pendingHandover = 0;
        let approvedHandover = 0;
        let expenses = 0;
        let bankTransfers = 0;
        let refunds = 0;

        drawerData.forEach((t: any) => {
          if (counterIds.includes(t.counter_id) && (p.assigned_counters || []).includes(t.counter_id)) {
            if (t.transaction_type === 'cashier_transfer') {
              if (t.status === 'pending') pendingHandover += Number(t.amount);
              else if (t.status === 'approved') {
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

        cashierRpts.push({
          cashier_id: p.id,
          cashier_name: p.name || p.username || 'Unknown',
          total_cash_collected: cashCollected,
          pending_handover: pendingHandover,
          approved_handover: approvedHandover,
          drawer_balance: cashCollected - expenses - bankTransfers - refunds
        });
      });
      setCashierReports(cashierRpts);

      // 6. Calculate Billing Counter Reports
      const bcRpts: any[] = [];
      const relevantBc = billingCountersData.filter((bc: any) => 
        (bc.assigned_counters || []).some((id: string) => counterIds.includes(id)) || 
        (bc.assigned_team_leads || []).includes(user.id)
      );

      relevantBc.forEach((bc: any) => {
        const directCounterIds = bc.assigned_counters || [];
        const tlIds = bc.assigned_team_leads || [];
        const tlCounterIds = tlIds.includes(user.id) ? counterIds : [];
        
        const allAssignedIds = Array.from(new Set([...directCounterIds, ...tlCounterIds])).filter(id => counterIds.includes(id));
        const assignedNames = countersData.filter((c: any) => allAssignedIds.includes(c.id)).map((c: any) => c.name);
        
        const bcBills = finalBills.filter(b => allAssignedIds.includes(b.counter_id));
        
        const pendingCount = bcBills.filter(b => b.approval_status === 'approved').length;
        const closedCount = bcBills.filter(b => b.approval_status === 'closed').length;
        
        bcRpts.push({
          billing_counter_id: bc.id,
          billing_counter_name: bc.name || bc.username || 'Unknown',
          assigned_counters_count: allAssignedIds.length,
          assigned_counters_names: assignedNames,
          pending_bills: pendingCount,
          closed_bills: closedCount
        });
      });
      setBillingCounterReports(bcRpts);

    } catch (err) {
      console.error('Error fetching team lead data:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProfileAndData(true);
  }, [fetchProfileAndData]);

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
        outstanding: 0,
        drawer_balance: 0
      });
    });

    bills.forEach(b => {
      // Ignore reverted bills in sales report
      if (b.approval_status === 'reverted' || b.approval_status === 'reverted_by_admin') return;

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

    drawerTransactions.forEach(t => {
      const existing = reportMap.get(t.counter_id);
      if (existing) {
        if (t.transaction_type === 'cashier_transfer' && t.status === 'approved') {
          existing.drawer_balance = (existing.drawer_balance || 0) + Number(t.amount);
        } else if (t.status === 'approved') {
          if (t.transaction_type === 'daily_expense') {
            if (t.details === 'Admin Adjustment') {
              existing.drawer_balance = (existing.drawer_balance || 0) + -(Number(t.amount));
            } else {
              existing.drawer_balance = (existing.drawer_balance || 0) - Number(t.amount);
            }
          } else if (t.transaction_type === 'bank_transfer' || t.transaction_type === 'refund') {
            existing.drawer_balance = (existing.drawer_balance || 0) - Number(t.amount);
          }
        }
      }
    });

    return Array.from(reportMap.values());
  }, [bills, assignedCounters, drawerTransactions]);

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

  const amountCollectedReport = useMemo(() => {
    const map = new Map<string, AmountCollectedReport>();
    const countersMap = new Map(assignedCounters.map(c => [c.id, c.name]));

    bills.forEach((bill: any) => {
      if (bill.approval_status === 'reverted') return;
      const cId = bill.counter_id;
      if (!cId || !countersMap.has(cId)) return;
      
      const existing: AmountCollectedReport = map.get(cId) || {
        counter_id: cId,
        counter_name: countersMap.get(cId) || 'Unknown',
        cash_collected: 0,
        upi_collected: 0,
        card_collected: 0,
        bank_transfer_collected: 0,
        total_collected: 0,
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
      existing.total_collected += (cash + upi + card + bank);
      
      existing.bills_data.push({
        bill_number: bill.bill_number,
        cash_amount: cash,
        payment_details: bill.payment_details || [{ method: bill.payment_method, amount: bill.amount_paid }]
      });
      
      map.set(cId, existing);
    });
    return Array.from(map.values());
  }, [bills, assignedCounters]);

  const accessoryMovementReport = useMemo(() => {
    const map = new Map<string, AccessoryMovementReport>();
    
    inventory.forEach((item: any) => {
      let existing = map.get(item.counter_id);
      if (!existing) {
        existing = {
          counter_id: item.counter_id,
          counter_name: item.counter_name,
          total_in_count: 0,
          total_out_count: 0,
          accessories: []
        };
        map.set(item.counter_id, existing);
      }
      
      const acc = existing.accessories.find(a => a.accessory_name === item.name && a.vehicle_model === item.vehicle_model);
      if (acc) {
        acc.current_quantity += item.quantity;
      } else {
        existing.accessories.push({
          accessory_name: item.name,
          vehicle_model: item.vehicle_model,
          in_count: 0,
          out_count: 0,
          current_quantity: item.quantity
        });
      }
    });

    bills.forEach((bill: any) => {
      if (bill.approval_status === 'reverted' || bill.approval_status === 'reverted_by_admin') return;

      let existing = map.get(bill.counter_id);
      if (!existing) {
        const cObj = assignedCounters.find(c => c.id === bill.counter_id);
        existing = {
          counter_id: bill.counter_id,
          counter_name: cObj?.name || bill.profiles?.name || 'Unknown',
          total_in_count: 0,
          total_out_count: 0,
          accessories: []
        };
        map.set(bill.counter_id, existing);
      }

      if (bill.items && Array.isArray(bill.items)) {
        bill.items.forEach((bi: any) => {
          const qty = Number(bi.quantity) || 0;
          const name = bi.accessories?.name || bi.accessory_name || 'Unknown';
          const model = bi.accessories?.vehicle_model || bi.vehicle_model || '-';

          let acc = existing!.accessories.find(a => a.accessory_name === name && a.vehicle_model === model);
          if (acc) {
            acc.out_count += qty;
          } else {
            existing!.accessories.push({
              accessory_name: name,
              vehicle_model: model,
              in_count: 0,
              out_count: qty,
              current_quantity: 0
            });
          }
        });
      }
    });

    Array.from(map.values()).forEach(report => {
      report.total_in_count = 0;
      report.total_out_count = 0;
      report.accessories.forEach(acc => {
        acc.in_count = acc.current_quantity + acc.out_count;
        report.total_in_count += acc.in_count;
        report.total_out_count += acc.out_count;
      });
    });

    return Array.from(map.values());
  }, [inventory, bills, assignedCounters]);

  const updateBillStatus = async (billId: string, status: 'approved' | 'reverted', counterId: string, excessAdjustment: number = 0, discountApproved: number = 0, approvalNote: string = '') => {
    try {
      const billToUpdate = bills.find(b => b.id === billId);
      if (!billToUpdate) throw new Error('Bill not found');
      
      const itemIds = billToUpdate.items ? billToUpdate.items.map((i: any) => i.id) : [billId];

      const updatePayload: any = { approval_status: status };
      if (status === 'approved') {
        updatePayload.excess_adjustment = excessAdjustment;
        updatePayload.discount_approved = discountApproved;
        updatePayload.approval_note = approvalNote;
        if (billToUpdate.audit_status === 'reverted_to_team_lead') {
          updatePayload.audit_status = 'pending';
        }
      } else if (status === 'reverted') {
        updatePayload.audit_status = null;
      }

      const { error: billError } = await supabase
        .from('bills')
        .update(updatePayload)
        .in('id', itemIds)
        .select();

      if (billError) throw billError;

      if (status === 'reverted') {
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

      await fetchProfileAndData(false);
    } catch (error: any) {
      toast.error(error.message || 'Error updating bill status');
    }
  };

  const executeTransfer = async (_sourceWarehouseId: string, targetCounterId: string, items: { id: string, name: string, quantity: number }[]) => {
    try {
      if (items.length === 0) throw new Error("No items to transfer");

      for (const item of items) {
        // 1. Decrement warehouse stock
        const { data: sourceData, error: sErr } = await supabase.from('accessories').select('quantity, vehicle_model, name, accessory_code, price, cgst_percent, sgst_percent').eq('id', item.id).single();
        if (sErr || !sourceData) throw new Error(`Could not find accessory ${item.name}`);
        if (sourceData.quantity < item.quantity) throw new Error(`Insufficient stock for ${item.name}`);

        const { error: updateSourceErr } = await supabase.from('accessories').update({ quantity: sourceData.quantity - item.quantity }).eq('id', item.id);
        if (updateSourceErr) throw new Error(`Failed to decrement source stock: ${updateSourceErr.message}`);

        // 2. Increment/Create target counter stock
        const { data: targetData, error: targetFindErr } = await supabase.from('accessories')
          .select('id, quantity')
          .eq('counter_id', targetCounterId)
          .eq('vehicle_model', sourceData.vehicle_model)
          .eq('name', sourceData.name)
          .limit(1)
          .maybeSingle();
          
        if (targetFindErr) throw new Error(`Failed to check target stock: ${targetFindErr.message}`);

        if (targetData) {
          const { error: updateTargetErr } = await supabase.from('accessories').update({ quantity: targetData.quantity + item.quantity }).eq('id', targetData.id);
          if (updateTargetErr) {
            // ROLLBACK
            await supabase.from('accessories').update({ quantity: sourceData.quantity }).eq('id', item.id);
            throw new Error(`Failed to update target stock (Rollback successful): ${updateTargetErr.message}`);
          }
        } else {
          const { error: insertTargetErr } = await supabase.from('accessories').insert([{
            counter_id: targetCounterId,
            vehicle_model: sourceData.vehicle_model,
            name: sourceData.name,
            accessory_code: sourceData.accessory_code,
            price: sourceData.price,
            cgst_percent: sourceData.cgst_percent,
            sgst_percent: sourceData.sgst_percent,
            quantity: item.quantity
          }]);
          if (insertTargetErr) {
            // ROLLBACK
            await supabase.from('accessories').update({ quantity: sourceData.quantity }).eq('id', item.id);
            throw new Error(`Failed to insert target stock (Rollback successful): ${insertTargetErr.message}`);
          }
        }
      }

      toast.success("Transfer completed successfully!");
      fetchProfileAndData(false);
      return true;
    } catch (error: any) {
      toast.error(error.message || "Failed to complete transfer");
      return false;
    }
  };

  return {
    profile,
    assignedCounters,
    assignedWarehouses,
    inventory,
    bills,
    salesReport,
    inventoryReport,
    amountCollectedReport,
    accessoryMovementReport,
    cashierReports,
    billingCounterReports,
    loading,
    updateBillStatus,
    executeTransfer,
    fetchProfileAndData
  };
}
