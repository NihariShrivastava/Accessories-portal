import { useState } from 'react';
import { Calendar, Filter } from 'lucide-react';

interface DateRangeFilterProps {
  onApply: (startDate: string, endDate: string) => void;
  onClear: () => void;
  initialStartDate?: string;
  initialEndDate?: string;
}

export function DateRangeFilter({
  onApply,
  onClear,
  initialStartDate = '',
  initialEndDate = ''
}: DateRangeFilterProps) {
  const [localStart, setLocalStart] = useState(initialStartDate);
  const [localEnd, setLocalEnd] = useState(initialEndDate);

  const handleClear = () => {
    setLocalStart('');
    setLocalEnd('');
    onClear();
  };

  return (
    <div className="flex flex-wrap items-center gap-4 p-4 bg-muted/20 border border-border rounded-xl mb-6">
      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium">Filter by Date:</span>
      </div>
      
      <div className="flex items-center gap-2">
        <label className="text-xs text-muted-foreground">From:</label>
        <input
          type="date"
          className="px-2 py-1 text-sm bg-input border border-border rounded-md focus:ring-2 focus:ring-primary outline-none"
          value={localStart}
          onChange={(e) => setLocalStart(e.target.value)}
        />
      </div>

      <div className="flex items-center gap-2">
        <label className="text-xs text-muted-foreground">To:</label>
        <input
          type="date"
          className="px-2 py-1 text-sm bg-input border border-border rounded-md focus:ring-2 focus:ring-primary outline-none"
          value={localEnd}
          onChange={(e) => setLocalEnd(e.target.value)}
        />
      </div>

      <div className="flex items-center gap-3 ml-auto">
        <button
          onClick={() => onApply(localStart, localEnd)}
          className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-1.5 rounded-md text-xs font-bold hover:bg-primary/90 transition-all shadow-sm active:scale-95"
        >
          <Filter className="w-3.5 h-3.5" /> Apply
        </button>
        <button
          onClick={handleClear}
          className="text-xs text-muted-foreground hover:text-primary font-medium transition-colors"
        >
          Clear
        </button>
      </div>
    </div>
  );
}
