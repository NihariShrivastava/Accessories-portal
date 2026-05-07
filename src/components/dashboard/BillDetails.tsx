import { Badge } from './Badge';

interface BillDetailsProps {
  bill: any;
  onClose: () => void;
}

export function BillDetails({ bill, onClose }: BillDetailsProps) {
  if (!bill) return null;

  return (
    <div className="space-y-4">
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

      <div className="bg-card border border-border rounded-lg p-4 space-y-3">
        <div className="flex justify-between items-center border-b border-border pb-2">
          <span className="text-muted-foreground">Accessory</span>
          <span className="font-bold">{bill.accessories?.name || bill.accessory_name}</span>
        </div>
        <div className="flex justify-between items-center border-b border-border pb-2">
          <span className="text-muted-foreground">Vehicle Model</span>
          <span className="font-medium">{bill.accessories?.vehicle_model || bill.vehicle_model}</span>
        </div>
        <div className="flex justify-between items-center border-b border-border pb-2">
          <span className="text-muted-foreground">Quantity</span>
          <span className="font-bold">{bill.quantity}</span>
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
