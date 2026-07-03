// src/hooks/useAdminData.ts
import { useState, useEffect, useMemo, useCallback } from 'react';
import { api } from '../lib/api';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

export type Counter = { id: string; name: string; username?: string; password?: string; login_count?: number };
export type Warehouse = { id: string; name: string; username?: string; password?: string; login_count?: number };
export type TeamLead = { id: string; name: string; username?: string; password?: string; assigned_counters?: string[]; assigned_warehouses?: string[]; login_count?: number };
export type Cashier = { id: string; name: string; username?: string; password?: string; assigned_counters?: string[]; login_count?: number };
export type InventoryItem = { id: string; counter_id: string; counter_name: string; vehicle_model: string; name: string; accessory_code?: string; quantity: number; price: number; cgst_percent?: number; sgst_percent?: number; created_at: string };
export type LoginDetail = { user_id: string; name: string; login_count: number };
export type SalesReport = { counter_id: string; counter_name: string; total_bills: number; total_items: number; total_sales: number; total_collected: number; outstanding: number };

export interface CashierReport {
  cashier_id: string;
  cashier_name: string;
  total_cash_collected: number;
  pending_handover: number;
  approved_handover: number;
  drawer_balance: number;
}

export interface TeamLeadReport {
  team_lead_id: string;
  team_lead_name: string;
  assigned_counters_count: number;
  assigned_counters_names: string[];
  assigned_counters_ids: string[];
  pending_approvals: number;
  approved_approvals: number;
}

export type InventorySummary = { counter_id: string; counter_name: string; surplus_count: number; shortage_count: number };
export type AmountCollectedReport = {
  counter_id: string;
  counter_name: string;
  cash_collected: number;
  upi_collected: number;
  card_collected: number;
  bank_transfer_collected: number;
  bills_data: any[];
};

export type ModelAccessory = { id: string; counter_id: string; vehicle_model: string; created_at: string; name: string; accessory_code?: string; counter_name: string; quantity: number; price: number; cgst_percent?: number; sgst_percent?: number; };
export type CounterBill = { 
  id: string; 
  bill_number?: string; 
  created_at: string; 
  accessory_name: string; 
  accessory_code?: string; 
  vehicle_model: string; 
  quantity: number; 
  base_amount?: number;
  cgst_amount?: number;
  sgst_amount?: number;
  total_amount: number; 
  payment_method: string; 
  payment_details?: any[];
  amount_paid: number; 
  amount_left: number; 
  chassis_number?: string; 
  engine_number?: string; 
  checklist_number?: string;
  items?: any[];
  counter_id?: string;
  profiles?: { name: string };
  approval_status?: string;
};

