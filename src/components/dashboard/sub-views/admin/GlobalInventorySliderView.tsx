import { useState, useEffect, useMemo } from 'react';
import { DataTable } from '../../DataTable';
import { Badge } from '../../Badge';
import { Modal } from '../../Modal';
import { ChevronLeft, ChevronRight, History, Store, ArrowLeftRight, ShoppingCart } from 'lucide-react';
import type { InventoryItem, Counter, Warehouse } from '../../../../hooks/useAdminData';
import type { Column } from '../../DataTable';


export const GlobalInventorySliderView = ({
  inventory,
  counters,
  warehouses = [],
  onEdit,
  onTransfer,
  onDelete,
  onTransferAll,
  initialStartDate,
  initialEndDate,
  onDateRangeChange,
  transferCartCount = 0,
  onCartClick
}: {
  inventory: InventoryItem[],
  counters: Counter[],
  warehouses?: Warehouse[],
  onEdit: (item: InventoryItem) => void,
  onTransfer: (item: InventoryItem) => void,
  onDelete: (id: string) => void,
  onTransferAll: (items: InventoryItem[], targetCounterId: string) => void,
  initialStartDate?: string,
  initialEndDate?: string,
  onDateRangeChange?: (start: string, end: string) => void,
  transferCartCount?: number,
  onCartClick?: () => void
}) => {


  const [currentSlide, setCurrentSlide] = useState(0);
  const [startDate, setStartDate] = useState(initialStartDate || '');
  const [endDate, setEndDate] = useState(initialEndDate || '');
  const [selectedCounterId, setSelectedCounterId] = useState('');
  const [targetCounterId, setTargetCounterId] = useState('');
  const [showTransferModal, setShowTransferModal] = useState(false);

  useEffect(() => {
    if (initialStartDate) setStartDate(initialStartDate);
    if (initialEndDate) setEndDate(initialEndDate);
  }, [initialStartDate, initialEndDate]);

  const handleDateRangeChange = (start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
    if (onDateRangeChange) onDateRangeChange(start, end);
  };

  const slideNames = ['Uploaded Excel Logs', 'Transfer Accessory'];

  const getLocalDateStr = (iso: string) => {
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleDateString('en-CA');
    } catch {
      return '';
    }
  };

  const filteredInventoryLogs = useMemo(() => {
    return inventory.filter(i => {
      const dStr = getLocalDateStr(i.created_at);
      if (!startDate && !endDate) return true;
      if (startDate && !endDate) return dStr >= startDate;
      if (!startDate && endDate) return dStr <= endDate;
      return dStr >= startDate && dStr <= endDate;
    });
  }, [inventory, startDate, endDate]);

  const filteredCounterInventory = useMemo(() => {
    return inventory.filter(i => {
      const dStr = getLocalDateStr(i.created_at);
      const matchesCounter = i.counter_id === selectedCounterId;
      let matchesDate = true;
      if (startDate && endDate) matchesDate = dStr >= startDate && dStr <= endDate;
      else if (startDate) matchesDate = dStr >= startDate;
      else if (endDate) matchesDate = dStr <= endDate;
      return matchesCounter && matchesDate;
    });
  }, [inventory, selectedCounterId, startDate, endDate]);

  const goNext = () => setCurrentSlide((prev) => (prev + 1) % 2);
  const goPrev = () => setCurrentSlide((prev) => (prev - 1 + 2) % 2);

  const columnsLogs: Column<InventoryItem>[] = [
    { header: 'Date', accessor: (i) => new Date(i.created_at).toLocaleDateString(), className: 'text-left text-muted-foreground' },
    { header: 'Counter', accessor: 'counter_name', className: 'font-medium' },
    { header: 'Model', accessor: 'vehicle_model', className: 'text-muted-foreground' },
    { header: 'Accessory', accessor: 'name' },
    { header: 'Code', accessor: (i) => i.accessory_code || '-', className: 'text-sm text-muted-foreground' },
    { header: 'Qty', accessor: 'quantity', className: 'text-right font-bold' },
    { header: 'Price', accessor: (i) => `₹${i.price.toFixed(2)}`, className: 'text-right font-medium' },
  ];

  const columnsTransfer: Column<InventoryItem>[] = [
    { header: 'Accessory Name', accessor: 'name', className: 'font-medium' },
    { header: 'Model', accessor: 'vehicle_model', className: 'text-muted-foreground' },
    { header: 'Code', accessor: (i) => i.accessory_code || '-', className: 'text-sm text-muted-foreground' },
    { header: 'Upload Date', accessor: (i) => new Date(i.created_at).toLocaleDateString(), className: 'text-muted-foreground' },
    { header: 'Stock Quantity', accessor: (i) => <Badge variant={i.quantity > 5 ? 'success' : 'danger'}>{i.quantity} units</Badge>, className: 'text-right font-medium' },
    { header: 'Price (₹)', accessor: (i) => `₹${i.price.toFixed(2)}`, className: 'text-right font-medium' },
    {
      header: 'Actions',
      accessor: (i) => (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => onEdit(i)} className="px-3 py-1 bg-blue-600 text-white rounded text-xs font-bold hover:bg-blue-700 transition-colors">Edit</button>
          <button onClick={() => onTransfer(i)} className="px-3 py-1 bg-green-600 text-white rounded text-xs font-bold hover:bg-green-700 transition-colors">Transfer</button>
          <button onClick={() => onDelete(i.id)} className="px-3 py-1 bg-red-600 text-white rounded text-xs font-bold hover:bg-red-700 transition-colors">Delete</button>
        </div>
      ),
      className: 'text-center'
    }
  ];

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden flex flex-col animate-in fade-in duration-500">
      {/* Slider Header */}
      <div className="p-4 sm:p-6 border-b border-border bg-muted/30 flex items-center justify-between">
        <button onClick={goPrev} className="w-10 h-10 flex items-center justify-center rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-all hover:scale-110 active:scale-95">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="text-center flex-1">
          <h2 className="text-xl font-bold uppercase tracking-wider text-primary">{slideNames[currentSlide]}</h2>
          <div className="flex items-center justify-center gap-2 mt-2">
            {[0, 1].map((i) => (
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
          {onCartClick && currentSlide === 1 && (
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

      <div className="p-6">
        {currentSlide === 0 ? (
          <div className="space-y-4 animate-in slide-in-from-left duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-muted/20 p-4 rounded-lg border border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <History className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Inventory Logs</h3>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">All accessory uploads for selected date</p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-card p-1.5 px-3 rounded-lg border border-border shadow-sm flex-wrap">
                <span className="text-xs font-bold uppercase text-muted-foreground">From:</span>
                <input
                  type="date"
                  className="bg-transparent border-none text-sm outline-none font-medium cursor-pointer dark:[&::-webkit-calendar-picker-indicator]:invert"
                  value={startDate}
                  onChange={(e) => handleDateRangeChange(e.target.value, endDate)}
                />
                <span className="text-xs font-bold uppercase text-muted-foreground ml-2">To:</span>
                <input
                  type="date"
                  className="bg-transparent border-none text-sm outline-none font-medium cursor-pointer dark:[&::-webkit-calendar-picker-indicator]:invert"
                  value={endDate}
                  onChange={(e) => handleDateRangeChange(startDate, e.target.value)}
                />
              </div>
            </div>
            <DataTable<InventoryItem> idAccessor="id" data={filteredInventoryLogs} columns={columnsLogs} maxHeight="500px" pageSize={20} />
          </div>
        ) : (
          <div className="space-y-4 animate-in slide-in-from-right duration-300">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-muted/20 p-4 rounded-lg border border-border">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex items-center gap-2 bg-card p-1.5 px-3 rounded-lg border border-border shadow-sm">
                  <Store className="w-4 h-4 text-primary" />
                  <select
                    className="bg-transparent border-none text-sm outline-none font-medium cursor-pointer dark:text-white [color-scheme:dark]"
                    value={selectedCounterId}
                    onChange={(e) => setSelectedCounterId(e.target.value)}
                  >
                    <option value="" className="bg-card">-- Select Source --</option>
                    {counters.length > 0 && (
                      <optgroup label="Counters" className="bg-muted text-muted-foreground font-bold">
                        {counters.map(c => <option key={c.id} value={c.id} className="bg-card font-medium">{c.name}</option>)}
                      </optgroup>
                    )}
                    {warehouses.length > 0 && (
                      <optgroup label="Warehouses" className="bg-muted text-muted-foreground font-bold">
                        {warehouses.map(w => <option key={w.id} value={w.id} className="bg-card font-medium">{w.name}</option>)}
                      </optgroup>
                    )}
                  </select>
                </div>
                <div className="flex items-center gap-2 bg-card p-1.5 px-3 rounded-lg border border-border shadow-sm flex-wrap">
                  <History className="w-4 h-4 text-primary" />
                  <span className="text-xs font-bold uppercase text-muted-foreground">From:</span>
                  <input
                    type="date"
                    className="bg-transparent border-none text-sm outline-none font-medium cursor-pointer dark:[&::-webkit-calendar-picker-indicator]:invert"
                    value={startDate}
                    onChange={(e) => handleDateRangeChange(e.target.value, endDate)}
                  />
                  <span className="text-xs font-bold uppercase text-muted-foreground ml-2">To:</span>
                  <input
                    type="date"
                    className="bg-transparent border-none text-sm outline-none font-medium cursor-pointer dark:[&::-webkit-calendar-picker-indicator]:invert"
                    value={endDate}
                    onChange={(e) => handleDateRangeChange(startDate, e.target.value)}
                  />
                </div>
              </div>

              <button
                disabled={!selectedCounterId || filteredCounterInventory.length === 0}
                onClick={() => setShowTransferModal(true)}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-bold hover:bg-purple-700 disabled:opacity-50 transition-all flex items-center gap-2 shadow-sm active:scale-95"
              >
                <ArrowLeftRight className="w-4 h-4" /> Transfer All Accessory
              </button>
            </div>

            <DataTable<InventoryItem> idAccessor="id" data={filteredCounterInventory} columns={columnsTransfer} maxHeight="500px" pageSize={20} />
          </div>
        )}
      </div>

      <Modal isOpen={showTransferModal} onClose={() => setShowTransferModal(false)} title="Bulk Transfer Accessories">
        <div className="space-y-6">
          <div className="p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
            <p className="text-sm text-purple-700 dark:text-purple-300">
              You are about to transfer <span className="font-bold">{filteredCounterInventory.length} items</span> from <span className="font-bold">{startDate}{startDate !== endDate ? ` to ${endDate}` : ''}</span> to another counter.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-muted-foreground ml-1">Target Counter Name</label>
            <select
              className="w-full px-4 py-2 bg-background border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary/20 dark:text-white [color-scheme:dark]"
              value={targetCounterId}
              onChange={(e) => setTargetCounterId(e.target.value)}
            >
              <option value="" className="bg-card">-- Choose Destination --</option>
              {counters.length > 0 && (
                <optgroup label="Counters" className="bg-muted text-muted-foreground font-bold">
                  {counters.filter(c => c.id !== selectedCounterId).map(c => <option key={c.id} value={c.id} className="bg-card font-medium">{c.name}</option>)}
                </optgroup>
              )}
              {warehouses.length > 0 && (
                <optgroup label="Warehouses" className="bg-muted text-muted-foreground font-bold">
                  {warehouses.filter(w => w.id !== selectedCounterId).map(w => <option key={w.id} value={w.id} className="bg-card font-medium">{w.name}</option>)}
                </optgroup>
              )}
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setShowTransferModal(false)}
              className="flex-1 px-4 py-2.5 bg-muted text-muted-foreground rounded-lg font-bold hover:bg-muted/80 transition-colors"
            >
              Cancel
            </button>
            <button
              disabled={!targetCounterId}
              onClick={() => {
                onTransferAll(filteredCounterInventory, targetCounterId);
                setShowTransferModal(false);
                setTargetCounterId('');
              }}
              className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg font-bold hover:bg-primary/90 disabled:opacity-50 transition-all shadow-sm active:scale-95"
            >
              Confirm Bulk Transfer
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
