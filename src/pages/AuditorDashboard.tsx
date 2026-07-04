import { useState } from 'react';
import { useAuditorData } from '../hooks/useAuditorData';
import { useAuth } from '../components/auth-provider';
import { ClipboardCheck, Printer, Edit, Check, X } from 'lucide-react';
import { BillReceipt } from '../components/dashboard/BillReceipt';
import type { CounterBill } from '../hooks/useAdminData';
import { AuditDetailsDialog } from '../components/dashboard/sub-views/auditor/AuditDetailsDialog';
import { AuditedBillCard } from '../components/dashboard/sub-views/auditor/AuditedBillCard';

export function AuditorDashboard() {
  const { profile } = useAuth();
  const { 
    bills,
    pendingAudits,
    forwardedAudits,
    revertedAudits,
    teamLeads,
    assignedCounters,
    loading,
    saveAuditDetails,
    revertBillToTeamLead
  } = useAuditorData();

  const [activeTab, setActiveTab] = useState<'pending' | 'forwarded' | 'reverted'>('pending');
  const [selectedBillForAudit, setSelectedBillForAudit] = useState<CounterBill | null>(null);
  const [generatedBill, setGeneratedBill] = useState<CounterBill | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  
  // New States for Redesign
  const [showTlDialog, setShowTlDialog] = useState(false);
  const [selectedCounters, setSelectedCounters] = useState<string[]>([]);

  const filteredPending = pendingAudits.filter(b => selectedCounters.length === 0 || (b.counter_id && selectedCounters.includes(b.counter_id)));
  const filteredForwarded = forwardedAudits.filter(b => selectedCounters.length === 0 || (b.counter_id && selectedCounters.includes(b.counter_id)));
  const filteredReverted = revertedAudits.filter(b => selectedCounters.length === 0 || (b.counter_id && selectedCounters.includes(b.counter_id)));

  const displayBills = activeTab === 'pending' ? filteredPending : activeTab === 'forwarded' ? filteredForwarded : filteredReverted;

  const toggleCounter = (id: string) => {
    setSelectedCounters(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col items-center justify-center py-2 space-y-1 mt-2">
        <div className="flex items-center gap-2 text-primary/60">
          <ClipboardCheck className="w-5 h-5" />
          <span className="text-xs font-black uppercase tracking-[0.2em]">Auditor Dashboard</span>
        </div>
        <h1 className="text-3xl font-black uppercase tracking-tight text-center">
          Welcome, <span className="text-primary">{profile?.name || 'Auditor'}</span>
        </h1>
        <p className="text-muted-foreground text-sm font-medium uppercase tracking-widest mt-2">
          Managing {assignedCounters?.length || 0} Counters
        </p>
        <div className="w-16 h-1.5 bg-primary rounded-full mt-4" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
        {/* ASSIGNED BILLING DESKS / TEAM LEADS */}
        <div 
          onClick={() => setShowTlDialog(true)}
          className="bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col justify-center cursor-pointer hover:bg-muted/50 transition-colors group"
        >
          <span className="text-muted-foreground text-[10px] font-bold tracking-widest uppercase block mb-2 group-hover:text-foreground transition-colors">Assigned Team Leads</span>
          <span className="font-bold text-2xl text-foreground">{teamLeads?.length || 0}</span>
        </div>
        
        {/* TOTAL AUDITS */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col justify-center">
          <span className="text-muted-foreground text-[10px] font-bold tracking-widest uppercase block mb-2">Total Audits Received</span>
          <span className="font-bold text-2xl text-primary">{bills.length}</span>
        </div>

        {/* PENDING REVIEW */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col justify-center">
          <span className="text-muted-foreground text-[10px] font-bold tracking-widest uppercase block mb-2">Pending Review</span>
          <span className="font-bold text-2xl text-amber-500">{pendingAudits.length}</span>
        </div>

        {/* FORWARDED TO ADMIN */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col justify-center">
          <span className="text-muted-foreground text-[10px] font-bold tracking-widest uppercase block mb-2">Forwarded to Admin</span>
          <span className="font-bold text-2xl text-emerald-500">{forwardedAudits.length}</span>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* LEFT SIDEBAR: Select Counter Operators */}
        <div className="w-full lg:w-80 shrink-0">
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col sticky top-6">
            <h3 className="text-foreground text-xs font-bold tracking-widest uppercase mb-2">Select Counter Operators</h3>
            <p className="text-muted-foreground text-xs mb-6">Select one or more assigned counter operators to view and audit their bills.</p>
            
            <div className="flex justify-between items-center mb-4 text-[10px] font-bold">
              <button 
                onClick={() => setSelectedCounters([])} 
                className="text-primary hover:text-primary/80 uppercase tracking-widest transition-colors"
              >
                Clear to Single
              </button>
              <span className="text-muted-foreground uppercase tracking-widest">{selectedCounters.length || 1} / {assignedCounters?.length || 0} Selected</span>
            </div>
            
            <div className="space-y-3">
              {assignedCounters?.map(c => {
                const isSelected = selectedCounters.includes(c.id);
                return (
                  <div 
                    key={c.id} 
                    onClick={() => toggleCounter(c.id)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all flex justify-between items-center ${
                      isSelected 
                        ? 'bg-primary/10 border-primary/30 text-primary shadow-sm' 
                        : 'bg-muted/30 border-border text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    <span className="text-sm font-medium">{c.name}</span>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${
                      isSelected ? 'bg-primary' : 'bg-muted border border-border'
                    }`}>
                      {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                    </div>
                  </div>
                );
              })}
              {(!assignedCounters || assignedCounters.length === 0) && (
                <div className="text-muted-foreground text-sm text-center py-4">No counters assigned.</div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT CONTENT: Bills Queue */}
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="mb-6 flex flex-col gap-4 border-b border-border pb-0">
            <div className="flex justify-between items-end">
              <div>
                <h3 className="text-muted-foreground text-[10px] font-bold tracking-widest uppercase mb-3">Receipts Auditing Queue</h3>
                <div className="flex gap-8">
                  <button
                    onClick={() => setActiveTab('pending')}
                    className={`text-sm font-bold tracking-wide transition-all relative pb-2 ${
                      activeTab === 'pending' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Pending Audit ({filteredPending.length})
                    {activeTab === 'pending' && <div className="absolute -bottom-px left-0 w-full h-0.5 bg-primary" />}
                  </button>
                  <button
                    onClick={() => setActiveTab('forwarded')}
                    className={`text-sm font-bold tracking-wide transition-all relative pb-2 ${
                      activeTab === 'forwarded' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Forwarded to Admin ({filteredForwarded.length})
                    {activeTab === 'forwarded' && <div className="absolute -bottom-px left-0 w-full h-0.5 bg-foreground" />}
                  </button>
                  <button
                    onClick={() => setActiveTab('reverted')}
                    className={`text-sm font-bold tracking-wide transition-all relative pb-2 ${
                      activeTab === 'reverted' ? 'text-red-500' : 'text-muted-foreground hover:text-red-500'
                    }`}
                  >
                    Reverted By Admin ({filteredReverted.length})
                    {activeTab === 'reverted' && <div className="absolute -bottom-px left-0 w-full h-0.5 bg-red-500" />}
                  </button>
                </div>
              </div>
              <div className="text-muted-foreground text-xs font-bold bg-muted px-4 py-1.5 rounded-full mb-3">
                Total {displayBills.length} bills
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {displayBills.length === 0 ? (
              <div className="xl:col-span-2 text-center py-12 bg-card border border-border rounded-2xl shadow-sm">
                <ClipboardCheck className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground font-medium tracking-wide">No bills found in this queue.</p>
              </div>
            ) : (
              displayBills.map((bill) => (
                (activeTab === 'pending' || activeTab === 'reverted') ? (
                  <div key={bill.id} className="bg-card border border-border rounded-xl p-4 shadow-sm flex flex-col gap-3 text-foreground transition-all hover:border-primary/50 hover:shadow-md">
                    {/* Header row */}
                    <div className="flex justify-between items-start">
                      <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.1em] rounded-full border ${activeTab === 'reverted' ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-500 border-red-200 dark:border-red-900/50' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-500 border-yellow-200 dark:border-yellow-900/50'}`}>
                        {activeTab === 'reverted' ? 'REVERTED BY ADMIN' : 'PENDING REVIEW'}
                      </span>
                      <div className="text-right">
                        <span className="text-muted-foreground text-[9px] font-bold tracking-widest uppercase block mb-0.5">Billed Amount</span>
                        <span className="font-bold text-xl text-foreground">₹{(bill.total_amount || 0).toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Title & Mode */}
                    <div className="flex justify-between items-end mt-0">
                      <h3 className="font-bold text-lg text-foreground tracking-wide">
                        {(!bill.vehicle_model || bill.vehicle_model.trim() === '-') ? `INVOICE: ${bill.bill_number}` : bill.vehicle_model.toUpperCase()}
                      </h3>
                      <span className="text-muted-foreground text-[9px] font-mono uppercase tracking-widest text-right">
                        MODE: {(() => {
                          let methods: any[] = [];
                          if (bill.items && bill.items.length > 0 && bill.items[0].payment_details) {
                            methods = bill.items[0].payment_details;
                          } else if (bill.payment_details) {
                            methods = bill.payment_details;
                          } else if (bill.payment_method) {
                            methods = [{ method: bill.payment_method }];
                          }
                          const uniqueMethods = Array.from(new Set(methods.map(m => m.method || 'UNKNOWN')));
                          return uniqueMethods.join(', ') || 'UNKNOWN';
                        })()}
                      </span>
                    </div>

                    {/* Details List */}
                    <div className="grid grid-cols-2 gap-y-1.5 gap-x-2 text-[11px] font-mono mt-1">
                      <div className="col-span-2 text-primary font-bold">Receipt No: {bill.bill_number}</div>
                      <div className="text-muted-foreground truncate">Chassis: <span className="text-foreground">{bill.chassis_number || 'N/A'}</span></div>
                      <div className="text-muted-foreground truncate">Customer: <span className="text-foreground font-semibold">{bill.customer_name?.toUpperCase() || 'N/A'}</span></div>
                      <div className="text-muted-foreground truncate">Counter: <span className="text-foreground font-semibold">{bill.profiles?.name?.toUpperCase() || 'UNKNOWN'}</span></div>
                      <div className="text-muted-foreground truncate">Closed: <span className="text-foreground">{new Date(bill.created_at).toLocaleDateString()}</span></div>
                    </div>

                    {/* Dark gray box for breakdown */}
                    <div className="bg-muted/50 rounded-lg p-2.5 text-xs flex flex-wrap gap-4 text-muted-foreground mt-1 border border-border">
                      <span>Ex: <span className="text-foreground font-semibold">₹{(bill.base_amount || 0).toLocaleString()}</span></span>
                      <span>CGST: <span className="text-foreground font-semibold">₹{(bill.cgst_amount || 0).toLocaleString()}</span></span>
                      <span>SGST: <span className="text-foreground font-semibold">₹{(bill.sgst_amount || 0).toLocaleString()}</span></span>
                    </div>

                    {/* Divider line */}
                    <hr className="border-border my-1" />

                    {/* Buttons */}
                    <div className="flex justify-center gap-2">
                      <button 
                        onClick={() => { setGeneratedBill(bill); setShowReceipt(true); }} 
                        className="flex-1 py-1.5 bg-transparent border border-border text-foreground hover:bg-muted rounded-lg font-bold text-[10px] uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5"
                        title="View Invoice"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => setSelectedBillForAudit(bill)} 
                        className={`${activeTab === 'reverted' ? 'flex-1' : 'flex-[2]'} py-1.5 bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 rounded-lg font-bold text-[10px] uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5`}
                      >
                        <Edit className="w-3.5 h-3.5" /> AUDIT
                      </button>
                      {activeTab === 'reverted' && (
                        <button 
                          onClick={() => {
                            if (confirm(`Revert bill ${bill.bill_number} to Team Lead?`)) {
                              revertBillToTeamLead(bill.id);
                            }
                          }} 
                          className="flex-1 py-1.5 bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20 rounded-lg font-bold text-[10px] uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5"
                          title="Revert to Team Lead"
                        >
                          <X className="w-3.5 h-3.5" /> REVERT
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <AuditedBillCard key={bill.id} bill={bill} onViewInvoice={() => { setGeneratedBill(bill); setShowReceipt(true); }} />
                )
              ))
            )}
          </div>
        </div>
      </div>

      {showReceipt && generatedBill && (
        <div className="fixed inset-0 z-[100] bg-white overflow-y-auto">
          <BillReceipt bill={generatedBill as any} onClose={() => { setShowReceipt(false); setGeneratedBill(null); }} />
        </div>
      )}

      {selectedBillForAudit && (
        <AuditDetailsDialog 
          bill={selectedBillForAudit} 
          onClose={() => setSelectedBillForAudit(null)} 
          onSave={saveAuditDetails} 
        />
      )}

      {/* Team Leads Dialog */}
      {showTlDialog && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="text-foreground font-bold tracking-wide uppercase">Assigned Team Leads</h2>
              <button 
                onClick={() => setShowTlDialog(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5">
              {teamLeads && teamLeads.length > 0 ? (
                <ul className="space-y-2">
                  {teamLeads.map(tl => (
                    <li key={tl.id} className="p-3 bg-muted/30 border border-border rounded-xl text-foreground font-medium">
                      {tl.name}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-center text-muted-foreground py-4">No team leads assigned.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
