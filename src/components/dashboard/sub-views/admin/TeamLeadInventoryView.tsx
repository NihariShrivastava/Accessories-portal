import { useState } from 'react';
import { Package, ArrowLeft, Search, Filter, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { Counter, InventoryItem } from '../../../../hooks/useAdminData';

interface TeamLeadInventoryViewProps {
  counters: Counter[];
  inventory: InventoryItem[];
  onBack: () => void;
}

export function TeamLeadInventoryView({ counters, inventory, onBack }: TeamLeadInventoryViewProps) {
  const [selectedCounterId, setSelectedCounterId] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Grid View (Counters)
  if (!selectedCounterId) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2 hover:bg-muted rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-2xl font-black uppercase tracking-tight flex items-center gap-2">
              <Package className="w-6 h-6 text-primary" />
              Counter Inventory Select
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {counters.map(counter => {
            const counterInventory = inventory.filter(i => i.counter_id === counter.id);
            const totalItems = counterInventory.reduce((sum, item) => sum + item.quantity, 0);
            
            return (
              <button
                key={counter.id}
                onClick={() => setSelectedCounterId(counter.id)}
                className="text-left p-6 rounded-xl border border-border bg-card hover:bg-muted hover:border-primary/50 transition-all group shadow-sm"
              >
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Package className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-black text-lg group-hover:text-primary transition-colors line-clamp-1">
                  {counter.name}
                </h3>
                <p className="text-sm font-medium text-muted-foreground mt-1">
                  {counterInventory.length} Unique Models
                </p>
                <p className="text-xs text-muted-foreground mt-1 font-bold">
                  Total Items: {totalItems}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // 2. Detailed Counter Inventory View
  const counter = counters.find(c => c.id === selectedCounterId);
  const counterInventory = inventory.filter(i => i.counter_id === selectedCounterId);
  
  const shortageCount = counterInventory.filter(i => i.quantity <= 5).length;
  const surplusCount = counterInventory.filter(i => i.quantity > 5).length;

  const availableModels = Array.from(new Set(counterInventory.map(i => i.vehicle_model))).sort();

  const filteredInventory = counterInventory.filter(item => {
    const matchesModel = selectedModel === 'all' || item.vehicle_model === selectedModel;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (item.accessory_code && item.accessory_code.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesModel && matchesSearch;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              setSelectedCounterId(null);
              setSelectedModel('all');
              setSearchQuery('');
            }}
            className="p-2 hover:bg-muted rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tight flex items-center gap-2">
              <Package className="w-6 h-6 text-primary" />
              {counter?.name} - Inventory
            </h2>
            <p className="text-muted-foreground text-sm font-medium">
              Detailed inventory breakdown and levels
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 p-4 rounded-xl flex items-center gap-4">
          <div className="w-12 h-12 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">Shortage Models (≤ 5)</p>
            <p className="text-2xl font-black text-red-700 dark:text-red-300">{shortageCount}</p>
          </div>
        </div>
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/30 p-4 rounded-xl flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/50 rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Surplus Models (&gt; 5)</p>
            <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300">{surplusCount}</p>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/30 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search accessory..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-background border border-input rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>
          
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full sm:w-auto bg-background border border-input rounded-md px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none"
            >
              <option value="all">All Models</option>
              {availableModels.map(model => (
                <option key={model} value={model}>{model}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border font-black tracking-wider">
              <tr>
                <th className="px-6 py-4">Vehicle Model</th>
                <th className="px-6 py-4">Item Details</th>
                <th className="px-6 py-4">Quantity</th>
                <th className="px-6 py-4">Price (₹)</th>
                <th className="px-6 py-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredInventory.map((item) => (
                <tr key={item.id} className="hover:bg-muted/50 transition-colors">
                  <td className="px-6 py-4 font-bold">{item.vehicle_model}</td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-foreground">{item.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{item.accessory_code || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-mono font-bold bg-muted px-2 py-1 rounded-md">{item.quantity}</span>
                  </td>
                  <td className="px-6 py-4 font-bold">
                    ₹{Number(item.price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {item.quantity <= 5 ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                        <AlertTriangle className="w-3 h-3" /> Shortage
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                        <CheckCircle2 className="w-3 h-3" /> Surplus
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {filteredInventory.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground font-medium">
                    No accessories found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
