import { useState } from 'react';
import { ViewHeader } from '../../ViewHeader';
import { Package, ChevronLeft, ChevronRight, ShoppingCart, Car, Store } from 'lucide-react';
import type { Counter } from '../../../../hooks/useAdminData';

export const InventorySliderView = ({
  vehicleModels,
  counters,
  onBack,
  onModelClick,
  onCounterClick,
  transferCartCount = 0,
  onCartClick
}: {
  vehicleModels: string[],
  counters: Counter[],
  onBack: () => void,
  onModelClick: (model: string) => void,
  onCounterClick: (counter: Counter) => void,
  transferCartCount?: number,
  onCartClick?: () => void
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const slideNames = ['By Vehicle Model', 'By Counter'];

  const goNext = () => setCurrentSlide((prev) => (prev + 1) % 2);
  const goPrev = () => setCurrentSlide((prev) => (prev - 1 + 2) % 2);

  return (
    <div className="space-y-6">
      <ViewHeader title="Total Inventory" onBack={onBack} icon={Package} />

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-border bg-muted/30 flex items-center justify-between">
          <button onClick={goPrev} className="w-10 h-10 flex items-center justify-center rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-all hover:scale-110 active:scale-95">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="text-center flex-1">
            <h2 className="text-xl font-bold uppercase tracking-wider text-primary">{slideNames[currentSlide]}</h2>
            <div className="flex items-center justify-center gap-2 mt-2">
              {slideNames.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentSlide(i)}
                  className={`h-2 rounded-full transition-all duration-300 ${i === currentSlide ? 'w-8 bg-primary' : 'w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50'}`}
                />
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={goNext} className="w-10 h-10 flex items-center justify-center rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-all hover:scale-110 active:scale-95">
              <ChevronRight className="w-6 h-6" />
            </button>
            {onCartClick && (
              <button
                onClick={onCartClick}
                className="relative flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-600/10 hover:bg-purple-600/20 text-purple-600 transition-all hover:scale-105 active:scale-95 group shadow-sm border border-purple-600/10"
                title="View Transfer Cart"
              >
                <ShoppingCart className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Transfer Cart</span>
                {transferCartCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                    {transferCartCount}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>

        <div className="overflow-hidden">
          <div className="flex transition-transform duration-500 ease-in-out" style={{ transform: `translateX(-${currentSlide * 100}%)` }}>
            {/* Slide 1: Models */}
            <div className="w-full flex-shrink-0 p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {vehicleModels.map(m => (
                  <button key={m} onClick={() => onModelClick(m)} className="flex items-center justify-between p-4 bg-card border border-border rounded-lg hover:bg-muted group">
                    <div className="flex items-center gap-3">
                      <Car className="w-5 h-5 text-muted-foreground group-hover:text-primary" />
                      <span className="font-medium">{m}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-transform" />
                  </button>
                ))}
              </div>
            </div>

            {/* Slide 2: Counters */}
            <div className="w-full flex-shrink-0 p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {counters.map(c => (
                  <button key={c.id} onClick={() => onCounterClick(c)} className="flex items-center justify-between p-4 bg-card border border-border rounded-lg hover:bg-muted group">
                    <div className="flex items-center gap-3">
                      <Store className="w-5 h-5 text-muted-foreground group-hover:text-primary" />
                      <span className="font-medium">{c.name}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-transform" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
