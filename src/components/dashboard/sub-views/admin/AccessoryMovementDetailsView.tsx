import { ViewHeader } from '../../ViewHeader';
import { DataTable } from '../../DataTable';
import { Package, Info } from 'lucide-react';
import type { AccessoryMovementReport, AccessoryMovementDetail } from '../../../../hooks/useAdminData';

export function AccessoryMovementDetailsView({
  report,
  onBack
}: {
  report: AccessoryMovementReport;
  onBack: () => void;
}) {
  return (
    <div className="space-y-6">
      <ViewHeader
        title={`${report.counter_name} - Accessory Movement`}
        onBack={onBack}
        icon={Package}
      />
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex gap-3 text-blue-800 dark:text-blue-300">
        <Info className="w-5 h-5 shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-bold mb-1">How is this calculated?</p>
          <ul className="list-disc pl-4 space-y-1">
            <li><strong>Purchased/Assigned:</strong> Represents total stock given to this counter (Calculated as Current Stock + Sold). Stock transferred from warehouses or other counters increases this value.</li>
            <li><strong>Sold:</strong> Total items sold across all bills generated at this counter.</li>
            <li><strong>In Stock:</strong> The current physical inventory available at the counter.</li>
            <li><em>Note: Stock transfers dynamically adjust the 'In Stock' quantity, which in turn reflects in the 'Purchased/Assigned' count. Invoice-to-invoice transfer tracking is not grouped in this aggregate view.</em></li>
          </ul>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 shadow-sm flex flex-col justify-center items-start">
          <p className="text-sm font-semibold text-muted-foreground mb-1">Total Purchased/Assigned (In-Count)</p>
          <p className="text-2xl font-black text-primary">{report.total_in_count.toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 shadow-sm flex flex-col justify-center items-start">
          <p className="text-sm font-semibold text-muted-foreground mb-1">Total Sold (Out-Count)</p>
          <p className="text-2xl font-black text-primary">{report.total_out_count.toLocaleString('en-IN')}</p>
        </div>
      </div>
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/30">
          <h2 className="text-lg font-bold">Accessory Breakdown</h2>
        </div>
        <DataTable<AccessoryMovementDetail>
          idAccessor="accessory_name"
          data={report.accessories}
          columns={[
            { header: 'Accessory Name', accessor: 'accessory_name', sortAccessor: 'accessory_name', className: 'text-left font-medium' },
            { header: 'Vehicle Model', accessor: 'vehicle_model', sortAccessor: 'vehicle_model', className: 'text-left text-muted-foreground' },
            { header: 'Purchased/Assigned', accessor: 'in_count', sortAccessor: 'in_count', className: 'text-center font-bold text-primary' },
            { header: 'Sold', accessor: 'out_count', sortAccessor: 'out_count', className: 'text-center font-bold text-orange-600 dark:text-orange-500' },
            { header: 'In Stock', accessor: 'current_quantity', sortAccessor: 'current_quantity', className: 'text-center font-bold' }
          ]}
        />
      </div>
    </div>
  );
}
