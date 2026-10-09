import { useState, useMemo } from 'react';
import { DataTable } from '../../DataTable';
import { ViewHeader } from '../../ViewHeader';
import { Badge } from '../../Badge';
import { ChevronLeft, ChevronRight, Download, Package, IndianRupee, History, Users, Save, Clock, BarChart3, X, Calendar } from 'lucide-react';
import type { SalesReport, InventoryItem, InventorySummary, CashierReport, AmountCollectedReport, TeamLeadReport, CounterBill, BillingCounterReport, AccessoryMovementReport } from '../../../../hooks/useAdminData';
import { AmountCollectedDialog } from './AmountCollectedDialog';
import { exportToExcel } from '../../../../utils/exportToExcel';

// Fast local ISO date string formatter (YYYY-MM-DD)
const formatDateToLocalISO = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Extremely fast date extraction from created_at string
const getBillDateStr = (createdAt: string): string => {
  if (!createdAt) return '';
  if (createdAt.length >= 10 && createdAt[4] === '-' && createdAt[7] === '-') {
    return createdAt.substring(0, 10);
  }
  const d = new Date(createdAt);
  if (isNaN(d.getTime())) return '';
  return formatDateToLocalISO(d);
};

const isInDateRange = (dateStr: string, start: string, end: string): boolean => {
  if (!start && !end) return true;
  if (!dateStr) return false;
  if (start && dateStr < start) return false;
  if (end && dateStr > end) return false;
  return true;
};

