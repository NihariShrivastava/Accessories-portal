import { useState } from 'react';
import type { Accessory } from '../../hooks/useCounterData';
import { ShoppingCart } from 'lucide-react';

interface QuantityModalProps {
  accessory: Accessory;
  onAddToCart: (quantity: number) => void;
  onClose: () => void;
}

export function QuantityModal({ accessory, onAddToCart, onClose }: QuantityModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState('');

  const handleQuantityChange = (val: string) => {
    const num = parseInt(val);
    if (isNaN(num) || num < 1) {
      setQuantity(0);
      setError('Please enter a valid quantity');
      return;
    }

    if (num > accessory.quantity) {
      setQuantity(num);
      setError(`Only ${accessory.quantity} units available at this counter`);
    } else {
      setQuantity(num);
      setError('');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-primary/5 p-4 rounded-xl border border-primary/10">
        <h3 className="font-bold text-lg text-primary">{accessory.name}</h3>
        <p className="text-sm text-muted-foreground">Code: {accessory.accessory_code || 'N/A'}</p>
        <div className="flex justify-between items-center mt-2">
          <span className="text-sm font-medium">Available Stock: {accessory.quantity} units</span>
          <span className="text-lg font-bold text-primary">₹{accessory.price.toFixed(2)}</span>
        </div>
      </div>

      <div className="space-y-3">
        <label className="block text-sm font-medium text-center uppercase tracking-widest text-muted-foreground">Enter Quantity</label>
        <div className="space-y-2">
          <input
            type="number"
            min="1"
            value={quantity || ''}
            onFocus={(e) => e.target.select()}
            onChange={(e) => handleQuantityChange(e.target.value)}
            placeholder="Type quantity..."
            className={`w-full text-center text-xl font-bold bg-input border-2 rounded-xl py-3 outline-none transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${error ? 'border-destructive text-destructive animate-shake' : 'border-border focus:border-primary'}`}
          />
          {error && (
            <p className="text-destructive text-xs font-bold text-center animate-in fade-in slide-in-from-top-1">
              {error}
            </p>
          )}
        </div>
      </div>

      <div className="pt-4 border-t border-border space-y-3">
        <div className="flex justify-between items-center text-lg font-bold">
          <span>Total Price:</span>
          <span className={`text-2xl ${error ? 'text-muted-foreground' : 'text-primary'}`}>₹{((quantity || 0) * accessory.price).toFixed(2)}</span>
        </div>
        <button
          onClick={() => !error && quantity > 0 && onAddToCart(quantity)}
          disabled={!!error || quantity <= 0}
          className="w-full bg-primary text-primary-foreground py-4 rounded-xl hover:bg-primary/90 font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 disabled:grayscale"
        >
          <ShoppingCart className="w-5 h-5" /> Confirm & Add to Cart
        </button>
        <button
          onClick={onClose}
          className="w-full bg-secondary text-secondary-foreground py-2 rounded-xl hover:bg-secondary/80 font-medium transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
