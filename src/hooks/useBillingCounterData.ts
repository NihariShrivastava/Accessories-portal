import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { useAuth } from '../components/auth-provider';
import type { CounterBill } from './useAdminData';

export function useBillingCounterData() {
  const { profile } = useAuth();
  const [bills, setBills] = useState<CounterBill[]>([]);
  const [loading, setLoading] = useState(false);
  const [teamLeads, setTeamLeads] = useState<{id: string, name: string}[]>([]);
  const [assignedCounters, setAssignedCounters] = useState<{id: string, name: string}[]>([]);

  const groupBills = useCallback((rawBills: any[]) => {
    const map = new Map<string, any>();
    rawBills.forEach(item => {
      const baseBillNumber = item.bill_number?.split('-').slice(0, 2).join('-') || item.bill_number;
      const counterName = item.profiles && !Array.isArray(item.profiles) ? item.profiles.name : (item.profiles && Array.isArray(item.profiles) ? item.profiles[0]?.name : 'Unknown');
      
      const existing = map.get(baseBillNumber);
      if (!existing) {
        map.set(baseBillNumber, {
          ...item,
          id: item.id,
          bill_number: baseBillNumber,
          counter_name: counterName,
          items: [item],
          accessory_name: item.accessories?.name || 'Unknown',
          vehicle_model: item.accessories?.vehicle_model || '-',
          quantity: Number(item.quantity) || 0,
          base_amount: Number(item.base_amount) || 0,
          cgst_amount: Number(item.cgst_amount) || 0,
          sgst_amount: Number(item.sgst_amount) || 0,
          total_amount: Number(item.total_amount) || 0,
          amount_paid: Number(item.amount_paid) || 0,
          amount_left: Number(item.amount_left) || 0,
          purchase_price: Number(item.accessories?.purchase_price) || 0
        });
      } else {
        if (!existing.items) existing.items = [];
        existing.items.push(item);
        existing.quantity += Number(item.quantity) || 0;
        existing.base_amount += Number(item.base_amount) || 0;
        existing.cgst_amount += Number(item.cgst_amount) || 0;
        existing.sgst_amount += Number(item.sgst_amount) || 0;
        existing.total_amount += Number(item.total_amount) || 0;
        existing.amount_paid += Number(item.amount_paid) || 0;
        existing.amount_left += Number(item.amount_left) || 0;
        existing.purchase_price += Number(item.accessories?.purchase_price) || 0;
      }
    });
    return Array.from(map.values()).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, []);

  const fetchBillingData = useCallback(async () => {
    if (!profile || profile.role !== 'billing_counter') return;
    setLoading(true);
    try {
      const assignedTlIds = profile.assigned_team_leads || [];
      if (assignedTlIds.length === 0) {
        setBills([]);
        setLoading(false);
        return;
      }

      const { data: teamLeadsData, error: tlError } = await supabase
        .from('profiles')
        .select('id, name, assigned_counters')
        .in('id', assignedTlIds);

      if (tlError) throw tlError;

      setTeamLeads(teamLeadsData.map(tl => ({ id: tl.id, name: tl.name })));

      const allowedCounterIds = new Set<string>();
      (teamLeadsData || []).forEach(tl => {
        (tl.assigned_counters || []).forEach((cId: string) => allowedCounterIds.add(cId));
      });

      if (allowedCounterIds.size === 0) {
        setBills([]);
        setAssignedCounters([]);
        setLoading(false);
        return;
      }

      const { data: counterData, error: counterError } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', Array.from(allowedCounterIds));
        
      if (!counterError && counterData) {
        setAssignedCounters(counterData);
      }

      const { data, error } = await supabase
        .from('bills')
        .select(`
          *,
          profiles!counter_id(name),
          accessories (name, accessory_code, vehicle_model, purchase_price)
        `)
        .in('approval_status', ['approved', 'closed']);

      if (error) throw error;
      
      const filteredData = (data || []).filter(b => allowedCounterIds.has(b.counter_id));

      console.log("[DEBUG] Raw fetched bills:", data);
      console.log("[DEBUG] Allowed Counter IDs:", allowedCounterIds);
      console.log("[DEBUG] Filtered bills:", filteredData);

      const grouped = groupBills(filteredData);
      console.log("[DEBUG] Grouped bills:", grouped);
      setBills(grouped);
    } catch (err: any) {
      console.error('Error fetching billing counter bills:', err);
      toast.error('Failed to load bills: ' + (err.message || err.toString()));
    } finally {
      setLoading(false);
    }
  }, [profile, groupBills]);

  useEffect(() => {
    fetchBillingData();
  }, [fetchBillingData]);

  const updateBillToClosed = async (billId: string) => {
    try {
      const billToUpdate = bills.find(b => b.id === billId);
      if (!billToUpdate) throw new Error("Bill not found");
      const itemIds = billToUpdate.items?.map(i => i.id) || [billId];

      const { error } = await supabase
        .from('bills')
        .update({
          approval_status: 'closed'
        })
        .in('id', itemIds);

      if (error) throw error;
      toast.success(`Bill ${billToUpdate.bill_number} closed successfully.`);
      fetchBillingData();
    } catch (error: any) {
      toast.error(error.message || 'Error closing bill');
      throw error;
    }
  };

  const updateBillReferences = async (billId: string, customerId: string, paymentDetails: any, excellonReceiptNumber: string) => {
    try {
      const billToUpdate = bills.find(b => b.id === billId);
      if (!billToUpdate) throw new Error("Bill not found");
      const itemIds = billToUpdate.items?.map(i => i.id) || [billId];

      const { error } = await supabase
        .from('bills')
        .update({
          customer_id: customerId,
          payment_details: paymentDetails,
          excellon_receipt_number: excellonReceiptNumber
        })
        .in('id', itemIds);

      if (error) throw error;
      toast.success(`References updated for bill ${billToUpdate.bill_number}`);
      fetchBillingData();
    } catch (error: any) {
      toast.error(error.message || 'Error updating references');
      throw error;
    }
  };

  return {
    bills,
    loading,
    teamLeads,
    assignedCounters,
    fetchBillingData,
    updateBillToClosed,
    updateBillReferences
  };
}