export const ReportsView = ({
  role = 'admin',
  data, onBack, onCounterClick, inventory, inventoryReport, cashierReports, onCashierClick, amountCollectedReport = [], teamLeadReports, onTeamLeadClick, billingCounterReports, auditorReports, onAuditorClick, accessoryMovementReport, onMovementClick, unpaidBillsReport, onViewUnpaidBill, currentSlide, onSlideChange, allBills,
  drawerTransactions,
  startDate: startDateProp,
  endDate: endDateProp,
  onDateChange
}: {
  role?: 'admin' | 'team_lead',
  data: SalesReport[], onBack: () => void, onCounterClick: (r: SalesReport) => void,
  inventory: InventoryItem[], inventoryReport: InventorySummary[], cashierReports?: CashierReport[],
  onCashierClick?: (r: CashierReport) => void, amountCollectedReport?: AmountCollectedReport[],
  teamLeadReports?: TeamLeadReport[], onTeamLeadClick?: (r: TeamLeadReport) => void,
  billingCounterReports?: BillingCounterReport[],
  auditorReports?: any[], onAuditorClick?: (r: any) => void,
  accessoryMovementReport?: AccessoryMovementReport[], onMovementClick?: (r: AccessoryMovementReport) => void,
  unpaidBillsReport?: CounterBill[], onViewUnpaidBill?: (b: CounterBill) => void,
  currentSlide?: number, onSlideChange?: (slide: number) => void,
  allBills?: CounterBill[],
  drawerTransactions?: any[],
  startDate?: string,
  endDate?: string,
  onDateChange?: (start: string, end: string) => void
}) => {
  // Use local state if props are not provided, else use props
  const [localSlide, setLocalSlide] = useState(0);
  const activeSlide = currentSlide !== undefined ? currentSlide : localSlide;
  const handleSlideChange = (newSlide: number) => {
    if (onSlideChange) onSlideChange(newSlide);
    else setLocalSlide(newSlide);
  };

  const [localStartDate, setLocalStartDate] = useState(startDateProp || '');
  const [localEndDate, setLocalEndDate] = useState(endDateProp || '');

  const startDate = startDateProp !== undefined ? startDateProp : localStartDate;
  const endDate = endDateProp !== undefined ? endDateProp : localEndDate;

  const handleDateChange = (newStart: string, newEnd: string) => {
    setLocalStartDate(newStart);
    setLocalEndDate(newEnd);
    if (onDateChange) onDateChange(newStart, newEnd);
  };

  const handlePreset = (preset: 'all' | 'today' | 'yesterday' | '7days' | 'this_month') => {
    const now = new Date();
    const today = formatDateToLocalISO(now);
    if (preset === 'all') {
      handleDateChange('', '');
    } else if (preset === 'today') {
      handleDateChange(today, today);
    } else if (preset === 'yesterday') {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      const yesterday = formatDateToLocalISO(y);
      handleDateChange(yesterday, yesterday);
    } else if (preset === '7days') {
      const d7 = new Date();
      d7.setDate(d7.getDate() - 6);
      handleDateChange(formatDateToLocalISO(d7), today);
    } else if (preset === 'this_month') {
      const mStart = formatDateToLocalISO(new Date(now.getFullYear(), now.getMonth(), 1));
      handleDateChange(mStart, today);
    }
  };

  const activePreset = useMemo(() => {
    if (!startDate && !endDate) return 'all';
    const now = new Date();
    const today = formatDateToLocalISO(now);
    if (startDate === today && endDate === today) return 'today';
    const y = new Date();
    y.setDate(y.getDate() - 1);
    const yesterday = formatDateToLocalISO(y);
    if (startDate === yesterday && endDate === yesterday) return 'yesterday';
    const d7 = new Date();
    d7.setDate(d7.getDate() - 6);
    const sevenDaysAgo = formatDateToLocalISO(d7);
    if (startDate === sevenDaysAgo && endDate === today) return '7days';
    const mStart = formatDateToLocalISO(new Date(now.getFullYear(), now.getMonth(), 1));
    if (startDate === mStart && endDate === today) return 'this_month';
    return 'custom';
  }, [startDate, endDate]);

  const [expandedCounter, setExpandedCounter] = useState<string | null>(null);
  const [selectedCounterFilter, setSelectedCounterFilter] = useState<string>('all');
  const [selectedAmountReport, setSelectedAmountReport] = useState<AmountCollectedReport | null>(null);
  
  const slideNames = ['Ledger', 'Revenue Report', 'Inventory Report', 'Amount Collected'];
  if (teamLeadReports) slideNames.push('Team Lead Report');
  if (billingCounterReports) slideNames.push('Billing Counter Report');
  if (cashierReports && onCashierClick) slideNames.push('Cashier Report');
  if (auditorReports && onAuditorClick) slideNames.push('Auditor Report');
  if (unpaidBillsReport && onViewUnpaidBill) slideNames.push('Unpaid Bills Report');
  if (accessoryMovementReport && onMovementClick) slideNames.push('Accessory Movement Report');
  const totalSlides = slideNames.length;

  // 1. High efficiency in-memory date-filtered bills
  const effectiveBills = useMemo(() => {
    if (!allBills || allBills.length === 0) return [];
    return allBills.filter(bill => {
      if (bill.approval_status === 'reverted' || bill.approval_status === 'reverted_by_admin') return false;
      if (!startDate && !endDate) return true;
      const dStr = getBillDateStr(bill.created_at);
      return isInDateRange(dStr, startDate, endDate);
    });
  }, [allBills, startDate, endDate]);

  // 2. High efficiency date-filtered drawer transactions
  const dateFilteredDrawerTransactions = useMemo(() => {
    if (!drawerTransactions || drawerTransactions.length === 0) return [];
    if (!startDate && !endDate) return drawerTransactions;
    return drawerTransactions.filter((t: any) => {
      const dStr = getBillDateStr(t.created_at);
      return isInDateRange(dStr, startDate, endDate);
    });
  }, [drawerTransactions, startDate, endDate]);

  // 3. Date-filtered Sales Report (Ledger & Revenue)
  const dateFilteredSalesReport = useMemo(() => {
    if (!startDate && !endDate) {
      return data;
    }

    const map = new Map<string, SalesReport>();
    data.forEach(d => {
      map.set(d.counter_id, {
        counter_id: d.counter_id,
        counter_name: d.counter_name,
        total_bills: 0,
        total_items: 0,
        total_sales: 0,
        total_collected: 0,
        outstanding: 0,
        drawer_balance: d.drawer_balance || 0
      });
    });

    effectiveBills.forEach(bill => {
      const existing = map.get(bill.counter_id || '');
      const qty = bill.items ? bill.items.reduce((sum: number, i: any) => sum + (Number(i.quantity) || 1), 0) : (Number(bill.quantity) || 1);
      const sales = Number(bill.total_amount) || 0;
      const collected = Number(bill.amount_paid) || 0;
      const left = Number(bill.amount_left) || 0;

      if (existing) {
        existing.total_bills += 1;
        existing.total_items += qty;
        existing.total_sales += sales;
        existing.total_collected += collected;
        existing.outstanding += left;
      } else if (bill.counter_id) {
        map.set(bill.counter_id, {
          counter_id: bill.counter_id,
          counter_name: bill.profiles?.name || bill.counter_name || 'Unknown',
          total_bills: 1,
          total_items: qty,
          total_sales: sales,
          total_collected: collected,
          outstanding: left,
          drawer_balance: 0
        });
      }
    });

    if (dateFilteredDrawerTransactions && dateFilteredDrawerTransactions.length > 0) {
      map.forEach(entry => {
        entry.drawer_balance = 0;
      });
      dateFilteredDrawerTransactions.forEach((t: any) => {
        const existing = map.get(t.counter_id);
        if (existing) {
          if (t.transaction_type === 'cashier_transfer' && t.status === 'approved') {
            existing.drawer_balance = (existing.drawer_balance || 0) + Number(t.amount);
          } else if (t.status === 'approved') {
            if (t.transaction_type === 'daily_expense') {
              existing.drawer_balance = (existing.drawer_balance || 0) - Number(t.amount);
            } else if (t.transaction_type === 'bank_transfer' || t.transaction_type === 'refund') {
              existing.drawer_balance = (existing.drawer_balance || 0) - Number(t.amount);
            }
          }
        }
      });
    }

    return Array.from(map.values());
  }, [data, effectiveBills, dateFilteredDrawerTransactions, startDate, endDate]);

  // 4. Date-filtered Amount Collected Report
  const dateFilteredAmountCollected = useMemo(() => {
    if (!startDate && !endDate) {
      return amountCollectedReport;
    }

    const map = new Map<string, AmountCollectedReport>();
    data.forEach(d => {
      map.set(d.counter_id, {
        counter_id: d.counter_id,
        counter_name: d.counter_name,
        cash_collected: 0,
        upi_collected: 0,
        card_collected: 0,
        bank_transfer_collected: 0,
        total_collected: 0,
        bills_data: []
      });
    });

    effectiveBills.forEach(bill => {
      const cId = bill.counter_id || '';
      const existing: AmountCollectedReport = map.get(cId) || {
        counter_id: cId,
        counter_name: bill.profiles?.name || bill.counter_name || 'Unknown',
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
  }, [amountCollectedReport, data, effectiveBills, startDate, endDate]);

  // 5. Date-filtered Team Lead Reports
  const dateFilteredTeamLeadReports = useMemo(() => {
    if (!teamLeadReports || teamLeadReports.length === 0) return undefined;
    if (!startDate && !endDate) return teamLeadReports;

    return teamLeadReports.map(tl => {
      const assignedIds = tl.assigned_counters_ids || [];
      const tlBills = effectiveBills.filter(b => b.counter_id && assignedIds.includes(b.counter_id));
      const pendingCount = tlBills.filter(b => b.approval_status === 'pending').length;
      const approvedCount = tlBills.filter(b => b.approval_status === 'approved').length;
      const totalDiscount = tlBills.reduce((sum, b) => sum + (Number(b.discount_approved) || 0), 0);
      const totalExcess = tlBills.reduce((sum, b) => sum + (Number(b.excess_adjustment) || 0), 0);

      return {
        ...tl,
        pending_approvals: pendingCount,
        approved_approvals: approvedCount,
        total_discount_approved: totalDiscount,
        total_excess_approved: totalExcess
      };
    });
  }, [teamLeadReports, effectiveBills, startDate, endDate]);

  // 6. Date-filtered Billing Counter Reports
  const dateFilteredBillingCounterReports = useMemo(() => {
    if (!billingCounterReports || billingCounterReports.length === 0) return undefined;
    if (!startDate && !endDate) return billingCounterReports;

    return billingCounterReports.map(bc => {
      const assignedNames = bc.assigned_counters_names || [];
      const bcBills = effectiveBills.filter(b => {
        const cName = b.profiles?.name || b.counter_name;
        return cName && assignedNames.includes(cName);
      });

      const pendingCount = bcBills.filter(b => b.approval_status === 'approved').length;
      const closedCount = bcBills.filter(b => b.approval_status === 'closed').length;

      return {
        ...bc,
        pending_bills: pendingCount,
        closed_bills: closedCount
      };
    });
  }, [billingCounterReports, effectiveBills, startDate, endDate]);

  // 7. Date-filtered Auditor Reports
  const dateFilteredAuditorReports = useMemo(() => {
    if (!auditorReports || auditorReports.length === 0) return undefined;
    if (!startDate && !endDate) return auditorReports;

    return auditorReports.map(auditor => {
      const auditedBills = effectiveBills.filter(b => b.auditor_id === auditor.auditor_id && b.audit_status === 'audited');
      const pendingCount = effectiveBills.filter(b => b.audit_status !== 'audited' && b.approval_status === 'approved').length;
      const approvedCount = auditedBills.length;
      const totalSavings = auditedBills.reduce((sum, b) => sum + (Number(b.total_savings) || 0), 0);

      return {
        ...auditor,
        pending_audits: pendingCount,
        approved_audits: approvedCount,
        total_savings_found: totalSavings
      };
    });
  }, [auditorReports, effectiveBills, startDate, endDate]);

  // 8. Date-filtered Unpaid Bills Report
  const dateFilteredUnpaidBillsReport = useMemo(() => {
    if (!unpaidBillsReport) return undefined;
    if (!startDate && !endDate) return unpaidBillsReport;

    return effectiveBills.filter(b => (Number(b.amount_left) || 0) > 0 && b.approval_status === 'closed');
  }, [unpaidBillsReport, effectiveBills, startDate, endDate]);

  // 9. Date-filtered Inventory
  const dateFilteredInventory = useMemo(() => {
    if (!inventory) return [];
    if (!startDate && !endDate) return inventory;

    return inventory.filter(item => {
      const dStr = getBillDateStr(item.created_at);
      return isInDateRange(dStr, startDate, endDate);
    });
  }, [inventory, startDate, endDate]);

  const dateFilteredInventoryReport = useMemo(() => {
    if (!startDate && !endDate) return inventoryReport;

    const map = new Map<string, InventorySummary>();
    data.forEach(d => {
      map.set(d.counter_id, {
        counter_id: d.counter_id,
        counter_name: d.counter_name,
        surplus_count: 0,
        shortage_count: 0
      });
    });

    dateFilteredInventory.forEach(item => {
      const existing = map.get(item.counter_id);
      const isSurplus = item.quantity > 5;
      const isShortage = item.quantity <= 5;
      if (existing) {
        if (isSurplus) existing.surplus_count++;
        if (isShortage) existing.shortage_count++;
      } else {
        map.set(item.counter_id, {
          counter_id: item.counter_id,
          counter_name: item.counter_name,
          surplus_count: isSurplus ? 1 : 0,
          shortage_count: isShortage ? 1 : 0
        });
      }
    });

    return Array.from(map.values());
  }, [inventoryReport, data, dateFilteredInventory, startDate, endDate]);

  // 10. Date-filtered Accessory Movement Report
  const dateFilteredAccessoryMovementReport = useMemo(() => {
    if (!accessoryMovementReport) return undefined;
    if (!startDate && !endDate) return accessoryMovementReport;

    const map = new Map<string, AccessoryMovementReport>();
    
    dateFilteredInventory.forEach(item => {
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

    effectiveBills.forEach(bill => {
      let existing = map.get(bill.counter_id || '');
      if (!existing && bill.counter_id) {
        existing = {
          counter_id: bill.counter_id,
          counter_name: bill.profiles?.name || bill.counter_name || 'Unknown',
          total_in_count: 0,
          total_out_count: 0,
          accessories: []
        };
        map.set(bill.counter_id, existing);
      }
      if (existing && bill.items && Array.isArray(bill.items)) {
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
  }, [accessoryMovementReport, dateFilteredInventory, effectiveBills, startDate, endDate]);

  // 11. Date-filtered Cashier Reports
  const dateFilteredCashierReports = useMemo(() => {
    if (!cashierReports) return undefined;
    if (!startDate && !endDate) return cashierReports;
    if (!dateFilteredDrawerTransactions || dateFilteredDrawerTransactions.length === 0) {
      return cashierReports;
    }

    return cashierReports.map(c => {
      let cashCollected = 0;
      let pendingHandover = 0;
      let approvedHandover = 0;
      let expenses = 0;
      let bankTransfers = 0;
      let refunds = 0;

      dateFilteredDrawerTransactions.forEach((t: any) => {
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
      });

      return {
        ...c,
        total_cash_collected: cashCollected,
        pending_handover: pendingHandover,
        approved_handover: approvedHandover,
        drawer_balance: cashCollected - expenses - bankTransfers - refunds
      };
    });
  }, [cashierReports, dateFilteredDrawerTransactions, startDate, endDate]);

  // Unified filtered datasets matching selectedCounterFilter
  const filteredData = selectedCounterFilter === 'all' 
    ? dateFilteredSalesReport 
    : dateFilteredSalesReport.filter(d => d.counter_id === selectedCounterFilter);

  const filteredInventoryReport = selectedCounterFilter === 'all' 
    ? dateFilteredInventoryReport 
    : dateFilteredInventoryReport.filter(r => r.counter_id === selectedCounterFilter);

  const filteredInventory = selectedCounterFilter === 'all' 
    ? dateFilteredInventory 
    : dateFilteredInventory.filter(i => i.counter_id === selectedCounterFilter);

  const filteredBillsForStats = selectedCounterFilter === 'all' 
    ? effectiveBills 
    : effectiveBills.filter(b => b.counter_id === selectedCounterFilter);

  const filteredAmountCollected = selectedCounterFilter === 'all'
    ? dateFilteredAmountCollected
    : dateFilteredAmountCollected.filter(r => r.counter_id === selectedCounterFilter);

  const filteredUnpaidBills = selectedCounterFilter === 'all'
    ? (dateFilteredUnpaidBillsReport || [])
    : (dateFilteredUnpaidBillsReport || []).filter(b => b.counter_id === selectedCounterFilter);

  const filteredMovementReport = selectedCounterFilter === 'all'
    ? (dateFilteredAccessoryMovementReport || [])
    : (dateFilteredAccessoryMovementReport || []).filter(r => r.counter_id === selectedCounterFilter);

  const totalRevenue = filteredData.reduce((sum, r) => sum + r.total_sales, 0);
  const totalAccessoriesSold = filteredData.reduce((sum, r) => sum + r.total_items, 0);
  const totalAuditedBills = filteredBillsForStats.filter(b => b.audit_status === 'audited' || b.audit_status === 'verified').length;
  // Calculate profit if purchase_price is available, else fallback to 0
  const totalProfit = filteredBillsForStats.reduce((sum, b) => {
    const cost = b.items ? b.items.reduce((itemSum, item) => itemSum + (Number(item.accessories?.purchase_price || 0) * Number(item.quantity || 0)), 0) : 0;
    const profit = cost > 0 ? (Number(b.total_amount) - cost) : 0;
    return sum + profit;
  }, 0);

  const totalPendingApprovals = filteredBillsForStats.filter(b => b.approval_status === 'pending').length;
  const totalCashCollectedTL = filteredAmountCollected.reduce((sum, r) => sum + r.total_collected, 0);

  const uniqueCounters = Array.from(new Map(data.map(d => [d.counter_id, d])).values());

  const goNext = () => { setExpandedCounter(null); handleSlideChange((activeSlide + 1) % totalSlides); };
  const goPrev = () => { setExpandedCounter(null); handleSlideChange((activeSlide - 1 + totalSlides) % totalSlides); };

  const handleExportSlide = () => {
    const currentSlideName = slideNames[activeSlide];
    const dateSuffix = startDate || endDate ? `_${startDate || 'start'}_to_${endDate || 'today'}` : '_All_Time';
    
    if (currentSlideName === 'Ledger') {
      const exportData = filteredData.map(r => ({
        'Counter Name': r.counter_name,
        'Total Bills': r.total_bills,
        'Receivable Amt (Debit) ₹': r.total_sales,
        'Outstanding (₹)': r.outstanding,
        'Total Paid (Credit) ₹': r.total_collected,
        'Cash Drawer Balance (₹)': r.drawer_balance || 0
      }));
      exportToExcel(exportData, `Ledger_Report${dateSuffix}`);
    } else if (currentSlideName === 'Revenue Report') {
      const exportData = filteredData.map(r => ({
        'Counter Name': r.counter_name,
        'Total Bills': r.total_bills,
        'Total Items Sold': r.total_items,
        'Revenue Generated (₹)': r.total_sales
      }));
      exportToExcel(exportData, `Revenue_Report${dateSuffix}`);
    } else if (currentSlideName === 'Inventory Report') {
      const exportData = filteredInventoryReport.map(r => ({
        'Counter Name': r.counter_name,
        'Surplus Count': r.surplus_count,
        'Shortage Count': r.shortage_count
      }));
      exportToExcel(exportData, `Inventory_Summary_Report${dateSuffix}`);
    } else if (currentSlideName === 'Amount Collected') {
      const exportData = filteredAmountCollected.map(r => ({
        'Counter Name': r.counter_name,
        'Cash Collected (₹)': r.cash_collected,
        'UPI Collected (₹)': r.upi_collected,
        'Card Collected (₹)': r.card_collected,
        'Bank Transfer Collected (₹)': r.bank_transfer_collected,
        'Total Collected (₹)': r.total_collected
      }));
      exportToExcel(exportData, `Amount_Collected_Report${dateSuffix}`);
    } else if (currentSlideName === 'Team Lead Report' && (dateFilteredTeamLeadReports || teamLeadReports)) {
      const exportData = (dateFilteredTeamLeadReports || teamLeadReports)!.map(r => ({
        'Team Lead': r.team_lead_name,
        'Counters Assigned Count': r.assigned_counters_count,
        'Counters Assigned Names': r.assigned_counters_names.join(', '),
        'Pending Approvals': r.pending_approvals,
        'Approved Approvals': r.approved_approvals,
        'Discount Approved (₹)': r.total_discount_approved,
        'Excess Approved (₹)': r.total_excess_approved
      }));
      exportToExcel(exportData, `Team_Lead_Report${dateSuffix}`);
    } else if (currentSlideName === 'Billing Counter Report' && (dateFilteredBillingCounterReports || billingCounterReports)) {
      const exportData = (dateFilteredBillingCounterReports || billingCounterReports)!.map(r => ({
        'Billing Counter': r.billing_counter_name,
        'Counters Assigned Count': r.assigned_counters_count,
        'Counters Assigned Names': r.assigned_counters_names.join(', '),
        'Pending Bills': r.pending_bills,
        'Closed Bills': r.closed_bills
      }));
      exportToExcel(exportData, `Billing_Counter_Report${dateSuffix}`);
    } else if (currentSlideName === 'Cashier Report' && (dateFilteredCashierReports || cashierReports)) {
      const exportData = (dateFilteredCashierReports || cashierReports)!.map(r => ({
        'Cashier Name': r.cashier_name,
        'Pending Handover (₹)': r.pending_handover,
        'Approved Handover (₹)': r.approved_handover,
        'Drawer Cash Balance (₹)': r.drawer_balance,
        'Total Cash Collected (₹)': r.total_cash_collected
      }));
      exportToExcel(exportData, `Cashier_Report${dateSuffix}`);
    } else if (currentSlideName === 'Auditor Report' && (dateFilteredAuditorReports || auditorReports)) {
      const exportData = (dateFilteredAuditorReports || auditorReports)!.map(r => ({
        'Auditor Name': r.auditor_name,
        'Pending Audits': r.pending_audits,
        'Approved (Forwarded) Audits': r.approved_audits,
        'Total Savings Found (₹)': r.total_savings_found
      }));
      exportToExcel(exportData, `Auditor_Report${dateSuffix}`);
    } else if (currentSlideName === 'Unpaid Bills Report' && filteredUnpaidBills) {
      const exportData = filteredUnpaidBills.map(b => ({
        'Bill Number': b.bill_number,
        'Counter Name': b.profiles?.name || 'Unknown',
        'Customer Name': b.customer_name || 'N/A',
        'Balance Left (₹)': b.amount_left,
        'Total Billed Amount (₹)': b.total_amount
      }));
      exportToExcel(exportData, `Unpaid_Bills_Report${dateSuffix}`);
    } else if (currentSlideName === 'Accessory Movement Report' && filteredMovementReport) {
      const exportData = filteredMovementReport.map(r => ({
        'Counter Name': r.counter_name,
        'Total Purchased/Assigned (In-Count)': r.total_in_count,
        'Total Sold (Out-Count)': r.total_out_count
      }));
      exportToExcel(exportData, `Accessory_Movement_Report${dateSuffix}`);
    }
  };

  const renderSummaryCards = () => {
    const currentSlideName = slideNames[activeSlide];

    if (currentSlideName === 'Ledger') {
      const totalBills = filteredData.reduce((sum, r) => sum + r.total_bills, 0);
      const totalReceivable = filteredData.reduce((sum, r) => sum + r.total_sales, 0);
      const totalOutstanding = filteredData.reduce((sum, r) => sum + r.outstanding, 0);
      const totalPaid = filteredData.reduce((sum, r) => sum + r.total_collected, 0);

      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-xl p-4 shadow-sm flex flex-col justify-center items-start relative overflow-hidden group hover:border-primary/50 transition-colors">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <History className="w-12 h-12 text-primary" />
            </div>
            <p className="text-sm font-semibold text-muted-foreground mb-1">Total Bills</p>
            <p className="text-2xl font-black text-primary">{totalBills.toLocaleString('en-IN')}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 shadow-sm flex flex-col justify-center items-start relative overflow-hidden group hover:border-blue-500/50 transition-colors">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <IndianRupee className="w-12 h-12 text-blue-500" />
            </div>
            <p className="text-sm font-semibold text-muted-foreground mb-1">Receivable Amt (Debit)</p>
            <p className="text-2xl font-black text-blue-600 dark:text-blue-500">₹{totalReceivable.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 shadow-sm flex flex-col justify-center items-start relative overflow-hidden group hover:border-destructive/50 transition-colors">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <IndianRupee className="w-12 h-12 text-destructive" />
            </div>
            <p className="text-sm font-semibold text-muted-foreground mb-1">Outstanding</p>
            <p className="text-2xl font-black text-destructive">₹{totalOutstanding.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 shadow-sm flex flex-col justify-center items-start relative overflow-hidden group hover:border-emerald-500/50 transition-colors">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <IndianRupee className="w-12 h-12 text-emerald-500" />
            </div>
            <p className="text-sm font-semibold text-muted-foreground mb-1">Total Paid (Credit)</p>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-500">₹{totalPaid.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
          </div>
        </div>
      );
    }

    if (currentSlideName === 'Revenue Report') {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-xl p-4 shadow-sm flex flex-col justify-center items-start relative overflow-hidden group hover:border-primary/50 transition-colors">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <IndianRupee className="w-12 h-12 text-primary" />
            </div>
            <p className="text-sm font-semibold text-muted-foreground mb-1">Total Revenue Generated</p>
            <p className="text-2xl font-black text-primary">₹{totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
          </div>
          
          <div className="bg-card border border-border rounded-xl p-4 shadow-sm flex flex-col justify-center items-start relative overflow-hidden group hover:border-orange-500/50 transition-colors">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Package className="w-12 h-12 text-orange-500" />
            </div>
            <p className="text-sm font-semibold text-muted-foreground mb-1">Total Accessories Sold</p>
            <p className="text-2xl font-black text-orange-600 dark:text-orange-500">{totalAccessoriesSold.toLocaleString('en-IN')}</p>
          </div>
          
          {role === 'admin' ? (
            <>
              <div className="bg-card border border-border rounded-xl p-4 shadow-sm flex flex-col justify-center items-start relative overflow-hidden group hover:border-blue-500/50 transition-colors">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <History className="w-12 h-12 text-blue-500" />
                </div>
                <p className="text-sm font-semibold text-muted-foreground mb-1">Total Audited Bills</p>
                <p className="text-2xl font-black text-blue-600 dark:text-blue-500">{totalAuditedBills.toLocaleString('en-IN')}</p>
              </div>
              
              <div className="bg-card border border-border rounded-xl p-4 shadow-sm flex flex-col justify-center items-start relative overflow-hidden group hover:border-emerald-500/50 transition-colors">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <IndianRupee className="w-12 h-12 text-emerald-500" />
                </div>
                <p className="text-sm font-semibold text-muted-foreground mb-1">Total Profit Amount</p>
                <p className="text-2xl font-black text-emerald-600 dark:text-emerald-500">₹{totalProfit.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
                {totalProfit === 0 && (
                  <p className="text-[10px] text-muted-foreground mt-1 absolute bottom-2 right-4">Cost data pending</p>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="bg-card border border-border rounded-xl p-4 shadow-sm flex flex-col justify-center items-start relative overflow-hidden group hover:border-amber-500/50 transition-colors">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Clock className="w-12 h-12 text-amber-500" />
                </div>
                <p className="text-sm font-semibold text-muted-foreground mb-1">Pending Approvals</p>
                <p className="text-2xl font-black text-amber-600 dark:text-amber-500">{totalPendingApprovals.toLocaleString('en-IN')}</p>
              </div>
              
              <div className="bg-card border border-border rounded-xl p-4 shadow-sm flex flex-col justify-center items-start relative overflow-hidden group hover:border-emerald-500/50 transition-colors">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <IndianRupee className="w-12 h-12 text-emerald-500" />
                </div>
                <p className="text-sm font-semibold text-muted-foreground mb-1">Total Cash Collected</p>
                <p className="text-2xl font-black text-emerald-600 dark:text-emerald-500">₹{totalCashCollectedTL.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
              </div>
            </>
          )}
        </div>
      );
    }

    if (currentSlideName === 'Inventory Report') {
      const totalSurplus = filteredInventoryReport.reduce((sum, r) => sum + r.surplus_count, 0);
      const totalShortage = filteredInventoryReport.reduce((sum, r) => sum + r.shortage_count, 0);
      
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-xl p-4 shadow-sm flex flex-col justify-center items-start relative overflow-hidden group hover:border-primary/50 transition-colors">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Package className="w-12 h-12 text-primary" />
            </div>
            <p className="text-sm font-semibold text-muted-foreground mb-1">Total Items Logged</p>
            <p className="text-2xl font-black text-primary">{filteredInventory.reduce((sum, i) => sum + i.quantity, 0).toLocaleString('en-IN')}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 shadow-sm flex flex-col justify-center items-start relative overflow-hidden group hover:border-green-500/50 transition-colors">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Save className="w-12 h-12 text-green-500" />
            </div>
            <p className="text-sm font-semibold text-muted-foreground mb-1">Total Surplus Count</p>
            <p className="text-2xl font-black text-green-600 dark:text-green-500">{totalSurplus.toLocaleString('en-IN')}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 shadow-sm flex flex-col justify-center items-start relative overflow-hidden group hover:border-destructive/50 transition-colors">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <X className="w-12 h-12 text-destructive" />
            </div>
            <p className="text-sm font-semibold text-muted-foreground mb-1">Total Shortage Count</p>
            <p className="text-2xl font-black text-destructive">{totalShortage.toLocaleString('en-IN')}</p>
          </div>
        </div>
      );
    }

    if (currentSlideName === 'Amount Collected') {
      const acReport = filteredAmountCollected;
      const cash = acReport.reduce((sum, r) => sum + r.cash_collected, 0);
      const upi = acReport.reduce((sum, r) => sum + r.upi_collected, 0);
      const card = acReport.reduce((sum, r) => sum + r.card_collected, 0);
      const bank = acReport.reduce((sum, r) => sum + r.bank_transfer_collected, 0);
      
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-xl p-4 shadow-sm flex flex-col justify-center items-start relative overflow-hidden group hover:border-emerald-500/50 transition-colors">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <IndianRupee className="w-12 h-12 text-emerald-500" />
            </div>
            <p className="text-sm font-semibold text-muted-foreground mb-1">Cash Collected</p>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-500">₹{cash.toLocaleString('en-IN')}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 shadow-sm flex flex-col justify-center items-start relative overflow-hidden group hover:border-blue-500/50 transition-colors">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <IndianRupee className="w-12 h-12 text-blue-500" />
            </div>
            <p className="text-sm font-semibold text-muted-foreground mb-1">UPI Collected</p>
            <p className="text-2xl font-black text-blue-600 dark:text-blue-500">₹{upi.toLocaleString('en-IN')}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 shadow-sm flex flex-col justify-center items-start relative overflow-hidden group hover:border-purple-500/50 transition-colors">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <IndianRupee className="w-12 h-12 text-purple-500" />
            </div>
            <p className="text-sm font-semibold text-muted-foreground mb-1">Card Collected</p>
            <p className="text-2xl font-black text-purple-600 dark:text-purple-500">₹{card.toLocaleString('en-IN')}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 shadow-sm flex flex-col justify-center items-start relative overflow-hidden group hover:border-orange-500/50 transition-colors">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <IndianRupee className="w-12 h-12 text-orange-500" />
            </div>
            <p className="text-sm font-semibold text-muted-foreground mb-1">Bank Transfer</p>
            <p className="text-2xl font-black text-orange-600 dark:text-orange-500">₹{bank.toLocaleString('en-IN')}</p>
          </div>
        </div>
      );
    }

    if (currentSlideName === 'Team Lead Report' && (dateFilteredTeamLeadReports || teamLeadReports)) {
      const reports = dateFilteredTeamLeadReports || teamLeadReports || [];
      const totalPending = reports.reduce((sum, r) => sum + r.pending_approvals, 0);
      const totalApproved = reports.reduce((sum, r) => sum + r.approved_approvals, 0);
      const totalDiscount = reports.reduce((sum, r) => sum + r.total_discount_approved, 0);
      const totalExcess = reports.reduce((sum, r) => sum + r.total_excess_approved, 0);
      
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-xl p-4 shadow-sm flex flex-col justify-center items-start relative overflow-hidden group hover:border-amber-500/50 transition-colors">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Clock className="w-12 h-12 text-amber-500" />
            </div>
            <p className="text-sm font-semibold text-muted-foreground mb-1">Pending Approvals</p>
            <p className="text-2xl font-black text-amber-500">{totalPending.toLocaleString('en-IN')}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 shadow-sm flex flex-col justify-center items-start relative overflow-hidden group hover:border-emerald-500/50 transition-colors">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Save className="w-12 h-12 text-emerald-500" />
            </div>
            <p className="text-sm font-semibold text-muted-foreground mb-1">Approved Approvals</p>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-500">{totalApproved.toLocaleString('en-IN')}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 shadow-sm flex flex-col justify-center items-start relative overflow-hidden group hover:border-destructive/50 transition-colors">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <IndianRupee className="w-12 h-12 text-destructive" />
            </div>
            <p className="text-sm font-semibold text-muted-foreground mb-1">Discount Approved</p>
            <p className="text-2xl font-black text-destructive">₹{totalDiscount.toLocaleString('en-IN')}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 shadow-sm flex flex-col justify-center items-start relative overflow-hidden group hover:border-emerald-500/50 transition-colors">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <IndianRupee className="w-12 h-12 text-emerald-500" />
            </div>
            <p className="text-sm font-semibold text-muted-foreground mb-1">Excess Approved</p>
            <p className="text-2xl font-black text-emerald-500">₹{totalExcess.toLocaleString('en-IN')}</p>
          </div>
        </div>
      );
    }
    
    if (currentSlideName === 'Billing Counter Report' && (dateFilteredBillingCounterReports || billingCounterReports)) {
      const reports = dateFilteredBillingCounterReports || billingCounterReports || [];
      const totalPending = reports.reduce((sum, r) => sum + r.pending_bills, 0);
      const totalClosed = reports.reduce((sum, r) => sum + r.closed_bills, 0);
      
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
          <div className="bg-card border border-border rounded-xl p-4 shadow-sm flex flex-col justify-center items-start relative overflow-hidden group hover:border-amber-500/50 transition-colors">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Clock className="w-12 h-12 text-amber-500" />
            </div>
            <p className="text-sm font-semibold text-muted-foreground mb-1">Pending Bills</p>
            <p className="text-2xl font-black text-amber-500">{totalPending.toLocaleString('en-IN')}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 shadow-sm flex flex-col justify-center items-start relative overflow-hidden group hover:border-emerald-500/50 transition-colors">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Save className="w-12 h-12 text-emerald-500" />
            </div>
            <p className="text-sm font-semibold text-muted-foreground mb-1">Closed Bills</p>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-500">{totalClosed.toLocaleString('en-IN')}</p>
          </div>
        </div>
      );
    }
    
    if (currentSlideName === 'Cashier Report' && (dateFilteredCashierReports || cashierReports)) {
      const reports = dateFilteredCashierReports || cashierReports || [];
      const pendingHandover = reports.reduce((sum, r) => sum + r.pending_handover, 0);
      const approvedHandover = reports.reduce((sum, r) => sum + r.approved_handover, 0);
      const drawerBalance = reports.reduce((sum, r) => sum + r.drawer_balance, 0);
      const cashCollected = reports.reduce((sum, r) => sum + r.total_cash_collected, 0);

      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-xl p-4 shadow-sm flex flex-col justify-center items-start relative overflow-hidden group hover:border-amber-500/50 transition-colors">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Clock className="w-12 h-12 text-amber-500" />
            </div>
            <p className="text-sm font-semibold text-muted-foreground mb-1">Pending Handover</p>
            <p className="text-2xl font-black text-amber-500">₹{pendingHandover.toLocaleString('en-IN')}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 shadow-sm flex flex-col justify-center items-start relative overflow-hidden group hover:border-emerald-500/50 transition-colors">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Save className="w-12 h-12 text-emerald-500" />
            </div>
            <p className="text-sm font-semibold text-muted-foreground mb-1">Approved Handover</p>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-500">₹{approvedHandover.toLocaleString('en-IN')}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 shadow-sm flex flex-col justify-center items-start relative overflow-hidden group hover:border-primary/50 transition-colors">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <IndianRupee className="w-12 h-12 text-primary" />
            </div>
            <p className="text-sm font-semibold text-muted-foreground mb-1">Drawer Cash Balance</p>
            <p className="text-2xl font-black text-primary">₹{drawerBalance.toLocaleString('en-IN')}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 shadow-sm flex flex-col justify-center items-start relative overflow-hidden group hover:border-emerald-500/50 transition-colors">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <IndianRupee className="w-12 h-12 text-emerald-500" />
            </div>
            <p className="text-sm font-semibold text-muted-foreground mb-1">Total Cash Collected</p>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-500">₹{cashCollected.toLocaleString('en-IN')}</p>
          </div>
        </div>
      );
    }
    
    if (currentSlideName === 'Auditor Report' && (dateFilteredAuditorReports || auditorReports)) {
      const reports = dateFilteredAuditorReports || auditorReports || [];
      const pendingAudits = reports.reduce((sum, r) => sum + r.pending_audits, 0);
      const approvedAudits = reports.reduce((sum, r) => sum + r.approved_audits, 0);
      const savingsFound = reports.reduce((sum, r) => sum + r.total_savings_found, 0);

      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-xl p-4 shadow-sm flex flex-col justify-center items-start relative overflow-hidden group hover:border-amber-500/50 transition-colors">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Clock className="w-12 h-12 text-amber-500" />
            </div>
            <p className="text-sm font-semibold text-muted-foreground mb-1">Pending Audits</p>
            <p className="text-2xl font-black text-amber-500">{pendingAudits.toLocaleString('en-IN')}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 shadow-sm flex flex-col justify-center items-start relative overflow-hidden group hover:border-emerald-500/50 transition-colors">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Save className="w-12 h-12 text-emerald-500" />
            </div>
            <p className="text-sm font-semibold text-muted-foreground mb-1">Approved (Forwarded)</p>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-500">{approvedAudits.toLocaleString('en-IN')}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 shadow-sm flex flex-col justify-center items-start relative overflow-hidden group hover:border-green-500/50 transition-colors">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <IndianRupee className="w-12 h-12 text-green-500" />
            </div>
            <p className="text-sm font-semibold text-muted-foreground mb-1">Total Savings Found</p>
            <p className="text-2xl font-black text-green-600 dark:text-green-500">₹{savingsFound.toLocaleString('en-IN')}</p>
          </div>
        </div>
      );
    }
    
    if (currentSlideName === 'Unpaid Bills Report' && unpaidBillsReport) {
      const ubReport = filteredUnpaidBills;
      const totalUnpaid = ubReport.length;
      const totalBilled = ubReport.reduce((sum, b) => sum + Number(b.total_amount || 0), 0);
      const totalBalance = ubReport.reduce((sum, b) => {
        const net = (Number(b.amount_left) || 0) + (Number(b.excess_adjustment) || 0) - (Number(b.discount_approved) || 0);
        return sum + Math.abs(net);
      }, 0);
      
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-xl p-4 shadow-sm flex flex-col justify-center items-start relative overflow-hidden group hover:border-amber-500/50 transition-colors">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <History className="w-12 h-12 text-amber-500" />
            </div>
            <p className="text-sm font-semibold text-muted-foreground mb-1">Total Unpaid Bills</p>
            <p className="text-2xl font-black text-amber-500">{totalUnpaid.toLocaleString('en-IN')}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 shadow-sm flex flex-col justify-center items-start relative overflow-hidden group hover:border-primary/50 transition-colors">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <IndianRupee className="w-12 h-12 text-primary" />
            </div>
            <p className="text-sm font-semibold text-muted-foreground mb-1">Total Billed Amount</p>
            <p className="text-2xl font-black text-primary">₹{totalBilled.toLocaleString('en-IN')}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 shadow-sm flex flex-col justify-center items-start relative overflow-hidden group hover:border-rose-500/50 transition-colors">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <IndianRupee className="w-12 h-12 text-rose-500" />
            </div>
            <p className="text-sm font-semibold text-muted-foreground mb-1">Total Net Balance Left</p>
            <p className="text-2xl font-black text-rose-600 dark:text-rose-500">₹{totalBalance.toLocaleString('en-IN')}</p>
          </div>
        </div>
      );
    }
    
    if (currentSlideName === 'Accessory Movement Report' && accessoryMovementReport) {
      const filteredAccReport = filteredMovementReport;
      
      const totalInCount = filteredAccReport.reduce((sum, r) => sum + r.total_in_count, 0);
      const totalOutCount = filteredAccReport.reduce((sum, r) => sum + r.total_out_count, 0);

      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
          <div className="bg-card border border-border rounded-xl p-4 shadow-sm flex flex-col justify-center items-start relative overflow-hidden group hover:border-primary/50 transition-colors">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Package className="w-12 h-12 text-primary" />
            </div>
            <p className="text-sm font-semibold text-muted-foreground mb-1">Total Purchased/Assigned (In-Count)</p>
            <p className="text-2xl font-black text-primary">{totalInCount.toLocaleString('en-IN')}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 shadow-sm flex flex-col justify-center items-start relative overflow-hidden group hover:border-orange-500/50 transition-colors">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Package className="w-12 h-12 text-orange-500" />
            </div>
            <p className="text-sm font-semibold text-muted-foreground mb-1">Total Sold (Out-Count)</p>
            <p className="text-2xl font-black text-orange-600 dark:text-orange-500">{totalOutCount.toLocaleString('en-IN')}</p>
          </div>
        </div>
      );
    }
    
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <ViewHeader title="System Reports" onBack={onBack} icon={BarChart3} />
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
          <button 
            onClick={handleExportSlide}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-500 border border-emerald-200 dark:border-emerald-800/50 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 hover:text-emerald-800 dark:hover:text-emerald-400 text-xs font-bold uppercase tracking-wider rounded-lg transition-all active:scale-95 shadow-sm whitespace-nowrap"
          >
            <Download className="w-4 h-4" /> Export Slide
          </button>
          <div className="w-full sm:w-64">
            <select
              className="w-full px-4 py-2 bg-card border border-border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary text-sm font-medium transition-shadow"
              value={selectedCounterFilter}
              onChange={(e) => setSelectedCounterFilter(e.target.value)}
            >
              <option value="all">All Counters</option>
              {uniqueCounters.map(c => (
                <option key={c.counter_id} value={c.counter_id}>{c.counter_name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {renderSummaryCards()}

      {/* Slider Container */}
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        {/* Slider Header with Navigation */}
        <div className="p-4 sm:p-6 border-b border-border bg-muted/30 flex items-center justify-between">
          <button
            onClick={goPrev}
            className="w-10 h-10 flex items-center justify-center rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-all hover:scale-110 active:scale-95"
            aria-label="Previous report"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="text-center flex-1">
            <h2 className="text-xl font-bold uppercase tracking-wider text-primary">{slideNames[activeSlide]}</h2>
            <div className="flex items-center justify-center gap-2 mt-2">
              {slideNames.map((_, i) => (
                <button
                  key={i}
                  onClick={() => handleSlideChange(i)}
                  className={`h-2 rounded-full transition-all duration-300 ${i === activeSlide ? 'w-8 bg-primary' : 'w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50'}`}
                  aria-label={`Go to ${slideNames[i]}`}
                />
              ))}
            </div>
          </div>
          <button
            onClick={goNext}
            className="w-10 h-10 flex items-center justify-center rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-all hover:scale-110 active:scale-95"
            aria-label="Next report"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>

        {/* Date Range Filter Bar - Visible on every report slide */}
        <div className="border-b border-border bg-muted/20 px-4 py-3 sm:px-6 sm:py-3.5">
          <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-3">
            {/* Quick Presets */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider mr-1">
                <Calendar className="w-3.5 h-3.5 text-primary" />
                <span>Date Range:</span>
              </div>
              
              <div className="inline-flex items-center p-0.5 bg-muted/50 border border-border rounded-lg text-xs">
                <button
                  type="button"
                  onClick={() => handlePreset('all')}
                  className={`px-3 py-1 rounded-md font-semibold transition-all ${
                    activePreset === 'all'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  All Time
                </button>
                <button
                  type="button"
                  onClick={() => handlePreset('today')}
                  className={`px-3 py-1 rounded-md font-semibold transition-all ${
                    activePreset === 'today'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => handlePreset('yesterday')}
                  className={`px-3 py-1 rounded-md font-semibold transition-all ${
                    activePreset === 'yesterday'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Yesterday
                </button>
                <button
                  type="button"
                  onClick={() => handlePreset('7days')}
                  className={`px-3 py-1 rounded-md font-semibold transition-all ${
                    activePreset === '7days'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Last 7 Days
                </button>
                <button
                  type="button"
                  onClick={() => handlePreset('this_month')}
                  className={`px-3 py-1 rounded-md font-semibold transition-all ${
                    activePreset === 'this_month'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  This Month
                </button>
              </div>
            </div>

            {/* Custom Range Inputs & Info */}
            <div className="flex flex-wrap items-center gap-2.5 w-full xl:w-auto justify-between xl:justify-end">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-muted-foreground text-[11px] font-bold uppercase">From:</span>
                  <input
                    type="date"
                    value={startDate}
                    onClick={(e) => { try { e.currentTarget.showPicker?.(); } catch {} }}
                    onChange={(e) => handleDateChange(e.target.value, endDate)}
                    className="px-2.5 py-1 text-xs bg-card border border-border rounded-md text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all shadow-sm cursor-pointer dark:[&::-webkit-calendar-picker-indicator]:invert dark:[&::-webkit-calendar-picker-indicator]:brightness-125 dark:[&::-webkit-calendar-picker-indicator]:cursor-pointer"
                  />
                </div>

                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-muted-foreground text-[11px] font-bold uppercase">To:</span>
                  <input
                    type="date"
                    value={endDate}
                    onClick={(e) => { try { e.currentTarget.showPicker?.(); } catch {} }}
                    onChange={(e) => handleDateChange(startDate, e.target.value)}
                    className="px-2.5 py-1 text-xs bg-card border border-border rounded-md text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all shadow-sm cursor-pointer dark:[&::-webkit-calendar-picker-indicator]:invert dark:[&::-webkit-calendar-picker-indicator]:brightness-125 dark:[&::-webkit-calendar-picker-indicator]:cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                {(startDate || endDate) && (
                  <button
                    type="button"
                    onClick={() => handlePreset('all')}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-destructive hover:bg-destructive/10 border border-destructive/20 rounded-md transition-all active:scale-95"
                    title="Clear date filter"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Clear</span>
                  </button>
                )}

                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 border border-primary/20 text-primary text-xs font-bold rounded-md">
                  <span>{effectiveBills.length} Bills</span>
                  {startDate || endDate ? (
                    <span className="text-[10px] font-normal text-muted-foreground hidden sm:inline">
                      ({startDate || 'Start'} → {endDate || 'Today'})
                    </span>
                  ) : (
                    <span className="text-[10px] font-normal text-muted-foreground hidden sm:inline">(All Time)</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Slides Track */}
        <div className="overflow-hidden">
          <div
            className="flex transition-transform duration-500 ease-in-out"
            style={{ transform: `translateX(-${activeSlide * 100}%)` }}
          >
            {/* Slide 1: Ledger */}
            <div className="w-full flex-shrink-0">
              <div className="px-4 sm:px-6 pt-4 pb-2">
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <History className="w-4 h-4 text-primary" />
                  Click a counter to view all their bills.
                </p>
              </div>
              <DataTable<SalesReport> idAccessor="counter_id" data={filteredData} onRowClick={onCounterClick} columns={[
                { header: 'Counter Name', accessor: 'counter_name', sortAccessor: 'counter_name', className: 'text-left font-semibold text-primary group-hover:underline' },
                { header: 'Total Bills', accessor: 'total_bills', sortAccessor: 'total_bills', className: 'text-center' },
                { header: 'Receivable Amt (Debit) ₹', accessor: (r) => `₹${r.total_sales.toFixed(2)}`, sortAccessor: 'total_sales', className: 'text-right font-medium' },
                { header: 'Outstanding (₹)', accessor: (r) => <span className="text-destructive font-medium">₹{r.outstanding.toFixed(2)}</span>, sortAccessor: 'outstanding', className: 'text-right' },
                { header: 'Total Paid (Credit) ₹', accessor: (r) => <span className="text-green-600 dark:text-green-400 font-bold">₹{r.total_collected.toFixed(2)}</span>, sortAccessor: 'total_collected', className: 'text-right' },
                { header: 'Cash Drawer Balance (₹)', accessor: (r) => <span className="text-indigo-600 dark:text-indigo-400 font-bold">₹{(r.drawer_balance || 0).toFixed(2)}</span>, sortAccessor: 'drawer_balance', className: 'text-right' }
              ]} />
            </div>

            {/* Slide 2: Revenue Report */}
            <div className="w-full flex-shrink-0">
              <div className="px-4 sm:px-6 pt-4 pb-2">
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <IndianRupee className="w-4 h-4 text-green-600" />
                  Detailed revenue and item sales performance.
                </p>
              </div>
              <DataTable<SalesReport>
                idAccessor="counter_id"
                data={filteredData}
                columns={[
                  { header: 'Counter Name', accessor: 'counter_name', sortAccessor: 'counter_name', className: 'text-left font-semibold' },
                  { header: 'Total Bills', accessor: 'total_bills', sortAccessor: 'total_bills', className: 'text-center' },
                  { header: 'Total Items Sold', accessor: 'total_items', sortAccessor: 'total_items', className: 'text-center font-medium text-primary' },
                  { header: 'Revenue Generated', accessor: (r) => `₹${r.total_sales.toLocaleString()}`, sortAccessor: 'total_sales', className: 'text-right font-bold text-green-600' }
                ]}
              />
            </div>

            {/* Slide 3: Inventory Report */}
            <div className="w-full flex-shrink-0">
              <div className="px-4 sm:px-6 pt-4 pb-2">
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Package className="w-4 h-4 text-orange-500" />
                  Click a counter to expand its stock status.
                </p>
              </div>

              <div className="mt-2 divide-y divide-border border-t border-border">
                {filteredInventoryReport.map((r) => {
                  const isExpanded = expandedCounter === r.counter_id;
                  const counterInv = filteredInventory.filter(i => i.counter_name === r.counter_name);
                  const surplus = counterInv.filter(i => i.quantity > 5);
                  const shortage = counterInv.filter(i => i.quantity <= 5);

                  return (
                    <div key={r.counter_id} className="group">
                      {/* Counter Row */}
                      <div
                        onClick={() => setExpandedCounter(isExpanded ? null : r.counter_id)}
                        className={`flex items-center justify-between px-6 py-4 cursor-pointer transition-colors ${isExpanded ? 'bg-primary/5' : 'hover:bg-muted/50'}`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${isExpanded ? 'bg-primary text-white rotate-90' : 'bg-muted text-muted-foreground'}`}>
                            <ChevronRight className="w-5 h-5" />
                          </div>
                          <span className="font-bold text-lg">{r.counter_name}</span>
                        </div>

                        <div className="flex items-center gap-6">
                          <div className="text-center">
                            <div className="text-[10px] uppercase font-bold text-muted-foreground mb-0.5">Surplus</div>
                            <Badge variant="success">{r.surplus_count}</Badge>
                          </div>
                          <div className="text-center">
                            <div className="text-[10px] uppercase font-bold text-muted-foreground mb-0.5">Shortage</div>
                            <Badge variant="danger">{r.shortage_count}</Badge>
                          </div>
                        </div>
                      </div>

                      {/* Expanded Content */}
                      <div className={`overflow-hidden transition-all duration-500 ease-in-out ${isExpanded ? 'max-h-[800px] border-b border-border bg-muted/20' : 'max-h-0'}`}>
                        <div className="px-6 pt-4 flex justify-end">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const exportData = [
                                ...shortage.map(i => ({ 'Accessory Name': i.name, 'Model': i.vehicle_model, 'Quantity': i.quantity, 'Status': 'Shortage' })),
                                ...surplus.map(i => ({ 'Accessory Name': i.name, 'Model': i.vehicle_model, 'Quantity': i.quantity, 'Status': 'Surplus' }))
                              ];
                              if (exportData.length > 0) exportToExcel(exportData, `Counter_${r.counter_name.replace(/\s+/g, '_')}_Stock_Report`);
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-500 border border-emerald-200 dark:border-emerald-800/50 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 hover:text-emerald-800 dark:hover:text-emerald-400 text-[10px] font-bold uppercase tracking-wider rounded transition-all active:scale-95 shadow-sm whitespace-nowrap"
                          >
                            <Download className="w-3 h-3" /> Export Stock
                          </button>
                        </div>
                        <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-2 duration-500 pt-2">
                          {/* Shortage Section */}
                          <div className="space-y-3">
                            <h4 className="text-xs font-black uppercase tracking-widest text-destructive flex items-center gap-2">
                              <X className="w-3 h-3" /> Shortage ({" <= 5"})
                            </h4>
                            <div className="bg-card rounded-lg border border-destructive/10 overflow-hidden shadow-sm">
                              <table className="w-full text-xs">
                                <thead className="bg-destructive/5 text-destructive font-bold border-b border-destructive/10">
                                  <tr>
                                    <th className="px-3 py-2 text-left">Model</th>
                                    <th className="px-3 py-2 text-left">Accessory</th>
                                    <th className="px-3 py-2 text-right">Qty</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                  {shortage.map(i => (
                                    <tr key={i.id} className="hover:bg-destructive/5 transition-colors">
                                      <td className="px-3 py-2 font-medium">{i.vehicle_model}</td>
                                      <td className="px-3 py-2">{i.name}</td>
                                      <td className="px-3 py-2 text-right font-bold text-destructive">{i.quantity}</td>
                                    </tr>
                                  ))}
                                  {shortage.length === 0 && <tr><td colSpan={3} className="px-3 py-4 text-center text-muted-foreground">No shortages</td></tr>}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          {/* Surplus Section */}
                          <div className="space-y-3">
                            <h4 className="text-xs font-black uppercase tracking-widest text-green-600 flex items-center gap-2">
                              <Save className="w-3 h-3" /> Surplus ({" > 5"})
                            </h4>
                            <div className="bg-card rounded-lg border border-green-600/10 overflow-hidden shadow-sm">
                              <table className="w-full text-xs">
                                <thead className="bg-green-600/5 text-green-600 font-bold border-b border-green-600/10">
                                  <tr>
                                    <th className="px-3 py-2 text-left">Model</th>
                                    <th className="px-3 py-2 text-left">Accessory</th>
                                    <th className="px-3 py-2 text-right">Qty</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                  {surplus.map(i => (
                                    <tr key={i.id} className="hover:bg-green-600/5 transition-colors">
                                      <td className="px-3 py-2 font-medium">{i.vehicle_model}</td>
                                      <td className="px-3 py-2">{i.name}</td>
                                      <td className="px-3 py-2 text-right font-bold text-green-600">{i.quantity}</td>
                                    </tr>
                                  ))}
                                  {surplus.length === 0 && <tr><td colSpan={3} className="px-3 py-4 text-center text-muted-foreground">No surplus items</td></tr>}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Slide 4: Amount Collected Report */}
            <div className="w-full flex-shrink-0">
              <div className="px-4 sm:px-6 pt-4 pb-2">
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <IndianRupee className="w-4 h-4 text-primary" />
                  Detailed payment collection breakdown by counter.
                </p>
              </div>
              <DataTable<AmountCollectedReport>
                idAccessor="counter_id"
                data={filteredAmountCollected}
                onRowClick={(r) => setSelectedAmountReport(r)}
                columns={[
                  { header: 'Counter Name', accessor: 'counter_name', sortAccessor: 'counter_name', className: 'text-left font-semibold text-primary group-hover:underline cursor-pointer' },
                  { header: 'Cash Collected (₹)', accessor: (r) => `₹${r.cash_collected.toLocaleString()}`, sortAccessor: 'cash_collected', className: 'text-right font-medium text-emerald-600' },
                  { header: 'UPI (₹)', accessor: (r) => `₹${r.upi_collected.toLocaleString()}`, sortAccessor: 'upi_collected', className: 'text-right' },
                  { header: 'Card (₹)', accessor: (r) => `₹${r.card_collected.toLocaleString()}`, sortAccessor: 'card_collected', className: 'text-right' },
                  { header: 'Bank Transfer (₹)', accessor: (r) => `₹${r.bank_transfer_collected.toLocaleString()}`, sortAccessor: 'bank_transfer_collected', className: 'text-right' },
                  { header: 'Total (₹)', accessor: (r) => `₹${r.total_collected.toLocaleString()}`, sortAccessor: 'total_collected', className: 'text-right font-bold text-primary' }
                ]}
              />
            </div>
            
            {/* Slide 5: Team Lead Report */}
            {(dateFilteredTeamLeadReports || teamLeadReports) && (
              <div className="w-full flex-shrink-0">
                <div className="px-4 sm:px-6 pt-4 pb-2">
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-500" />
                    Overview of team leads and their assigned counters.
                  </p>
                </div>
                <DataTable<TeamLeadReport>
                  idAccessor="team_lead_id"
                  data={dateFilteredTeamLeadReports || teamLeadReports || []}
                  onRowClick={onTeamLeadClick}
                  columns={[
                    { header: 'Team Lead', accessor: 'team_lead_name', sortAccessor: 'team_lead_name', className: 'text-left font-bold text-primary uppercase text-xs tracking-wider' },
                    { header: 'Counters Assigned', accessor: (r) => (
                      <div className="flex flex-col gap-1">
                        <span className="font-bold">{r.assigned_counters_count}</span>
                        <span className="text-[10px] text-muted-foreground">{r.assigned_counters_names.join(', ')}</span>
                      </div>
                    ), sortAccessor: 'assigned_counters_count', className: 'text-left' },
                    { header: 'Pending Approvals', accessor: (r) => <span className="text-amber-500 font-bold">{r.pending_approvals}</span>, sortAccessor: 'pending_approvals', className: 'text-right' },
                    { header: 'Approved Approvals', accessor: (r) => <span className="text-emerald-600 font-bold">{r.approved_approvals}</span>, sortAccessor: 'approved_approvals', className: 'text-right' },
                    { header: 'Discount Approved', accessor: (r) => <span className="text-destructive font-medium">₹{r.total_discount_approved.toLocaleString('en-IN')}</span>, sortAccessor: 'total_discount_approved', className: 'text-right' },
                    { header: 'Excess Approved', accessor: (r) => <span className="text-emerald-500 font-medium">₹{r.total_excess_approved.toLocaleString('en-IN')}</span>, sortAccessor: 'total_excess_approved', className: 'text-right' }
                  ]}
                />
              </div>
            )}
            
            {/* Slide 5.5: Billing Counter Report */}
            {(dateFilteredBillingCounterReports || billingCounterReports) && (
              <div className="w-full flex-shrink-0">
                <div className="px-4 sm:px-6 pt-4 pb-2">
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Users className="w-4 h-4 text-purple-500" />
                    Overview of billing counters and their bill closures.
                  </p>
                </div>
                <DataTable<BillingCounterReport>
                  idAccessor="billing_counter_id"
                  data={dateFilteredBillingCounterReports || billingCounterReports || []}
                  columns={[
                    { header: 'Billing Counter', accessor: 'billing_counter_name', sortAccessor: 'billing_counter_name', className: 'text-left font-bold text-primary uppercase text-xs tracking-wider' },
                    { header: 'Counters Assigned', accessor: (r) => (
                      <div className="flex flex-col gap-1">
                        <span className="font-bold">{r.assigned_counters_count}</span>
                        <span className="text-[10px] text-muted-foreground">{r.assigned_counters_names.join(', ')}</span>
                      </div>
                    ), sortAccessor: 'assigned_counters_count', className: 'text-left' },
                    { header: 'Pending Bills', accessor: (r) => <span className="text-amber-500 font-bold">{r.pending_bills}</span>, sortAccessor: 'pending_bills', className: 'text-right' },
                    { header: 'Closed Bills', accessor: (r) => <span className="text-emerald-600 font-bold">{r.closed_bills}</span>, sortAccessor: 'closed_bills', className: 'text-right' }
                  ]}
                />
              </div>
            )}
            
            {/* Slide 6: Cashier Report */}
            {(dateFilteredCashierReports || cashierReports) && onCashierClick && (
              <div className="w-full flex-shrink-0">
                <div className="px-4 sm:px-6 pt-4 pb-2">
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <IndianRupee className="w-4 h-4 text-emerald-600" />
                    Detailed cashier drawer balances and handovers.
                  </p>
                </div>
                <DataTable<CashierReport>
                  idAccessor="cashier_id"
                  data={dateFilteredCashierReports || cashierReports || []}
                  onRowClick={onCashierClick}
                  columns={[
                    { header: 'Cashier Name', accessor: 'cashier_name', sortAccessor: 'cashier_name', className: 'text-left font-bold text-primary uppercase text-xs tracking-wider' },
                    { header: 'Pending Handover', accessor: (r) => <span className="text-amber-500 font-medium">₹{r.pending_handover.toLocaleString()}</span>, sortAccessor: 'pending_handover', className: 'text-right' },
                    { header: 'Approved Handover', accessor: (r) => <span className="text-emerald-600 dark:text-emerald-400 font-medium">₹{r.approved_handover.toLocaleString()}</span>, sortAccessor: 'approved_handover', className: 'text-right' },
                    { header: 'Drawer Cash Balance', accessor: (r) => <span className="font-medium text-foreground">₹{r.drawer_balance.toLocaleString()}</span>, sortAccessor: 'drawer_balance', className: 'text-right' },
                    { header: 'Total Cash Collected', accessor: (r) => <span className="font-black text-primary">₹{r.total_cash_collected.toLocaleString()}</span>, sortAccessor: 'total_cash_collected', className: 'text-right' }
                  ]}
                />
              </div>
            )}

            {/* Slide 7: Auditor Report */}
            {(dateFilteredAuditorReports || auditorReports) && onAuditorClick && (
              <div className="w-full flex-shrink-0">
                <div className="px-4 sm:px-6 pt-4 pb-2">
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <History className="w-4 h-4 text-purple-600" />
                    Overview of auditor metrics and savings found.
                  </p>
                </div>
                <DataTable<any>
                  idAccessor="auditor_id"
                  data={dateFilteredAuditorReports || auditorReports || []}
                  onRowClick={onAuditorClick}
                  columns={[
                    { header: 'Auditor Name', accessor: 'auditor_name', sortAccessor: 'auditor_name', className: 'text-left font-bold text-primary uppercase text-xs tracking-wider' },
                    { header: 'Pending Audits', accessor: (r) => <span className="text-amber-500 font-medium">{r.pending_audits}</span>, sortAccessor: 'pending_audits', className: 'text-right' },
                    { header: 'Approved (Forwarded)', accessor: (r) => <span className="text-emerald-600 font-medium">{r.approved_audits}</span>, sortAccessor: 'approved_audits', className: 'text-right' },
                    { header: 'Total Savings Found', accessor: (r) => <span className="font-black text-green-600">₹{r.total_savings_found.toLocaleString()}</span>, sortAccessor: 'total_savings_found', className: 'text-right font-bold' }
                  ]}
                />
              </div>
            )}

            {unpaidBillsReport && onViewUnpaidBill && (
              <div className="w-full flex-shrink-0">
                <div className="px-4 sm:px-6 pt-4 pb-2">
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <History className="w-4 h-4 text-rose-600" />
                    Overview of audited bills with a pending balance.
                  </p>
                </div>
                <DataTable<CounterBill>
                  idAccessor="id"
                  data={filteredUnpaidBills}
                  columns={[
                    { header: 'Bill Number', accessor: 'bill_number', sortAccessor: 'bill_number', className: 'text-left font-bold text-primary uppercase text-xs tracking-wider' },
                    { header: 'Counter Name', accessor: (r) => r.profiles?.name || 'Unknown', sortAccessor: 'counter_id', className: 'text-left' },
                    { header: 'Customer', accessor: (r) => r.customer_name || 'N/A', sortAccessor: 'customer_name', className: 'text-left' },
                    { header: 'Net Balance Off', accessor: (r) => {
                        const net = (Number(r.amount_left) || 0) + (Number(r.excess_adjustment) || 0) - (Number(r.discount_approved) || 0);
                        return <span className={`font-black ${net > 0 ? 'text-rose-600' : 'text-blue-600'}`}>{net > 0 ? '+' : net < 0 ? '-' : ''}₹{Math.abs(net).toLocaleString()}</span>;
                      }, 
                      sortAccessor: 'amount_left', className: 'text-right' 
                    },
                    { header: 'Total Amount', accessor: (r) => <span className="font-black text-primary">₹{r.total_amount.toLocaleString()}</span>, sortAccessor: 'total_amount', className: 'text-right' },
                    { header: 'Action', accessor: (r) => (
                      <button 
                        onClick={(e) => { e.stopPropagation(); onViewUnpaidBill(r); }}
                        className="px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 rounded-md font-bold text-[10px] uppercase tracking-wider transition-colors inline-block"
                      >
                        VIEW BILL
                      </button>
                    ), className: 'text-center' }
                  ]}
                  pageSize={10}
                />
              </div>
            )}

            {/* Slide 9: Accessory Movement Report */}
            {accessoryMovementReport && onMovementClick && (
              <div className="w-full flex-shrink-0">
                <div className="px-4 sm:px-6 pt-4 pb-2">
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Package className="w-4 h-4 text-primary" />
                    Overview of assigned stock and units sold per counter. Click to view breakdown.
                  </p>
                </div>
                <DataTable<AccessoryMovementReport>
                  idAccessor="counter_id"
                  data={filteredMovementReport}
                  onRowClick={onMovementClick}
                  columns={[
                    { header: 'Counter Name', accessor: 'counter_name', sortAccessor: 'counter_name', className: 'text-left font-bold text-primary uppercase text-xs tracking-wider' },
                    { header: 'Total Purchased/Assigned (In-Count)', accessor: (r) => <span className="font-medium">{r.total_in_count.toLocaleString('en-IN')}</span>, sortAccessor: 'total_in_count', className: 'text-right text-primary font-bold' },
                    { header: 'Total Sold (Out-Count)', accessor: (r) => <span className="font-black text-orange-600 dark:text-orange-500">{r.total_out_count.toLocaleString('en-IN')}</span>, sortAccessor: 'total_out_count', className: 'text-right' }
                  ]}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedAmountReport && (
        <AmountCollectedDialog
          report={selectedAmountReport}
          onClose={() => setSelectedAmountReport(null)}
        />
      )}
    </div>
  );
};
