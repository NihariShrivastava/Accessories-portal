import { useState, useCallback, useMemo, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { useAuth } from '../components/auth-provider';
import type { CounterBill } from './useAdminData';

export function useAuditorData() {
  const { profile } = useAuth();
  const [bills, setBills] = useState<CounterBill[]>([]);
  const [loading, setLoading] = useState(false);
  const [teamLeads, setTeamLeads] = useState<{id: string, name: string, username?: string}[]>([]);
  const [assignedCounters, setAssignedCounters] = useState<{id: string, name: string}[]>([]);
  
  // Group bills since they are row-per-item
  const groupBills = useCallback((rawBills: any[]) => {
    const map = new Map<string, any>();
    rawBills.forEach(item => {
      let bNo = item.bill_number || `TEMP-${item.id}`;
      if (/^\d+-\d+$/.test(bNo)) {
        bNo = bNo.split('-')[0];
      } else {
        const parts = bNo.split('-');
        if (parts.length > 1) {
          const last = parts[parts.length - 1];
          const secondLast = parts[parts.length - 2];
          if (/^\d{4,}$/.test(secondLast) && /^\d+$/.test(last)) {
            bNo = bNo.substring(0, bNo.lastIndexOf('-'));
          }
        }
      }
      
      const groupKey = `${item.counter_id || 'unknown'}_${bNo}_${(item.created_at || '').substring(0, 16)}`;
      const existing = map.get(groupKey);
      if (!existing) {
        map.set(groupKey, {
          ...item,
          id: item.id, // Using the first item's ID as the main bill ID for status updates
          bill_number: bNo,
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
          // Extract cost if available via accessories relationship for profit calc
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

  const fetchAuditorBills = useCallback(async () => {
    if (!profile || profile.role !== 'auditor') return;
    setLoading(true);
    try {
      // 1. Fetch team leads assigned to this auditor
      const assignedTlIds = profile.assigned_team_leads || [];
      if (assignedTlIds.length === 0) {
        setBills([]);
        setLoading(false);
        return;
      }

      const { data: teamLeadsData, error: tlError } = await supabase
        .from('profiles')
        .select('id, name, username, assigned_counters')
        .in('id', assignedTlIds);

      if (tlError) throw tlError;

      setTeamLeads(teamLeadsData.map(tl => ({ id: tl.id, name: tl.name, username: tl.username })));

      // Collect all counter IDs assigned to these team leads
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

      // Fetch counter names
      const { data: counterData, error: counterError } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', Array.from(allowedCounterIds));
        
      if (!counterError && counterData) {
        setAssignedCounters(counterData);
      }

      // 2. Fetch closed bills and filter
      const { data, error } = await supabase
        .from('bills')
        .select(`
          *,
          profiles!counter_id(name),
          accessories (name, accessory_code, vehicle_model, purchase_price)
        `)
        .eq('approval_status', 'closed');

      if (error) throw error;
      
      // Filter out bills that do not belong to the allowed counters
      const filteredData = (data || []).filter(b => allowedCounterIds.has(b.counter_id));

      const grouped = groupBills(filteredData);
      setBills(grouped);
    } catch (err: any) {
      console.error('Error fetching auditor bills:', err);
      toast.error('Failed to load bills: ' + (err.message || err.toString()));
    } finally {
      setLoading(false);
    }
  }, [profile, groupBills]);

  const saveAuditDetails = async (billId: string, savingsData: any, paymentsData: any, totalSavings: number, totalGap: number) => {
    try {
      // Find all item IDs for this grouped bill
      const billToUpdate = bills.find(b => b.id === billId);
      if (!billToUpdate) throw new Error("Bill not found");
      const itemIds = billToUpdate.items?.map(i => i.id) || [billId];

      const { error } = await supabase
        .from('bills')
        .update({
          audit_status: 'audited',
          auditor_id: profile?.id,
          dealership_savings: savingsData,
          payment_audits: paymentsData,
          total_savings: totalSavings,
          total_gap: totalGap
        })
        .in('id', itemIds);

      if (error) throw error;
      
      toast.success('Audit saved and forwarded to Admin successfully!');
      fetchAuditorBills(); // Refresh
    } catch (err: any) {
      console.error('Error saving audit:', err);
      toast.error('Failed to save audit details');
    }
  };

  const revertBillToTeamLead = async (billId: string) => {
    try {
      const billToUpdate = bills.find(b => b.id === billId);
      if (!billToUpdate) throw new Error("Bill not found");
      const itemIds = billToUpdate.items?.map(i => i.id) || [billId];

      const { error } = await supabase
        .from('bills')
        .update({
          audit_status: 'reverted_to_team_lead',
          auditor_id: profile?.id
        })
        .in('id', itemIds);

      if (error) throw error;
      
      toast.success('Bill reverted to Team Lead successfully.');
      fetchAuditorBills(); // Refresh
    } catch (err: any) {
      console.error('Error reverting bill:', err);
      toast.error('Failed to revert bill to Team Lead');
    }
  };

  const updateBillMetadata = async (billId: string, metadata: any) => {
    try {
      const billToUpdate = bills.find(b => b.id === billId);
      if (!billToUpdate) throw new Error("Bill not found");
      const itemIds = billToUpdate.items?.map(i => i.id) || [billId];

      const { error } = await supabase
        .from('bills')
        .update(metadata)
        .in('id', itemIds);

      if (error) throw error;
      toast.success('Bill metadata updated successfully.');
      fetchAuditorBills(); // Refresh
    } catch (err: any) {
      console.error('Error updating bill metadata:', err);
      toast.error('Failed to update bill metadata');
    }
  };

  const pendingAudits = useMemo(() => {
    return bills.filter(b => b.audit_status !== 'audited' && b.audit_status !== 'reverted_by_admin' && b.audit_status !== 'verified' && b.audit_status !== 'reverted_to_team_lead');
  }, [bills]);

  const forwardedAudits = useMemo(() => {
    return bills.filter(b => b.audit_status === 'audited');
  }, [bills]);

  const revertedAudits = useMemo(() => {
    return bills.filter(b => b.audit_status === 'reverted_by_admin');
  }, [bills]);

  useEffect(() => {
    fetchAuditorBills();
  }, [fetchAuditorBills]);

  return {
    profile,
    bills,
    pendingAudits,
    forwardedAudits,
    revertedAudits,
    teamLeads,
    assignedCounters,
    loading,
    fetchAuditorBills,
    saveAuditDetails,
    revertBillToTeamLead,
    updateBillMetadata
  };
}

