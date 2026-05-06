import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { Upload, Users, Package, FileSpreadsheet, ArrowLeft, BarChart3, ChevronRight, Car } from 'lucide-react';
import * as XLSX from 'xlsx';

type Counter = { id: string; name: string };
type InventoryItem = { id: string; counter_name: string; vehicle_model: string; name: string; quantity: number; price: number };
type LoginDetail = { user_id: string; name: string; login_count: number };
type SalesReport = { counter_id: string; counter_name: string; total_bills: number; total_sales: number; total_collected: number; outstanding: number };
type ModelAccessory = { name: string; counter_name: string; quantity: number; price: number };
type CounterBill = { id: string; created_at: string; accessory_name: string; vehicle_model: string; quantity: number; total_amount: number; payment_method: string; amount_paid: number; amount_left: number };
type ActiveView = 'dashboard' | 'logins' | 'models' | 'model-detail' | 'reports' | 'counter-bills' | 'report-model';

export function AdminDashboard() {
  const [stats, setStats] = useState({ uniqueLogins: 0, items: 0, models: 0 });
  const [counters, setCounters] = useState<Counter[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [selectedCounterId, setSelectedCounterId] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // New states
  const [activeView, setActiveView] = useState<ActiveView>('dashboard');
  const [loginDetails, setLoginDetails] = useState<LoginDetail[]>([]);
  const [vehicleModels, setVehicleModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [modelAccessories, setModelAccessories] = useState<ModelAccessory[]>([]);
  const [salesReport, setSalesReport] = useState<SalesReport[]>([]);
  const [counterBills, setCounterBills] = useState<CounterBill[]>([]);
  const [selectedCounterName, setSelectedCounterName] = useState('');
  const [reportModelAccessories, setReportModelAccessories] = useState<InventoryItem[]>([]);
  const [selectedReportModel, setSelectedReportModel] = useState('');

  useEffect(() => {
    fetchStats();
    fetchCounters();
    fetchInventory();
    fetchSalesReport();
  }, []);

  const fetchStats = async () => {
    try {
      const { data: loginData } = await supabase.from('login_logs').select('user_id');
      const uniqueUsers = new Set(loginData?.map(l => l.user_id) || []);

      const { data: accessoryData } = await supabase.from('accessories').select('vehicle_model');
      const uniqueModels = new Set(accessoryData?.map(a => a.vehicle_model) || []);

      setStats({
        uniqueLogins: uniqueUsers.size,
        items: accessoryData?.length || 0,
        models: uniqueModels.size
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchCounters = async () => {
    try {
      const { data, error } = await supabase.from('profiles').select('id, name').eq('role', 'counter');
      if (error) throw error;
      setCounters(data || []);
    } catch (error) {
      console.error('Error fetching counters:', error);
    }
  };

  const fetchInventory = async () => {
    try {
      const { data, error } = await supabase
        .from('accessories')
        .select(`id, vehicle_model, name, quantity, price, profiles!inner(name)`)
        .order('vehicle_model', { ascending: true });
      if (error) throw error;
      setInventory(data.map((item: any) => ({
        id: item.id, counter_name: item.profiles.name,
        vehicle_model: item.vehicle_model, name: item.name,
        quantity: item.quantity, price: item.price
      })));
    } catch (error) {
      console.error('Error fetching inventory:', error);
    }
  };

  const fetchLoginDetails = async () => {
    try {
      const { data, error } = await supabase.from('login_logs').select(`user_id, profiles!inner(name)`);
      if (error) throw error;
      const countMap = new Map<string, { name: string; count: number }>();
      (data || []).forEach((row: any) => {
        const uid = row.user_id;
        const existing = countMap.get(uid);
        if (existing) { existing.count++; }
        else { countMap.set(uid, { name: row.profiles?.name || 'Unknown', count: 1 }); }
      });
      setLoginDetails(Array.from(countMap.entries()).map(([user_id, v]) => ({
        user_id, name: v.name, login_count: v.count
      })));
    } catch (error) {
      console.error('Error fetching login details:', error);
    }
  };

  const fetchVehicleModels = async () => {
    try {
      const { data, error } = await supabase.from('accessories').select('vehicle_model');
      if (error) throw error;
      setVehicleModels([...new Set((data || []).map(d => d.vehicle_model))].sort());
    } catch (error) {
      console.error('Error fetching models:', error);
    }
  };

  const fetchModelAccessories = async (model: string) => {
    try {
      const { data, error } = await supabase
        .from('accessories')
        .select(`name, quantity, price, profiles!inner(name)`)
        .eq('vehicle_model', model);
      if (error) throw error;
      setModelAccessories((data || []).map((item: any) => ({
        name: item.name, counter_name: item.profiles.name,
        quantity: item.quantity, price: item.price
      })));
    } catch (error) {
      console.error('Error fetching model accessories:', error);
    }
  };

  const fetchSalesReport = async () => {
    try {
      const { data, error } = await supabase
        .from('bills')
        .select(`counter_id, quantity, total_amount, amount_paid, amount_left, profiles!inner(name)`);
      if (error) throw error;
      const map = new Map<string, SalesReport>();
      (data || []).forEach((bill: any) => {
        const cid = bill.counter_id;
        const existing = map.get(cid);
        if (existing) {
          existing.total_bills++;
          existing.total_sales += Number(bill.total_amount) || 0;
          existing.total_collected += Number(bill.amount_paid) || 0;
          existing.outstanding += Number(bill.amount_left) || 0;
        } else {
          map.set(cid, {
            counter_id: cid,
            counter_name: bill.profiles?.name || 'Unknown',
            total_bills: 1,
            total_sales: Number(bill.total_amount) || 0,
            total_collected: Number(bill.amount_paid) || 0,
            outstanding: Number(bill.amount_left) || 0
          });
        }
      });
      setSalesReport(Array.from(map.values()));
    } catch (error) {
      console.error('Error fetching sales report:', error);
    }
  };

  const handleLoginCardClick = () => {
    fetchLoginDetails();
    setActiveView('logins');
  };

  const handleInventoryCardClick = () => {
    fetchVehicleModels();
    setActiveView('models');
  };

  const handleModelClick = (model: string) => {
    setSelectedModel(model);
    fetchModelAccessories(model);
    setActiveView('model-detail');
  };

  const handleReportsCardClick = () => {
    fetchSalesReport();
    setActiveView('reports');
  };

  const fetchCounterBills = async (counterId: string, counterName: string) => {
    try {
      const { data, error } = await supabase
        .from('bills')
        .select(`*, accessories (name, vehicle_model)`)
        .eq('counter_id', counterId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setCounterBills((data || []).map((b: any) => ({
        id: b.id, created_at: b.created_at,
        accessory_name: b.accessories?.name || 'Unknown',
        vehicle_model: b.accessories?.vehicle_model || '-',
        quantity: b.quantity, total_amount: b.total_amount,
        payment_method: b.payment_method || 'Cash',
        amount_paid: b.amount_paid, amount_left: b.amount_left
      })));
      setSelectedCounterName(counterName);
      setActiveView('counter-bills');
    } catch (error) {
      console.error('Error fetching counter bills:', error);
    }
  };

  const handleReportModelClick = (model: string) => {
    setSelectedReportModel(model);
    setReportModelAccessories(inventory.filter(i => i.vehicle_model === model));
    setActiveView('report-model');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!selectedCounterId) {
      toast.error('Please select a counter before uploading');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    setUploading(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      
      // Deduplicate and aggregate rows by (vehicle_model, name)
      // Postgres UPSERT fails if multiple rows in the same command affect the same record
      const consolidatedData = new Map<string, any>();
      
      jsonData.forEach((row: any) => {
        // Robust column matching and value parsing
        const getVal = (keys: string[]) => {
          for (const key of keys) {
            if (row[key] !== undefined) return row[key];
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
        const quantity = Math.abs(parseInt(getVal(['Quantity', 'Qty', 'quantity', 'qty']) || '0'));
        const price = parseNum(getVal(['Price', 'Cost', 'MRP', 'Rate', 'Amount', 'Unit Price', 'Sale Price', 'price', 'cost', 'mrp']));
        
        if (!name || !vehicle_model) return;
        
        const key = `${vehicle_model.toLowerCase()}|${name.toLowerCase()}`;
        const existing = consolidatedData.get(key);
        
        if (existing) {
          existing.quantity += quantity;
          existing.price = price > 0 ? price : existing.price; // Update to latest non-zero price
        } else {
          consolidatedData.set(key, {
            counter_id: selectedCounterId,
            vehicle_model,
            name,
            quantity,
            price
          });
        }
      });

      const rowsToInsert = Array.from(consolidatedData.values());

      if (rowsToInsert.length === 0) throw new Error('No valid data found. Ensure columns: Vehicle Model, Accessory Name, Quantity, Price.');
      const { error } = await supabase.from('accessories').upsert(rowsToInsert, { onConflict: 'counter_id,vehicle_model,name' });
      if (error) throw error;
      toast.success(`Successfully uploaded ${rowsToInsert.length} accessories!`);
      fetchInventory(); fetchStats();
    } catch (error: any) {
      toast.error(error.message || 'Error processing Excel file');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // --- SUB VIEWS ---
  if (activeView === 'logins') {
    return (
      <div className="space-y-6">
        <button onClick={() => setActiveView('dashboard')} className="flex items-center gap-2 text-sm text-primary hover:underline font-medium">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>
        <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" /> Counter Login Details
          </h2>
          <p className="text-sm text-muted-foreground mb-4">{loginDetails.length} unique counter(s) have logged in.</p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium rounded-tl-lg">#</th>
                  <th className="px-4 py-3 font-medium">Counter Name</th>
                  <th className="px-4 py-3 font-medium text-right rounded-tr-lg">Total Logins</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loginDetails.map((d, i) => (
                  <tr key={d.user_id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3 text-muted-foreground">{i + 1}</td>
                    <td className="px-4 py-3 font-medium">{d.name}</td>
                    <td className="px-4 py-3 text-right">{d.login_count}</td>
                  </tr>
                ))}
                {loginDetails.length === 0 && (
                  <tr><td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">No login records found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  if (activeView === 'models') {
    return (
      <div className="space-y-6">
        <button onClick={() => setActiveView('dashboard')} className="flex items-center gap-2 text-sm text-primary hover:underline font-medium">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>
        <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Car className="w-5 h-5 text-primary" /> Vehicle Models
          </h2>
          <p className="text-sm text-muted-foreground mb-4">{vehicleModels.length} model(s) found. Click a model to see its accessories.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {vehicleModels.map(model => {
              const count = inventory.filter(i => i.vehicle_model === model).length;
              return (
                <button key={model} onClick={() => handleModelClick(model)}
                  className="flex items-center justify-between p-4 bg-muted/50 hover:bg-muted border border-border rounded-lg transition-colors text-left group">
                  <div>
                    <p className="font-medium">{model}</p>
                    <p className="text-xs text-muted-foreground">{count} accessorie(s)</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </button>
              );
            })}
            {vehicleModels.length === 0 && (
              <p className="text-muted-foreground col-span-full text-center py-8">No vehicle models found.</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (activeView === 'model-detail') {
    return (
      <div className="space-y-6">
        <button onClick={() => setActiveView('models')} className="flex items-center gap-2 text-sm text-primary hover:underline font-medium">
          <ArrowLeft className="w-4 h-4" /> Back to Models
        </button>
        <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" /> Accessories for: {selectedModel}
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium rounded-tl-lg">Accessory Name</th>
                  <th className="px-4 py-3 font-medium">Counter</th>
                  <th className="px-4 py-3 font-medium text-right">Quantity</th>
                  <th className="px-4 py-3 font-medium text-right rounded-tr-lg">Price (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {modelAccessories.map((a, i) => (
                  <tr key={i} className="hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3 font-medium">{a.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{a.counter_name}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${a.quantity > 5 ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
                        {a.quantity}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">₹{a.price.toFixed(2)}</td>
                  </tr>
                ))}
                {modelAccessories.length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No accessories found for this model.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  if (activeView === 'reports') {
    // Get unique models from inventory for clickable rows
    const uniqueModels = [...new Set(inventory.map(i => i.vehicle_model))].sort();

    return (
      <div className="space-y-6">
        <button onClick={() => setActiveView('dashboard')} className="flex items-center gap-2 text-sm text-primary hover:underline font-medium">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>

        <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" /> Sales Report by Counter
          </h2>
          <p className="text-xs text-muted-foreground mb-3">Click a counter to see all their bills.</p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium rounded-tl-lg">Counter Name</th>
                  <th className="px-4 py-3 font-medium text-center">Total Bills</th>
                  <th className="px-4 py-3 font-medium text-right">Total Sales (₹)</th>
                  <th className="px-4 py-3 font-medium text-right">Collected (₹)</th>
                  <th className="px-4 py-3 font-medium text-right rounded-tr-lg">Outstanding (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {salesReport.map((r, i) => (
                  <tr key={i} onClick={() => fetchCounterBills(r.counter_id, r.counter_name)} className="hover:bg-muted/50 transition-colors cursor-pointer group">
                    <td className="px-4 py-3 font-medium text-primary group-hover:underline">{r.counter_name}</td>
                    <td className="px-4 py-3 text-center">{r.total_bills}</td>
                    <td className="px-4 py-3 text-right">₹{r.total_sales.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-green-600 dark:text-green-400">₹{r.total_collected.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-destructive font-medium">₹{r.outstanding.toFixed(2)}</td>
                  </tr>
                ))}
                {salesReport.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No sales data available yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" /> Inventory Quantity Report
          </h2>
          <p className="text-xs text-muted-foreground mb-3">Click a model to see all its accessories.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {uniqueModels.map(model => {
              const items = inventory.filter(i => i.vehicle_model === model);
              const totalQty = items.reduce((s, i) => s + i.quantity, 0);
              return (
                <button key={model} onClick={() => handleReportModelClick(model)}
                  className="flex items-center justify-between p-4 bg-muted/50 hover:bg-muted border border-border rounded-lg transition-colors text-left group">
                  <div>
                    <p className="font-medium">{model}</p>
                    <p className="text-xs text-muted-foreground">{items.length} accessory(s) · {totalQty} total units</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </button>
              );
            })}
            {uniqueModels.length === 0 && (
              <p className="text-muted-foreground col-span-full text-center py-8">No inventory data available</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (activeView === 'counter-bills') {
    return (
      <div className="space-y-6">
        <button onClick={() => setActiveView('reports')} className="flex items-center gap-2 text-sm text-primary hover:underline font-medium">
          <ArrowLeft className="w-4 h-4" /> Back to Reports
        </button>
        <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" /> Bills for: {selectedCounterName}
          </h2>
          {counterBills.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">No bills found for this counter.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium rounded-tl-lg">Date</th>
                    <th className="px-4 py-3 font-medium">Accessory</th>
                    <th className="px-4 py-3 font-medium">Model</th>
                    <th className="px-4 py-3 font-medium text-center">Qty</th>
                    <th className="px-4 py-3 font-medium">Payment</th>
                    <th className="px-4 py-3 font-medium text-right">Total</th>
                    <th className="px-4 py-3 font-medium text-right">Paid</th>
                    <th className="px-4 py-3 font-medium text-right rounded-tr-lg">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {counterBills.map((bill) => (
                    <tr key={bill.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-3 text-muted-foreground">{new Date(bill.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3 font-medium">{bill.accessory_name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{bill.vehicle_model}</td>
                      <td className="px-4 py-3 text-center">{bill.quantity}</td>
                      <td className="px-4 py-3"><span className="bg-secondary text-secondary-foreground px-2 py-1 rounded-md text-xs font-medium">{bill.payment_method}</span></td>
                      <td className="px-4 py-3 text-right font-medium">₹{bill.total_amount?.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right text-green-600 dark:text-green-400">₹{(bill.amount_paid ?? bill.total_amount)?.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right text-destructive font-medium">₹{(bill.amount_left ?? 0)?.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (activeView === 'report-model') {
    return (
      <div className="space-y-6">
        <button onClick={() => setActiveView('reports')} className="flex items-center gap-2 text-sm text-primary hover:underline font-medium">
          <ArrowLeft className="w-4 h-4" /> Back to Reports
        </button>
        <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" /> Accessories for: {selectedReportModel}
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium rounded-tl-lg">Accessory Name</th>
                  <th className="px-4 py-3 font-medium">Counter</th>
                  <th className="px-4 py-3 font-medium text-right">Stock Qty</th>
                  <th className="px-4 py-3 font-medium text-right rounded-tr-lg">Price (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {reportModelAccessories.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3 font-medium">{item.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{item.counter_name}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${item.quantity > 5 ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
                        {item.quantity} units
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">₹{item.price.toFixed(2)}</td>
                  </tr>
                ))}
                {reportModelAccessories.length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No accessories found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // --- MAIN DASHBOARD VIEW ---
  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <button onClick={handleLoginCardClick}
          className="bg-card p-6 rounded-xl border border-border shadow-sm flex items-center gap-4 hover:border-primary/50 hover:shadow-md transition-all text-left group">
          <div className="w-12 h-12 bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 rounded-full flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-muted-foreground font-medium">Total Counter Logins</p>
            <p className="text-2xl font-bold">{stats.uniqueLogins}</p>
            <p className="text-xs text-muted-foreground">unique counters</p>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
        </button>

        <button onClick={handleInventoryCardClick}
          className="bg-card p-6 rounded-xl border border-border shadow-sm flex items-center gap-4 hover:border-primary/50 hover:shadow-md transition-all text-left group">
          <div className="w-12 h-12 bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400 rounded-full flex items-center justify-center">
            <Package className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-muted-foreground font-medium">Total Inventory Types</p>
            <p className="text-2xl font-bold">{stats.items}</p>
            <p className="text-xs text-muted-foreground">{stats.models} vehicle model(s)</p>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
        </button>

        <button onClick={handleReportsCardClick}
          className="bg-card p-6 rounded-xl border border-border shadow-sm flex items-center gap-4 hover:border-primary/50 hover:shadow-md transition-all text-left group">
          <div className="w-12 h-12 bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400 rounded-full flex items-center justify-center">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-muted-foreground font-medium">Reports</p>
            <p className="text-2xl font-bold">{salesReport.length}</p>
            <p className="text-xs text-muted-foreground">counter(s) with sales</p>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
        </button>
      </div>

      {/* Upload + Global Inventory */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-1 bg-card p-6 rounded-xl border border-border shadow-sm">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Upload className="w-5 h-5 text-primary" /> Upload Excel Data
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Upload an Excel file containing <span className="font-medium text-foreground">Vehicle Model, Accessory Name, Quantity, Price</span> to update counter stock.
          </p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Select Counter</label>
              <select className="w-full px-3 py-2 bg-input border border-border rounded-md focus:ring-2 focus:ring-primary text-sm"
                value={selectedCounterId} onChange={(e) => setSelectedCounterId(e.target.value)}>
                <option value="">-- Choose a Counter --</option>
                {counters.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
              </select>
            </div>
            <div className="pt-2">
              <input type="file" accept=".xlsx, .xls, .csv" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
              <button onClick={() => fileInputRef.current?.click()} disabled={uploading || !selectedCounterId}
                className="w-full bg-secondary text-secondary-foreground py-2 px-4 rounded-md hover:bg-secondary/80 transition-colors flex items-center justify-center gap-2 text-sm font-medium disabled:opacity-50">
                {uploading ? 'Processing...' : <><FileSpreadsheet className="w-4 h-4" /> Select Excel File</>}
              </button>
            </div>
          </div>
        </div>

        <div className="md:col-span-2 bg-card p-6 rounded-xl border border-border shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Global Inventory</h2>
          <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted text-muted-foreground sticky top-0">
                <tr>
                  <th className="px-4 py-3 font-medium">Counter</th>
                  <th className="px-4 py-3 font-medium">Model</th>
                  <th className="px-4 py-3 font-medium">Accessory</th>
                  <th className="px-4 py-3 font-medium text-right">Qty</th>
                  <th className="px-4 py-3 font-medium text-right">Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {inventory.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/50">
                    <td className="px-4 py-3 font-medium">{item.counter_name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{item.vehicle_model}</td>
                    <td className="px-4 py-3">{item.name}</td>
                    <td className="px-4 py-3 text-right font-medium">{item.quantity}</td>
                    <td className="px-4 py-3 text-right">₹{item.price.toFixed(2)}</td>
                  </tr>
                ))}
                {inventory.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No inventory data available</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>


    </div>
  );
}
