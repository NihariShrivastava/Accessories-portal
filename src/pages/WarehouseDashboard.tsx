import { useAuth } from '../components/auth-provider';
import { useWarehouseData } from '../hooks/useWarehouseData';
import { Package, Search, Box } from 'lucide-react';
import { DataTable } from '../components/dashboard/DataTable';

export function WarehouseDashboard() {
  const { user } = useAuth();
  const { inventory, totalCount, totalModels, searchQuery, handleSearch } = useWarehouseData(user);
  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        <div className="flex flex-col items-center justify-center py-2 space-y-1 mb-8">
          <div className="flex items-center gap-2 text-primary/60">
            <Package className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Active Session</span>
          </div>
          <h1 className="text-2xl font-black uppercase tracking-tight text-center">
            WAREHOUSE: <span className="text-primary">"{user?.name || 'Unknown'}"</span>
          </h1>
          <div className="w-12 h-1 bg-primary rounded-full mt-2" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-card rounded-xl border border-border p-6 flex items-center gap-4 shadow-sm hover:shadow-md transition-all">
            <div className="p-4 bg-primary/10 rounded-xl">
              <Package className="w-8 h-8 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Accessories</p>
              <h3 className="text-3xl font-black text-foreground">{totalCount}</h3>
            </div>
          </div>
          <div className="bg-card rounded-xl border border-border p-6 flex items-center gap-4 shadow-sm hover:shadow-md transition-all">
            <div className="p-4 bg-indigo-500/10 rounded-xl">
              <Box className="w-8 h-8 text-indigo-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Vehicle Models</p>
              <h3 className="text-3xl font-black text-foreground">{totalModels}</h3>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-border bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-4">
            <h2 className="text-lg font-bold text-foreground">Inventory List</h2>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search accessories, code, model..."
                className="w-full pl-9 pr-4 py-2 rounded-lg bg-background border border-border focus:ring-2 focus:ring-primary/20 outline-none text-sm transition-all"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex-1">
            <DataTable 
              idAccessor="id"
              data={inventory}
              columns={[
                {
                  header: 'Vehicle Model',
                  accessor: 'vehicle_model',
                  className: 'font-semibold text-primary'
                },
                {
                  header: 'Accessory Name',
                  accessor: 'name'
                },
                {
                  header: 'Part Number',
                  accessor: (row) => <span className="font-mono text-xs">{row.accessory_code || '-'}</span>
                },
                {
                  header: 'Price (₹)',
                  accessor: (row) => <span className="font-semibold">{row.price.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</span>
                },
                {
                  header: 'Stock Quantity',
                  accessor: (row) => (
                    <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-bold ${
                      row.quantity > 5 
                        ? 'bg-green-100 text-green-700 border border-green-200' 
                        : row.quantity > 0 
                          ? 'bg-amber-100 text-amber-700 border border-amber-200'
                          : 'bg-red-100 text-red-700 border border-red-200'
                    }`}>
                      {row.quantity}
                    </span>
                  ),
                  className: 'text-right'
                }
              ]}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