export function useAdminData() {
  const [stats, setStats] = useState({ uniqueLogins: 0, items: 0, models: 0 });
  const [counters, setCounters] = useState<Counter[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [teamLeads, setTeamLeads] = useState<TeamLead[]>([]);
  const [cashiers, setCashiers] = useState<Cashier[]>([]);
  const [cashierReports, setCashierReports] = useState<CashierReport[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loginDetails] = useState<LoginDetail[]>([]);
  const [vehicleModels, setVehicleModels] = useState<string[]>([]);
  const [modelAccessories, setModelAccessories] = useState<ModelAccessory[]>([]);
  const [allBills, setAllBills] = useState<CounterBill[]>([]);
  const [transferCart, setTransferCart] = useState<(InventoryItem & { transferQuantity: number })[]>([]);
  const [uploading, setUploading] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchStats = useCallback(async () => {
    try {
      const data = await api.fetch('/api/protected/admin/stats');
      setStats(data);
    } catch (error) { console.error(error); }
  }, []);

  const fetchCounters = useCallback(async () => {
    try {
      const data = await api.fetch('/api/protected/admin/profiles/counter');
      setCounters(data);
    } catch (error) { console.error(error); }
  }, []);

  const fetchWarehouses = useCallback(async () => {
    try {
      const data = await api.fetch('/api/protected/admin/profiles/warehouse');
      setWarehouses(data);
    } catch (error) { console.error(error); }
  }, []);

  const fetchTeamLeads = useCallback(async () => {
    try {
      const data = await api.fetch('/api/protected/admin/profiles/team_lead');
      setTeamLeads(data);
    } catch (error) { console.error(error); }
  }, []);

  const fetchCashiers = useCallback(async () => {
    try {
      const data = await api.fetch('/api/protected/admin/profiles/cashier');
      setCashiers(data);

      const cashierIds = data.map((c: any) => c.id);
      if (cashierIds.length === 0) return;

      const transactions = await api.fetch('/api/protected/drawer_transactions/list', {
        method: 'POST',
        body: JSON.stringify({ counter_ids: cashierIds })
      });

      const reports: CashierReport[] = data.map((p: any) => {
        const assigned = p.assigned_counters || [];
        const allowedIds = [...assigned, p.id];
        let cashCollected = 0, pendingHandover = 0, approvedHandover = 0, expenses = 0, bankTransfers = 0, refunds = 0;

        transactions.forEach((t: any) => {
          if (allowedIds.includes(t.counter_id)) {
            if (t.transaction_type === 'cashier_transfer') {
              if (t.status === 'pending') pendingHandover += Number(t.amount);
              else if (t.status === 'approved') { approvedHandover += Number(t.amount); cashCollected += Number(t.amount); }
            } else if (t.status === 'approved') {
              if (t.transaction_type === 'daily_expense') expenses += Number(t.amount);
              if (t.transaction_type === 'bank_transfer') bankTransfers += Number(t.amount);
              if (t.transaction_type === 'refund') refunds += Number(t.amount);
            }
          }
        });

        return {
          cashier_id: p.id,
          cashier_name: p.name,
          total_cash_collected: cashCollected,
          pending_handover: pendingHandover,
          approved_handover: approvedHandover,
          drawer_balance: cashCollected - expenses - bankTransfers - refunds
        };
      });

      setCashierReports(reports);
    } catch (error) { console.error(error); }
  }, []);

  const updateProfileGeneric = async (id: string, updates: any, role: string, fetchFn: () => void) => {
    try {
      await api.fetch(`/api/protected/admin/profiles/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      });
      toast.success(`${role.replace('_', ' ')} updated successfully`);
      fetchFn();
    } catch (error: any) {
      toast.error(error.message || 'Error updating profile');
    }
  };

  const deleteProfileGeneric = async (id: string, role: string, fetchFn: () => void) => {
    if (!confirm(`Are you sure you want to delete this ${role.replace('_', ' ')}?`)) return;
    try {
      await api.fetch(`/api/protected/admin/profiles/${id}`, { method: 'DELETE' });
      toast.success(`${role.replace('_', ' ')} deleted successfully`);
      fetchFn();
    } catch (error: any) {
      toast.error(error.message || 'Error deleting profile');
    }
  };

  const updateCounter = (id: string, updates: any) => updateProfileGeneric(id, updates, 'counter', fetchCounters);
  const deleteCounter = (id: string) => deleteProfileGeneric(id, 'counter', fetchCounters);
  const updateWarehouse = (id: string, updates: any) => updateProfileGeneric(id, updates, 'warehouse', fetchWarehouses);
  const deleteWarehouse = (id: string) => deleteProfileGeneric(id, 'warehouse', fetchWarehouses);
  const updateTeamLead = (id: string, updates: any) => updateProfileGeneric(id, updates, 'team_lead', fetchTeamLeads);
  const deleteTeamLead = (id: string) => deleteProfileGeneric(id, 'team_lead', fetchTeamLeads);
  const updateCashier = (id: string, updates: any) => updateProfileGeneric(id, updates, 'cashier', fetchCashiers);
  const deleteCashier = (id: string) => deleteProfileGeneric(id, 'cashier', fetchCashiers);

  const fetchInventory = useCallback(async () => {
    try {
      const data = await api.fetch(`/api/protected/admin/inventory?start=${startDate}&end=${endDate}`);
      setInventory(data);
    } catch (error) { console.error(error); }
  }, [startDate, endDate]);

  const deleteAccessory = async (id: string) => {
    if (!confirm('Are you sure you want to delete this accessory?')) return;
    try {
      await api.fetch(`/api/protected/admin/accessories/${id}`, { method: 'DELETE' });
      toast.success('Accessory deleted successfully');
      fetchInventory();
    } catch (error: any) { toast.error(error.message); }
  };

  const updateAccessory = async (id: string, updates: Partial<InventoryItem>) => {
    try {
      await api.fetch(`/api/protected/admin/accessories/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      });
      toast.success('Accessory updated successfully');
      fetchInventory();
    } catch (error: any) { toast.error(error.message); }
  };

  const transferAccessory = async (item: InventoryItem, targetCounterId: string, quantity: number) => {
    try {
      await api.fetch('/api/protected/admin/accessories/transfer', {
        method: 'POST',
        body: JSON.stringify({ id: item.id, targetCounterId, quantity })
      });
      toast.success('Accessory transferred successfully');
      fetchInventory();
    } catch (error: any) { toast.error(error.message); }
  };

  const transferAllAccessories = async (items: InventoryItem[], targetCounterId: string) => {
    if (items.length === 0) return;
    setUploading(true);
    try {
      await api.fetch('/api/protected/admin/accessories/transfer-bulk', {
        method: 'POST',
        body: JSON.stringify({ items, targetCounterId })
      });
      toast.success('Bulk transfer completed successfully');
      fetchInventory();
    } catch (error: any) { toast.error(error.message); } finally { setUploading(false); }
  };

  const addToTransferCart = (item: InventoryItem, quantity: number) => {
    if (quantity > item.quantity) {
      toast.error(`Only ${item.quantity} units available`);
      return;
    }
    setTransferCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        const newQty = existing.transferQuantity + quantity;
        if (newQty > item.quantity) {
          toast.error(`Total cart quantity exceeds available stock`);
          return prev;
        }
        return prev.map(i => i.id === item.id ? { ...i, transferQuantity: newQty } : i);
      }
      return [...prev, { ...item, transferQuantity: quantity }];
    });
    toast.success('Added to transfer cart');
  };

  const removeFromTransferCart = (id: string) => {
    setTransferCart(prev => prev.filter(i => i.id !== id));
  };

  const clearTransferCart = () => setTransferCart([]);

  const executeCartTransfer = async (targetCounterId: string) => {
    if (transferCart.length === 0) return;
    setUploading(true);
    try {
      await api.fetch('/api/protected/admin/accessories/transfer-bulk', {
        method: 'POST',
        body: JSON.stringify({ items: transferCart, targetCounterId })
      });
      toast.success('Cart items transferred successfully!');
      clearTransferCart();
      fetchInventory();
    } catch (error: any) { toast.error(error.message); } finally { setUploading(false); }
  };

  const groupBills = useCallback((data: any[]): CounterBill[] => {
    const map = new Map<string, CounterBill>();
    data.forEach(item => {
      const bNo = item.bill_number ? (item.bill_number.split('-').length > 2 ? item.bill_number.substring(0, item.bill_number.lastIndexOf('-')) : item.bill_number) : `TEMP-${item.id}`;
      const existing = map.get(bNo);
      if (!existing) {
        map.set(bNo, { 
          ...item, bill_number: bNo, items: [item], accessory_name: item.accessories?.name || 'Unknown',
          vehicle_model: item.accessories?.vehicle_model || '-', quantity: Number(item.quantity) || 0,
          base_amount: Number(item.base_amount) || 0, cgst_amount: Number(item.cgst_amount) || 0,
          sgst_amount: Number(item.sgst_amount) || 0, total_amount: Number(item.total_amount) || 0,
          amount_paid: Number(item.amount_paid) || 0, amount_left: Number(item.amount_left) || 0
        });
      } else {
        if (!existing.items) existing.items = [];
        existing.items.push(item);
        existing.quantity += Number(item.quantity) || 0;
        existing.base_amount = (existing.base_amount || 0) + (Number(item.base_amount) || 0);
        existing.cgst_amount = (existing.cgst_amount || 0) + (Number(item.cgst_amount) || 0);
        existing.sgst_amount = (existing.sgst_amount || 0) + (Number(item.sgst_amount) || 0);
        existing.total_amount += Number(item.total_amount) || 0;
        existing.amount_paid += Number(item.amount_paid) || 0;
        existing.amount_left += Number(item.amount_left) || 0;
      }
    });
    return Array.from(map.values());
  }, []);

  const fetchBills = useCallback(async () => {
    try {
      const data = await api.fetch('/api/protected/admin/bills');
      setAllBills(groupBills(data || []));
    } catch (error) { console.error(error); }
  }, [groupBills]);

  const filteredBills = useMemo(() => {
    return allBills.filter(bill => {
      if (bill.approval_status === 'reverted' || bill.approval_status === 'reverted_by_admin') return false;
      if (!startDate && !endDate) return true;
      const billDateStr = new Date(bill.created_at).toISOString().split('T')[0];
      if (startDate && billDateStr < startDate) return false;
      if (endDate && billDateStr > endDate) return false;
      return true;
    });
  }, [allBills, startDate, endDate]);

  const salesReport = useMemo(() => {
    const map = new Map<string, SalesReport>();
    filteredBills.forEach((bill: any) => {
      const existing = map.get(bill.counter_id);
      if (existing) {
        existing.total_bills++;
        existing.total_items += Number(bill.quantity) || 0;
        existing.total_sales += Number(bill.total_amount) || 0;
        existing.total_collected += Number(bill.amount_paid) || 0;
        existing.outstanding += Number(bill.amount_left) || 0;
      } else {
        map.set(bill.counter_id, {
          counter_id: bill.counter_id, counter_name: bill.counter_name || 'Unknown', total_bills: 1,
          total_items: Number(bill.quantity) || 0, total_sales: Number(bill.total_amount) || 0, 
          total_collected: Number(bill.amount_paid) || 0, outstanding: Number(bill.amount_left) || 0
        });
      }
    });
    return Array.from(map.values());
  }, [filteredBills]);

  const inventoryReport = useMemo(() => {
    const map = new Map<string, InventorySummary>();
    inventory.forEach((item: any) => {
      const existing = map.get(item.counter_id);
      const isSurplus = item.quantity > 5;
      const isShortage = item.quantity <= 5;
      if (existing) {
        if (isSurplus) existing.surplus_count++;
        if (isShortage) existing.shortage_count++;
      } else {
        map.set(item.counter_id, { counter_id: item.counter_id, counter_name: item.counter_name, surplus_count: isSurplus ? 1 : 0, shortage_count: isShortage ? 1 : 0 });
      }
    });
    return Array.from(map.values());
  }, [inventory]);

  const amountCollectedReport = useMemo(() => {
    const map = new Map<string, AmountCollectedReport>();
    filteredBills.forEach((bill: any) => {
      const existing: AmountCollectedReport = map.get(bill.counter_id) || {
        counter_id: bill.counter_id, counter_name: bill.counter_name || 'Unknown',
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
      map.set(bill.counter_id, existing);
    });
    return Array.from(map.values());
  }, [filteredBills]);

  const teamLeadReports = useMemo(() => {
    if (teamLeads.length === 0) return [];
    return teamLeads.map((tl: any) => {
      const assignedIds = tl.assigned_counters || [];
      const assignedNames = counters.filter(c => assignedIds.includes(c.id)).map(c => c.name);
      const tlBills = filteredBills.filter(b => assignedIds.includes(b.counter_id));
      const pendingCount = tlBills.filter(b => b.approval_status === 'pending').length;
      const approvedCount = tlBills.filter(b => b.approval_status === 'approved').length;
      return {
        team_lead_id: tl.id, team_lead_name: tl.name, assigned_counters_count: assignedIds.length,
        assigned_counters_names: assignedNames, assigned_counters_ids: assignedIds,
        pending_approvals: pendingCount, approved_approvals: approvedCount
      };
    });
  }, [teamLeads, counters, filteredBills]);

  const fetchVehicleModels = useCallback(async () => {
    try {
      const data = await api.fetch('/api/protected/admin/inventory');
      setVehicleModels([...new Set((data || []).map((d: any) => d.vehicle_model))].sort() as string[]);
    } catch (error) { console.error(error); }
  }, []);

  const fetchModelAccessories = useCallback(async (model: string) => {
    try {
      const data = await api.fetch('/api/protected/admin/inventory');
      const filtered = data.filter((d: any) => d.vehicle_model === model);
      setModelAccessories(filtered);
    } catch (error) { console.error(error); }
  }, []);

  const fetchCounterBills = useCallback((counterId: string) => {
    return filteredBills.filter(b => b.counter_id === counterId);
  }, [filteredBills]);

  const deleteDataByDate = async (date: string) => {
    if (!confirm(`Are you sure you want to delete ALL inventory data uploaded on ${date}?`)) return;
    setUploading(true);
    try {
      await api.fetch(`/api/protected/admin/accessories/by-date/${date}`, { method: 'DELETE' });
      toast.success(`Successfully deleted all data from ${date}`);
      fetchInventory();
      fetchStats();
    } catch (error: any) { toast.error(error.message); } finally { setUploading(false); }
  };

  const handleFileUpload = useCallback(async (file: File, counterId: string, customDate?: string) => {
    setUploading(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
      const consolidatedData = new Map<string, any>();
      
      jsonData.forEach((row: any) => {
        const rowKeys = Object.keys(row);
        const getVal = (searchKeys: string[]) => {
          for (const sKey of searchKeys) {
            if (row[sKey] !== undefined) return row[sKey];
            const foundKey = rowKeys.find(k => k.toLowerCase().includes(sKey.toLowerCase()));
            if (foundKey) return row[foundKey];
          }
          return '';
        };
        const parseNum = (val: any) => { 
          if (typeof val === 'number') return val; 
          if (!val) return 0; 
          const cleaned = val.toString().replace(/[^\d.-]/g, ''); 
          const parsed = parseFloat(cleaned); 
          return isNaN(parsed) ? 0 : parsed; 
        };
        const vehicle_model = getVal(['Vehicle Model', 'Model', 'vehicle_model', 'model']).toString().trim();
        const name = getVal(['Accessory Name', 'Accessory', 'name', 'accessory_name']).toString().trim();
        const accessory_code = getVal(['Accessory Code', 'Code', 'Item Code', 'Part Number', 'accessory_code']).toString().trim();
        const quantity = Math.abs(parseInt(getVal(['Quantity', 'Qty', 'quantity', 'qty']) || '0'));
        const price = parseNum(getVal(['Price (₹)', 'Price', 'Cost', 'MRP', 'Rate', 'Amount', 'Unit Price', 'Sale Price', 'price', 'cost', 'mrp']));
        const gstRaw = parseNum(getVal(['GST', 'GST %', 'gst', 'Tax', 'tax', 'GST Percentage']));
        const cgst_percent = gstRaw / 2;
        const sgst_percent = gstRaw / 2;

        if (!name || !vehicle_model) return;
        
        const key = `${vehicle_model.toLowerCase()}|${name.toLowerCase()}`;
        const existing = consolidatedData.get(key);
        if (existing) { 
          existing.quantity += quantity; 
          existing.price = price > 0 ? price : existing.price; 
          if (!existing.accessory_code) existing.accessory_code = accessory_code;
          if (gstRaw > 0) { existing.cgst_percent = cgst_percent; existing.sgst_percent = sgst_percent; }
        } else { 
          const uploadTimestamp = customDate ? `${customDate}T12:00:00Z` : new Date().toISOString();
          consolidatedData.set(key, { counter_id: counterId, vehicle_model, name, accessory_code, quantity, price, cgst_percent, sgst_percent, created_at: uploadTimestamp }); 
        }
      });

      const rowsToInsert = Array.from(consolidatedData.values());
      if (rowsToInsert.length === 0) throw new Error('No valid data found.');
      
      await api.fetch('/api/protected/admin/accessories/upload', {
        method: 'POST',
        body: JSON.stringify({ rows: rowsToInsert })
      });

      toast.success(`Successfully uploaded ${rowsToInsert.length} accessories!`);
      fetchInventory();
      fetchStats();
    } catch (error: any) { toast.error(error.message || 'Error processing Excel file'); } finally { setUploading(false); }
  }, [fetchInventory, fetchStats]);

  const updateBillStatusAdmin = async (billId: string, status: 'approved' | 'reverted' | 'reverted_by_admin', counterId: string) => {
    try {
      const billToUpdate = allBills.find(b => b.id === billId);
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
      fetchBills();
      fetchInventory();
    } catch (error: any) { toast.error(error.message || 'Error updating bill status'); }
  };

  useEffect(() => {
    fetchStats();
    fetchCounters();
    fetchWarehouses();
    fetchTeamLeads();
    fetchCashiers();
    fetchBills();
  }, [fetchStats, fetchCounters, fetchWarehouses, fetchTeamLeads, fetchCashiers, fetchBills]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  return {
    stats, counters, warehouses, inventory, loginDetails, vehicleModels, modelAccessories, salesReport, inventoryReport, amountCollectedReport, uploading, cashierReports, teamLeadReports, allBills,
    startDate, endDate, setStartDate, setEndDate,
    fetchCounters, fetchWarehouses, fetchVehicleModels, fetchModelAccessories, fetchCounterBills, handleFileUpload, fetchBills,
    updateCounter, deleteCounter, updateWarehouse, deleteWarehouse,
    deleteAccessory, updateAccessory, transferAccessory, transferAllAccessories, fetchInventory,
    transferCart, addToTransferCart, removeFromTransferCart, clearTransferCart, executeCartTransfer,
    deleteDataByDate,
    teamLeads, fetchTeamLeads, updateTeamLead, deleteTeamLead,
    cashiers, fetchCashiers, updateCashier, deleteCashier,
    updateBillStatusAdmin
  };
}