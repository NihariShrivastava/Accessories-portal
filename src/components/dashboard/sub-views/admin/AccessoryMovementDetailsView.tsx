import { ViewHeader } from '../../ViewHeader';
import { DataTable } from '../../DataTable';
import { Package } from 'lucide-react';
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 shadow-sm flex flex-col justify-center items-start">
          <p className="text-sm font-semibold text-muted-foreground mb-1">Total Assigned (In-Count)</p>
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
            { header: 'In-Count (Assigned)', accessor: 'in_count', sortAccessor: 'in_count', className: 'text-center font-bold text-primary' },
            { header: 'Out-Count (Sold)', accessor: 'out_count', sortAccessor: 'out_count', className: 'text-center font-bold text-orange-600 dark:text-orange-500' },
            { header: 'Current Stock', accessor: 'current_quantity', sortAccessor: 'current_quantity', className: 'text-center' }
          ]}
        />
      </div>
    </div>
  );
}
