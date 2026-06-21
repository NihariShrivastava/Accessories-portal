import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface Option {
  id: string;
  name: string;
}

interface MultiSelectDropdownProps {
  options: Option[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  placeholder?: string;
  className?: string;
}

export function MultiSelectDropdown({ options, selectedIds, onChange, placeholder = "Select...", className = "" }: MultiSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOption = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter(selectedId => selectedId !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const selectedCount = selectedIds.length;

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 bg-input border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary text-left bg-white dark:bg-zinc-900"
      >
        <span className="truncate pr-4 text-foreground">
          {selectedCount === 0 
            ? <span className="text-muted-foreground">{placeholder}</span>
            : `${selectedCount} selected`}
        </span>
        <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
          {options.length === 0 ? (
            <div className="p-3 text-sm text-muted-foreground text-center">No options available</div>
          ) : (
            <div className="py-1">
              {options.map(option => (
                <label
                  key={option.id}
                  className="flex items-center px-3 py-2 hover:bg-muted cursor-pointer transition-colors"
                  onClick={(e) => {
                    e.preventDefault();
                    toggleOption(option.id);
                  }}
                >
                  <div className={`w-4 h-4 flex items-center justify-center rounded border mr-3 ${selectedIds.includes(option.id) ? 'bg-primary border-primary' : 'border-input bg-background'}`}>
                    {selectedIds.includes(option.id) && <Check className="w-3 h-3 text-primary-foreground" />}
                  </div>
                  <span className="text-sm font-medium text-foreground">{option.name}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
