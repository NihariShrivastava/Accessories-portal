import { useState, useMemo } from 'react';
import { ArrowLeftRight, Search, Plus, Minus, Check, ShoppingCart, Trash2 } from 'lucide-react';
import { ViewHeader } from '../../ViewHeader';
import { DataTable } from '../../DataTable';
import { toast } from 'sonner';

type Props = {
  warehouses: any[];
  counters: any[];
  inventory: any[];
  onBack: () => void;
  onExecuteTransfer: (sourceId: string, targetId: string, items: any[]) => Promise<boolean>;
};

export function TeamLeadTransferView({ warehouses, counters, inventory, onBack, onExecuteTransfer }: Props) {
  const [sourceId, setSourceId] = useState('');
  const [targetId, setTargetId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<{ id: string, name: string, quantity: number, max: number, vehicle_model: string, price: number }[]>([]);
  const [loading, setLoading] = useState(false);

  // Filter inventory based on selected source warehouse
  const availableInventory = useMemo(() => {
    if (!sourceId) return [];
    let items = inventory.filter(i => i.counter_id === sourceId && i.quantity > 0);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(i => 
        i.name.toLowerCase().includes(q) || 
        (i.accessory_code && i.accessory_code.toLowerCase().includes(q)) ||
        i.vehicle_model.toLowerCase().includes(q)
      );
    }
    return items;
  }, [inventory, sourceId, searchQuery]);

  const addToCart = (item: any) => {
    const existing = cart.find(c => c.id === item.id);
    if (existing) {
      if (existing.quantity >= existing.max) {
        toast.error("Cannot exceed available stock.");
        return;
      }
      setCart(cart.map(c => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c));
    } else {
      setCart([...cart, { id: item.id, name: item.name, quantity: 1, max: item.quantity, vehicle_model: item.vehicle_model, price: item.price }]);
    }
    toast.success("Added to transfer cart");
  };

  const updateCartQuantity = (id: string, delta: number) => {
    setCart(cart.map(c => {
      if (c.id === id) {
        const newQ = c.quantity + delta;
        if (newQ > c.max || newQ < 1) return c;
        return { ...c, quantity: newQ };
      }
      return c;
    }));
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter(c => c.id !== id));
  };

  const handleTransfer = async () => {
    if (!sourceId || !targetId || cart.length === 0) {
      toast.error("Please fill all required fields");
      return;
    }
    if (sourceId === targetId) {
      toast.error("Source and target cannot be the same");
      return;
    }
    setLoading(true);
    const success = await onExecuteTransfer(sourceId, targetId, cart.map(c => ({ id: c.id, name: c.name, quantity: c.quantity })));
    if (success) {
      setCart([]);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <ViewHeader
        title="Transfer Accessories"
        onBack={onBack}
        icon={ArrowLeftRight}
        description="Transfer stock from warehouses to counters."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Col: Setup & Cart */}
        <div className="space-y-6">
          <div className="bg-card p-5 rounded-xl border border-border shadow-sm space-y-4">
            <h3 className="font-bold text-lg border-b border-border pb-2">Transfer Details</h3>
            
            <div className="space-y-2">
              <label className="block text-sm font-semibold">From Warehouse</label>
              <select 
                className="w-full px-3 py-2 bg-input border border-border rounded-lg"
                value={sourceId}
                onChange={(e) => {
                  setSourceId(e.target.value);
                  setCart([]); // Clear cart when source changes
                }}
              >
                <option value="">-- Select Source Warehouse --</option>
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>

            <div className="flex justify-center text-muted-foreground my-2">
              <ArrowDownIcon />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold">To Counter</label>
              <select 
                className="w-full px-3 py-2 bg-input border border-border rounded-lg"
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
              >
                <option value="">-- Select Target Counter --</option>
                {counters.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-card p-5 rounded-xl border border-border shadow-sm space-y-4 flex flex-col max-h-[500px]">
            <h3 className="font-bold text-lg border-b border-border pb-2 flex items-center justify-between">
              Transfer Cart
              <span className="bg-primary/20 text-primary px-2 py-0.5 rounded-full text-xs">{cart.length} items</span>
            </h3>

            <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
              {cart.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">Cart is empty</p>
                </div>
              ) : (
                cart.map(item => (
                  <div key={item.id} className="bg-muted/30 p-3 rounded-lg border border-border flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-sm leading-tight">{item.name}</p>
                        <p className="text-[10px] text-muted-foreground uppercase">{item.vehicle_model}</p>
                      </div>
                      <button onClick={() => removeFromCart(item.id)} className="text-destructive hover:bg-destructive/10 p-1 rounded transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <div className="flex items-center bg-background border border-border rounded-md overflow-hidden">
                        <button onClick={() => updateCartQuantity(item.id, -1)} className="px-2 py-1 hover:bg-muted transition-colors"><Minus className="w-3 h-3" /></button>
                        <span className="px-2 text-sm font-semibold min-w-[2rem] text-center">{item.quantity}</span>
                        <button onClick={() => updateCartQuantity(item.id, 1)} className="px-2 py-1 hover:bg-muted transition-colors"><Plus className="w-3 h-3" /></button>
                      </div>
                      <span className="text-xs text-muted-foreground font-mono">Max: {item.max}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <button
              onClick={handleTransfer}
              disabled={loading || cart.length === 0 || !sourceId || !targetId}
              className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-bold shadow-md hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:bg-primary"
            >
              {loading ? 'Processing...' : <><Check className="w-5 h-5" /> Execute Transfer</>}
            </button>
          </div>
        </div>

        {/* Right Col: Inventory Selection */}
        <div className="lg:col-span-2 bg-card rounded-xl border border-border shadow-sm flex flex-col h-[800px]">
          <div className="p-4 border-b border-border flex items-center justify-between gap-4 bg-muted/20">
            <h2 className="font-bold">Available Inventory</h2>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input 
                type="text" 
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-background border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20"
                disabled={!sourceId}
              />
            </div>
          </div>

          <div className="flex-1 overflow-hidden p-0 relative">
            {!sourceId ? (
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground flex-col gap-2">
                <ArrowLeftRight className="w-12 h-12 opacity-20" />
                <p>Select a source warehouse to view inventory</p>
              </div>
            ) : (
              <DataTable 
                idAccessor="id"
                data={availableInventory}
                pageSize={50}
                columns={[
                  { header: 'Model', accessor: 'vehicle_model', className: 'text-xs uppercase font-bold text-primary w-32' },
                  { header: 'Accessory Name', accessor: 'name' },
                  { header: 'Price', accessor: (row) => `₹${row.price.toLocaleString('en-IN')}`, className: 'text-right' },
                  { header: 'Stock', accessor: (row) => (
                    <span className="font-mono bg-secondary px-2 py-1 rounded text-secondary-foreground text-xs font-bold">
                      {row.quantity}
                    </span>
                  ), className: 'text-center' },
                  { header: '', accessor: (row) => (
                    <button
                      onClick={() => addToCart(row)}
                      className="px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground text-xs font-bold rounded flex items-center gap-1 transition-colors ml-auto"
                    >
                      <Plus className="w-3 h-3" /> Add
                    </button>
                  ), className: 'text-right' }
                ]}
              />
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

function ArrowDownIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></svg>
  );
}
