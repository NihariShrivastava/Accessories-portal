import { useState } from 'react';
import { ChevronDown, ChevronUp, Package, ShoppingCart } from 'lucide-react';
import { DataTable } from './DataTable';
import { Badge } from './Badge';
import type { Accessory } from '../../hooks/useCounterData';

interface CollapsibleModelRowProps {
  model: string;
  accessories: Accessory[];
  loading: boolean;
  onExpand: () => void;
  onAddToCart: (accessory: Accessory) => void;
}

export function CollapsibleModelRow({ model, accessories, loading, onExpand, onAddToCart }: CollapsibleModelRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleToggle = () => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    if (newExpanded && accessories.length === 0) {
      onExpand();
    }
  };

  return (
    <div className="border border-border rounded-xl overflow-hidden mb-3 bg-card shadow-sm transition-all">
      <div 
        onClick={handleToggle}
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Package className="w-5 h-5 text-primary" />
          </div>
          <h3 className="font-semibold text-lg">{model}</h3>
          {accessories.length > 0 && (
            <Badge variant="secondary">{accessories.length} Items</Badge>
          )}
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
            {isExpanded ? 'Click to collapse' : 'Click to view accessories'}
          </span>
          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-border animate-in slide-in-from-top-2 duration-200">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground animate-pulse">Loading accessories...</div>
          ) : (
            <DataTable<Accessory>
              idAccessor="id"
              columns={[
                { header: 'Accessory Name', accessor: 'name', className: 'font-medium pl-4' },
                { header: 'Code', accessor: (i) => i.accessory_code || '-', className: 'text-muted-foreground text-sm' },
                { header: 'Qty', accessor: (i) => <Badge variant={i.quantity > 5 ? 'success' : 'danger'}>{i.quantity}</Badge>, className: 'text-center' },
                { header: 'Price', accessor: (i) => `₹${Number(i.price).toFixed(2)}`, className: 'text-right pr-4' },
                {
                  header: 'Action', headerClassName: 'text-center pr-4',
                  accessor: (i) => (
                    <div className="text-center pr-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddToCart(i);
                        }}
                        disabled={i.quantity === 0}
                        className="inline-flex items-center gap-1 bg-primary text-primary-foreground px-3 py-1.5 rounded-md text-xs font-medium hover:bg-primary/90 disabled:opacity-50 transition-all hover:scale-105 active:scale-95"
                      >
                        <ShoppingCart className="w-3 h-3" /> Add to Cart
                      </button>
                    </div>
                  )
                }
              ]}
              data={accessories}
              emptyMessage="No accessories found for this model."
            />
          )}
        </div>
      )}
    </div>
  );
}
