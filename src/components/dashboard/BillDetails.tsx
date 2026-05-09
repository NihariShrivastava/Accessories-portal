import { Badge } from './Badge';

interface BillDetailsProps {
  bill: any;
  onClose: () => void;
}

export function BillDetails({ bill, onClose }: BillDetailsProps) {
  if (!bill) return null;

  return (
    <div className="space-y-4">
      {bill.bill_number && (
        <div className="bg-primary/10 border border-primary/20 p-3 rounded-md text-center">
          <p className="text-xs text-primary font-bold uppercase mb-1">Bill Number</p>
          <p className="font-mono text-lg font-bold text-primary">{bill.bill_number}</p>
        </div>
      )}
      
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="bg-muted p-3 rounded-md">
          <p className="text-xs text-muted-foreground uppercase font-bold mb-1">Date</p>
          <p className="font-medium">{new Date(bill.created_at).toLocaleString()}</p>
        </div>
        <div className="bg-muted p-3 rounded-md">
          <p className="text-xs text-muted-foreground uppercase font-bold mb-1">Payment Method</p>
          <Badge variant="secondary">{bill.payment_method || 'Cash'}</Badge>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="bg-muted/30 px-4 py-2 border-b border-border">
          <h4 className="text-xs font-bold uppercase text-muted-foreground">Purchased Items</h4>
        </div>
        <div className="divide-y divide-border">
          {(bill.items || [bill]).map((item: any, idx: number) => (
            <div key={idx} className="p-4 space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-bold text-primary">{item.accessories?.name || item.accessory_name || 'Unknown Item'}</p>
                  <p className="text-xs text-muted-foreground">{item.accessories?.vehicle_model || item.vehicle_model || '-'}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold">x{item.quantity}</p>
                  <p className="text-xs font-medium">₹{((item.total_amount || 0) / (item.quantity || 1)).toFixed(2)} / unit</p>
                </div>
              </div>
              <div className="flex justify-between items-center text-sm pt-1">
                <span className="text-muted-foreground">Item Total</span>
                <span className="font-semibold">₹{item.total_amount?.toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
        <div className="bg-primary/5 border border-primary/10 p-3 rounded-md">
          <p className="text-xs text-primary font-bold uppercase mb-1">Chassis No.</p>
          <p className="font-mono">{bill.chassis_number || 'N/A'}</p>
        </div>
        <div className="bg-primary/5 border border-primary/10 p-3 rounded-md">
          <p className="text-xs text-primary font-bold uppercase mb-1">Engine No.</p>
          <p className="font-mono">{bill.engine_number || 'N/A'}</p>
        </div>
        <div className="bg-primary/5 border border-primary/10 p-3 rounded-md">
          <p className="text-xs text-primary font-bold uppercase mb-1">Checklist No.</p>
          <p className="font-mono">{bill.checklist_number || 'N/A'}</p>
        </div>
      </div>

      <div className="bg-muted/50 p-4 rounded-xl space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Total Amount</span>
          <span className="font-medium">₹{bill.total_amount.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Amount Paid</span>
          <span className="font-medium text-green-600 dark:text-green-400">₹{bill.amount_paid.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-lg font-bold border-t border-border pt-2 mt-2">
          <span className="text-destructive">Balance Left</span>
          <span className="text-destructive">₹{bill.amount_left.toFixed(2)}</span>
        </div>
      </div>

      <button
        onClick={onClose}
        className="w-full bg-secondary text-secondary-foreground py-2 rounded-md hover:bg-secondary/80 font-medium transition-colors"
      >
        Close Details
      </button>
    </div>
  );
}
