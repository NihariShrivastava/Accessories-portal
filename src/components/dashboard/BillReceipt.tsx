
import type { Bill } from '../../hooks/useCounterData';
// @ts-ignore
import html2pdf from 'html2pdf.js';

interface BillReceiptProps {
  bill: Bill;
  onClose: () => void;
}

export function BillReceipt({ bill, onClose }: BillReceiptProps) {
  const billNumber = bill.bill_number || 'PENDING';

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    const element = document.getElementById('receipt-content');
    
    // We hide the buttons before generating the PDF, though we could also put them outside the targeted element.
    // It's cleaner to just put the buttons OUTSIDE the targeted element.
    
    const opt = {
      margin:       [10, 0], // 10mm top/bottom (for every page), 0 left/right to prevent scaling issues
      filename:     `Bill_Receipt_${billNumber}.pdf`,
      image:        { type: 'jpeg', quality: 1 },
      html2canvas:  { scale: 2, useCORS: true, windowWidth: 1200, scrollX: 0, scrollY: 0 },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak:    { mode: 'css', avoid: '.page-break-avoid' }
    };

    // @ts-ignore
    html2pdf().set(opt as any).from(element).save();
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const createdDate = formatDate(bill.created_at);
  const chassis = bill.chassis_number || '-';
  const engine = bill.engine_number || '-';
  const checklist = bill.checklist_number || '-';
  
  // Use the primary model for header, or "MULTIPLE ACCESSORIES" if many
  const models = bill.items 
    ? Array.from(new Set(bill.items.map(i => i.accessories?.vehicle_model))).join(', ') 
    : bill.accessories?.vehicle_model || '-';

  const baseAmount = bill.base_amount || 0;
  const cgstAmount = bill.cgst_amount || 0;
  const sgstAmount = bill.sgst_amount || 0;
  const totalAmount = bill.total_amount || 0;
  const amountPaid = bill.amount_paid ?? totalAmount;
  const amountLeft = bill.amount_left ?? 0;

  const payments = bill.payment_details && Array.isArray(bill.payment_details) && bill.payment_details.length > 0 
    ? bill.payment_details 
    : [{ method: bill.payment_method || 'Cash', amount: amountPaid, utr: '' }];

  return (
    <>
      <style type="text/css" media="print">{`
        @page { size: A4 portrait; margin: 10mm; }
        body { background: white !important; }
        /* Hide everything else if needed, though print:hidden handles most */
      `}</style>
      <div className="min-h-screen flex flex-col items-center py-8 bg-gray-100 print:bg-white print:block print:py-0 print:min-h-0">
        
        {/* Top Action Bar (Outside the PDF content) */}
      <div className="w-full max-w-4xl flex justify-end gap-3 mb-4 px-4 print:hidden">
        <button onClick={handlePrint} className="px-6 py-2.5 rounded-md text-sm font-bold shadow-md transition-colors hover:opacity-90" style={{ backgroundColor: '#4338ca', color: '#ffffff' }}>
          Print
        </button>
        <button onClick={handleDownload} className="px-6 py-2.5 rounded-md text-sm font-bold shadow-md transition-colors hover:opacity-90" style={{ backgroundColor: '#000000', color: '#ffffff' }}>
          Download PDF
        </button>
        <button onClick={onClose} className="px-6 py-2.5 rounded-md text-sm font-bold border shadow-md transition-colors hover:bg-gray-200" style={{ backgroundColor: '#ffffff', color: '#000000', borderColor: '#d1d5db' }}>
          Close
        </button>
      </div>

      <div 
        id="receipt-content"
        className="w-[794px] shadow-2xl relative px-12 py-4 mx-auto print:w-full print:max-w-none print:shadow-none print:px-0 print:py-0 print:mx-0"
        style={{ backgroundColor: '#ffffff', color: '#1a202c' }}
      >
        
        {/* Header */}
        <div className="text-center mb-3">
          <h1 className="text-[28px] font-black tracking-tight leading-tight uppercase" style={{ color: '#1a202c' }}>Classy Rides Pvt. Ltd.</h1>
          <p className="text-[9px] font-bold tracking-[0.2em] uppercase" style={{ color: '#6b7280' }}>Authorised Automotive Dealer — Bill Receipt</p>
        </div>

        <div className="border-t-[3px] mb-3" style={{ borderColor: '#1a202c' }}></div>

        {/* Metadata */}
        <div className="flex justify-between text-[10px] font-mono mb-4 font-semibold page-break-avoid" style={{ color: '#6b7280' }}>
          <div className="space-y-1">
            <p>Receipt ID: <span style={{ color: '#374151' }}>{billNumber}</span></p>
            <p>Created: <span style={{ color: '#374151' }}>{createdDate}</span></p>
          </div>
          <div className="text-right space-y-1">
            <p>Checklist No: <span style={{ color: '#374151' }}>{checklist}</span></p>
            <p>Chassis No: <span style={{ color: '#374151' }}>{chassis}</span></p>
            <p>Engine No: <span style={{ color: '#374151' }}>{engine}</span></p>
          </div>
        </div>

        {/* Customer & Item Details */}
        <div className="grid grid-cols-2 gap-6 mb-4 page-break-avoid">
          <div>
            <h3 className="text-[9px] font-bold tracking-wider uppercase mb-1" style={{ color: '#6b7280' }}>BILL TO CUSTOMER:</h3>
            <p className="text-[15px] font-extrabold mb-1" style={{ color: '#1a202c' }}>{bill.customer_name || 'N/A'}</p>
            <p className="text-[11px] font-medium" style={{ color: '#4b5563' }}>Phone: <span style={{ color: '#111827' }}>{bill.customer_phone || 'N/A'}</span></p>
            <p className="text-[11px] font-bold mt-1" style={{ color: '#3182ce' }}>Cust ID: {bill.customer_id || 'N/A'}</p>
          </div>
          <div className="text-right">
            <h3 className="text-[9px] font-bold tracking-wider uppercase mb-1" style={{ color: '#6b7280' }}>ITEM DETAILS:</h3>
            <p className="text-[15px] font-extrabold mb-1 uppercase" style={{ color: '#1a202c' }}>ACCESSORIES</p>
            <p className="text-[11px] font-medium" style={{ color: '#4b5563' }}>Model: <span style={{ color: '#111827' }}>{models}</span></p>
          </div>
        </div>

        <div className="border-t mb-2" style={{ borderColor: '#f3f4f6' }}></div>

        {/* Table Header */}
        <div className="flex justify-between py-2 text-[9px] font-bold tracking-wider uppercase border-b page-break-avoid" style={{ color: '#1a202c', borderColor: '#e5e7eb' }}>
          <span>DESCRIPTION</span>
          <span>VALUE (INR)</span>
        </div>

        {/* Table Body */}
        <div className="space-y-2 mb-4 pt-2">
          <div className="page-break-avoid">
            <h4 className="text-[10px] font-bold tracking-wider uppercase mb-1.5" style={{ color: '#4338ca' }}>PART A (REGISTRATION, TAX & INSURANCE)</h4>
          </div>
          <div className="space-y-2 text-[11px] font-medium" style={{ color: '#1a202c' }}>
            {bill.items && bill.items.length > 0 ? (
              bill.items.map((item, idx) => (
                <div key={idx} className="flex flex-col mb-1.5 page-break-avoid border-b pb-1" style={{ borderColor: '#f3f4f6' }}>
                  <div className="flex justify-between font-bold mb-1 text-[12px]">
                    <span>{item.accessories?.name || 'Item'} (x{item.quantity})</span>
                    <span>₹{((item.base_amount || 0) + (item.cgst_amount || 0) + (item.sgst_amount || 0)).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                  </div>
                    <div className="flex justify-between pl-4 py-0.5 text-[10px]" style={{ color: '#4b5563' }}>
                      <span>Ex-Showroom Price (Base)</span>
                      <span>₹{(item.base_amount || 0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                    </div>
                    {(item.cgst_amount || 0) > 0 && (
                      <div className="flex justify-between pl-4 py-0.5 text-[10px]" style={{ color: '#4b5563' }}>
                        <span>CGST</span>
                        <span>₹{(item.cgst_amount || 0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                      </div>
                    )}
                    {(item.sgst_amount || 0) > 0 && (
                      <div className="flex justify-between pl-4 py-0.5 text-[10px]" style={{ color: '#4b5563' }}>
                        <span>SGST</span>
                        <span>₹{(item.sgst_amount || 0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="space-y-1 page-break-avoid">
                  <div className="flex justify-between" style={{ color: '#4b5563' }}>
                    <span>Ex-Showroom Price (Base)</span>
                    <span>₹{baseAmount.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                  </div>
                  {cgstAmount > 0 && (
                    <div className="flex justify-between" style={{ color: '#4b5563' }}>
                      <span>CGST</span>
                      <span>₹{cgstAmount.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                    </div>
                  )}
                  {sgstAmount > 0 && (
                    <div className="flex justify-between" style={{ color: '#4b5563' }}>
                      <span>SGST</span>
                      <span>₹{sgstAmount.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                    </div>
                  )}
                </div>
              )}
          </div>

          <div className="pt-2 page-break-avoid">
            <h4 className="text-[10px] font-bold tracking-wider uppercase mb-1" style={{ color: '#4338ca' }}>PART B (OTHER FEES & ACCESSORIES)</h4>
            <div className="space-y-1.5 text-[11px] font-medium" style={{ color: '#4b5563' }}>
              <div className="flex justify-between">
                <span>Exchange Value (Discount)</span>
                <span style={{ color: '#e53e3e' }}>-₹0.00</span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t-[3px] mb-1 page-break-avoid" style={{ borderColor: '#1a202c' }}></div>

        {/* Totals */}
        <div className="flex justify-between py-1.5 items-center page-break-avoid">
          <span className="text-[13px] font-black uppercase tracking-tight" style={{ color: '#1a202c' }}>TOTAL RECEIVABLE AMOUNT</span>
          <span className="text-[14px] font-black" style={{ color: '#1a202c' }}>₹{totalAmount.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
        </div>

        <div className="border-t-[3px] mb-4 page-break-avoid" style={{ borderColor: '#1a202c' }}></div>

        {/* Payments Block */}
        <div className="border rounded-xl p-3 mb-4 page-break-avoid" style={{ backgroundColor: '#f9fafb', borderColor: '#e5e7eb' }}>
          <div className="space-y-1.5">
            {payments.map((p: any, idx: number) => (
              <div key={idx} className="flex justify-between text-[11px] font-semibold" style={{ color: '#4a5568' }}>
                <span>Payment Via {p.method} {p.utr ? `— Ref/UTR: ${p.utr}` : ''}</span>
                <span className="font-bold" style={{ color: '#1a202c' }}>₹{Number(p.amount).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
              </div>
            ))}
          </div>
          <div className="border-t my-2" style={{ borderColor: '#e5e7eb' }}></div>
          <div className="flex justify-between items-center">
            <span className="font-black uppercase tracking-tight text-[13px]" style={{ color: '#1a202c' }}>TOTAL RECEIVED AMOUNT</span>
            <span className="font-black text-[13px]" style={{ color: '#38a169' }}>₹{amountPaid.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
          </div>
        </div>

        {/* Final Summary */}
        <div className="space-y-1.5 text-[11px] font-semibold mb-3 page-break-avoid" style={{ color: '#4a5568' }}>
          <div className="flex justify-between">
            <span>Total Receivable Amount</span>
            <span className="font-bold" style={{ color: '#1a202c' }}>₹{totalAmount.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
          </div>
          <div className="flex justify-between">
            <span>Total Received Amount</span>
            <span className="font-bold" style={{ color: '#38a169' }}>₹{amountPaid.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
          </div>
        </div>

        <div className="border-t mb-3 page-break-avoid" style={{ borderColor: '#e5e7eb' }}></div>

        {/* Balance Status */}
        <div className="flex justify-between items-center mb-8 page-break-avoid">
          <span className="text-[14px] font-black uppercase tracking-tight" style={{ color: '#1a202c' }}>NET BALANCE OFF</span>
          <span className="text-[14px] font-black tracking-widest" style={{ color: amountLeft <= 0 ? '#38a169' : '#e53e3e' }}>
            ₹{amountLeft.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})} {amountLeft <= 0 ? '(FULLY PAID)' : '(DUE)'}
          </span>
        </div>

        <div className="border-t border-dashed mb-8 page-break-avoid" style={{ borderColor: '#d1d5db' }}></div>

        {/* Signatures */}
        <div className="flex justify-between px-8 text-[9px] font-bold tracking-wider uppercase mt-auto page-break-avoid" style={{ color: '#6b7280' }}>
          <div className="text-center">
            <div className="w-40 border-t mb-2" style={{ borderColor: '#9ca3af' }}></div>
            <span>CUSTOMER SIGN</span>
          </div>
          <div className="text-center">
            <div className="w-40 border-t mb-2" style={{ borderColor: '#9ca3af' }}></div>
            <span>OPERATOR DESK</span>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-[8px] page-break-avoid" style={{ color: '#9ca3af' }}>
          Bill generated by Accessory Portal, <a href="https://accessoriesportal.viewwork.workers.dev/" style={{ color: '#3182ce', textDecoration: 'none' }}>https://accessoriesportal.viewwork.workers.dev/</a>
        </div>

      </div>
    </div>
    </>
  );
}
