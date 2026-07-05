import { ShoppingCart, Trash2, Plus, Minus } from 'lucide-react';
import type { Accessory } from '../../hooks/useCounterData';

interface CartItem {
  accessory: Accessory;
  quantity: number;
}

interface CartModalProps {
  items: CartItem[];
  onRemove: (id: string) => void;
  onUpdateQuantity: (id: string, delta: number, absolute?: number) => void;
  onCheckout: () => void;
  onClose: () => void;
}

export function CartModal({ items, onRemove, onUpdateQuantity, onCheckout, onClose }: CartModalProps) {
  const total = items.reduce((sum, item) => sum + (item.accessory.price * item.quantity), 0);

  return (
    <div className="space-y-6">
      {items.length === 0 ? (
        <div className="py-12 text-center space-y-4">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto text-muted-foreground">
            <ShoppingCart className="w-8 h-8" />
          </div>
          <p className="text-muted-foreground font-medium">Your cart is empty.</p>
          <button
            onClick={onClose}
            className="text-primary font-semibold hover:underline"
          >
            Go add some accessories
          </button>
        </div>
      ) : (
        <>
          <div className="max-h-[400px] overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-primary/20">
            {items.map((item) => (
              <div
                key={item.accessory.id}
                className="flex items-center gap-4 p-3 bg-muted/40 border border-border rounded-xl group transition-all hover:border-primary/20"
              >
                <div className="flex-1">
                  <h4 className="font-bold text-sm leading-tight group-hover:text-primary transition-colors">{item.accessory.name}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.accessory.vehicle_model} • ₹{Number(item.accessory.price).toFixed(2)}/unit</p>
                </div>
                
                <div className="flex items-center gap-2 bg-background border border-border rounded-lg p-1">
                  <button
                    onClick={() => onUpdateQuantity(item.accessory.id, -1)}
                    disabled={item.quantity <= 1}
                    className="p-1 rounded-md hover:bg-muted disabled:opacity-30 transition-colors"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      if (!isNaN(val)) {
                        onUpdateQuantity(item.accessory.id, 0, val);
                      }
                    }}
                    className="w-10 text-center text-sm font-bold bg-transparent outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    min="1"
                    max={item.accessory.quantity}
                  />
                  <button
                    onClick={() => onUpdateQuantity(item.accessory.id, 1)}
                    disabled={item.quantity >= item.accessory.quantity}
                    className="p-1 rounded-md hover:bg-muted disabled:opacity-30 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="text-right min-w-[80px]">
                  <p className="font-bold text-sm">₹{(item.accessory.price * item.quantity).toFixed(2)}</p>
                </div>

                <button
                  onClick={() => onRemove(item.accessory.id)}
                  className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="pt-6 border-t border-border space-y-4">
            <div className="flex justify-between items-center text-xl">
              <span className="font-medium text-muted-foreground">Total Payable:</span>
              <span className="font-black text-primary text-2xl">₹{total.toFixed(2)}</span>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={onClose}
                className="bg-secondary text-secondary-foreground py-3 rounded-xl font-bold hover:bg-secondary/80 transition-all"
              >
                Continue Shopping
              </button>
              <button
                onClick={onCheckout}
                className="bg-primary text-primary-foreground py-3 rounded-xl font-bold hover:bg-primary/90 shadow-lg shadow-primary/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              >
                Generate Bill
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
