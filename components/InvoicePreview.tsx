import React from 'react';
import { InvoiceData, PaymentStatus, LineItem } from '../types';

interface Props {
  invoice: InvoiceData;
}

const formatCurrency = (amount: number, currency: string) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2
  }).format(amount);
};

const StatusBadge: React.FC<{ status: PaymentStatus }> = ({ status }) => {
  const styles = {
    [PaymentStatus.PAID]: 'bg-green-100 text-green-800 border-green-200',
    [PaymentStatus.PENDING]: 'bg-amber-100 text-amber-800 border-amber-200',
    [PaymentStatus.OVERDUE]: 'bg-red-100 text-red-800 border-red-200',
    [PaymentStatus.FAILED]: 'bg-red-100 text-red-800 border-red-200',
  };

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide border ${styles[status]}`}>
      {status}
    </span>
  );
};

const ResponsiveItemsTable: React.FC<{ 
  items: LineItem[]; 
  currency: string;
  headerBg?: string; 
  headerText?: string;
}> = ({ items, currency, headerBg = 'bg-gray-800', headerText = 'text-white' }) => {
  return (
    <>
      {/* Desktop View */}
      <div className="hidden md:block w-full overflow-hidden rounded-lg border border-gray-100">
        <table className="w-full text-left border-collapse table-fixed">
          <thead>
            <tr className={headerBg}>
              <th className={`py-3 px-4 text-sm font-medium ${headerText} w-[20%]`}>Item</th>
              <th className={`py-3 px-4 text-sm font-medium ${headerText} w-[35%]`}>Description</th>
              <th className={`py-3 px-4 text-sm font-medium text-center ${headerText} w-[10%]`}>Qty</th>
              <th className={`py-3 px-4 text-sm font-medium text-right ${headerText} w-[15%]`}>Rate</th>
              <th className={`py-3 px-4 text-sm font-medium text-right ${headerText} w-[20%]`}>Amount</th>
            </tr>
          </thead>
          <tbody className="text-sm text-gray-700 bg-white">
            {items.map((item, idx) => (
              <tr key={item.id} className={`border-b border-gray-100 ${idx % 2 !== 0 ? 'bg-gray-50' : ''}`}>
                <td className="py-4 px-4 font-bold text-gray-900 break-words align-top">{item.name}</td>
                <td className="py-4 px-4 text-gray-600 break-words whitespace-pre-wrap align-top">{item.description}</td>
                <td className="py-4 px-4 text-center text-gray-500 align-top">{item.quantity}</td>
                <td className="py-4 px-4 text-right text-gray-500 align-top">{formatCurrency(Number(item.rate), currency)}</td>
                <td className="py-4 px-4 text-right font-bold text-gray-900 align-top">{formatCurrency(item.amount, currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile View (Card Stack) */}
      <div className="md:hidden space-y-4">
        {items.map((item) => (
          <div key={item.id} className="bg-gray-50 p-4 rounded-lg border border-gray-100 shadow-sm">
            <div className="flex justify-between items-start mb-2">
              <div className="flex flex-col flex-1 mr-2 min-w-0">
                  <span className="font-bold text-gray-900 text-sm break-words">{item.name}</span>
                  <span className="text-gray-500 text-xs mt-1 break-words whitespace-pre-wrap">{item.description}</span>
              </div>
              <span className="font-bold text-gray-900 text-sm whitespace-nowrap">{formatCurrency(item.amount, currency)}</span>
            </div>
            <div className="flex justify-between text-xs text-gray-500 border-t border-gray-200 pt-2 mt-2">
               <div className="flex gap-4">
                 <span>Qty: <span className="text-gray-700 font-medium">{item.quantity}</span></span>
                 <span>Rate: <span className="text-gray-700 font-medium">{formatCurrency(Number(item.rate), currency)}</span></span>
               </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

/**
 * TEMPLATE: MODERN (ONLY SUPPORTED TEMPLATE)
 */
export const InvoicePreview: React.FC<Props> = ({ invoice }) => {
  const hasShippingAddress = invoice.buyerShippingAddress && 
                             invoice.buyerShippingAddress.trim() !== '' && 
                             invoice.buyerShippingAddress !== invoice.buyerAddress;

  return (
    <div className="bg-white w-full p-4 md:p-12 invoice-shadow relative overflow-hidden min-h-full">
      
      {/* Top Header */}
      <div className="flex flex-col-reverse md:flex-row justify-between items-start mb-6 md:mb-8 gap-4 md:gap-0">
        <div className="w-full md:w-auto">
          <h1 className="text-3xl md:text-5xl font-bold text-gray-900 tracking-tight mb-4 uppercase">
            {invoice.type}
          </h1>
          <div className="grid grid-cols-[80px_1fr] md:grid-cols-[100px_1fr] gap-y-1 text-sm">
             <span className="font-bold text-gray-800">Ref #</span>
             <span className="text-gray-600 font-medium break-all">{invoice.invoiceNumber}</span>
             
             <span className="font-bold text-gray-800">Date</span>
             <span className="text-gray-600 font-medium">{invoice.date}</span>
             
             {invoice.type === 'INVOICE' && (
               <>
                 <span className="font-bold text-gray-800">Due Date</span>
                 <span className="text-gray-600 font-medium">{invoice.dueDate}</span>
               </>
             )}
          </div>
        </div>
        
        <div className="w-full md:w-auto text-left md:text-right">
          {invoice.logoUrl ? (
            <img src={invoice.logoUrl} alt="Logo" className="h-12 md:h-16 w-auto object-contain mb-2 md:ml-auto" />
          ) : (
            <h2 className="text-2xl md:text-3xl font-bold" style={{ color: invoice.brandColor }}>{invoice.businessName}</h2>
          )}
        </div>
      </div>

      {/* Addresses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-10">
        
        {/* Seller & Buyer Columns */}
        <div className="space-y-4">
            {/* Seller */}
            <div className="bg-gray-50 p-4 md:p-6 rounded-sm border-l-4" style={{ borderColor: invoice.brandColor }}>
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Billed From</h3>
              <div className="text-sm space-y-1 text-gray-600">
                <p className="font-bold text-gray-900">{invoice.businessName}</p>
                <p>{invoice.sellerName}</p>
                <p className="whitespace-pre-line">{invoice.sellerAddress}</p>
                <div className="mt-3 pt-2 border-t border-gray-200">
                  {invoice.sellerGstin && <p><span className="font-medium">GSTIN:</span> {invoice.sellerGstin}</p>}
                  <p><span className="font-medium">Email:</span> <span className="break-all">{invoice.sellerEmail}</span></p>
                  <p><span className="font-medium">Phone:</span> {invoice.sellerPhone}</p>
                </div>
              </div>
            </div>
        </div>

        <div className="space-y-4">
            {/* Buyer */}
            <div className="bg-gray-50 p-4 md:p-6 rounded-sm border-l-4 border-gray-300">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Billed To</h3>
              <div className="text-sm space-y-1 text-gray-600">
                <p className="font-bold text-gray-900">{invoice.buyerName}</p>
                {invoice.buyerContactPerson && (
                    <p className="italic text-gray-500">Attn: {invoice.buyerContactPerson}</p>
                )}
                <p className="whitespace-pre-line">{invoice.buyerAddress}</p>
                {invoice.buyerPinCode && <p className="text-gray-500">Pin: {invoice.buyerPinCode}</p>}
                
                {/* Place of Supply inline */}
                {invoice.placeOfSupply && (
                    <p className="mt-1"><span className="font-medium text-xs uppercase text-gray-400">Place of Supply:</span> {invoice.placeOfSupply}</p>
                )}

                <div className="mt-3 pt-2 border-t border-gray-200">
                    <p><span className="font-medium">Email:</span> <span className="break-all">{invoice.buyerEmail}</span></p>
                    <p><span className="font-medium">Phone:</span> {invoice.buyerPhone}</p>
                </div>
              </div>
            </div>

            {/* Separate Shipping if exists */}
            {hasShippingAddress && (
                <div className="bg-white p-4 rounded-sm border border-dashed border-gray-300">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Shipped To</h3>
                    <p className="text-sm text-gray-600 whitespace-pre-line">{invoice.buyerShippingAddress}</p>
                </div>
            )}
        </div>
      </div>

      {invoice.type === 'INVOICE' && (
        <div className="flex justify-between items-center mb-6 px-1">
           <div className="text-xs md:text-sm">
              <span className="text-gray-500">Status: </span>
              <StatusBadge status={invoice.status} />
           </div>
        </div>
      )}

      {/* Items */}
      <div className="mb-8">
        <ResponsiveItemsTable 
          items={invoice.items} 
          currency={invoice.currency} 
          headerBg="bg-[#282828]" 
        />
      </div>

      {/* Bottom Section */}
      <div className="flex flex-col md:flex-row gap-8 md:gap-12">
         {/* Notes Only */}
         <div className="flex-1 order-2 md:order-1">
            {invoice.notes && (
               <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                  <h4 className="font-bold text-gray-900 text-sm mb-2">Terms & Conditions</h4>
                  <p className="text-xs text-gray-500 leading-relaxed">{invoice.notes}</p>
               </div>
            )}
         </div>

         {/* Totals */}
         <div className="w-full md:w-1/3 order-1 md:order-2">
            <div className="space-y-3 pb-4 border-b border-gray-100">
               <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Sub Total</span>
                  <span className="font-medium text-gray-900">{formatCurrency(invoice.subtotal, invoice.currency)}</span>
               </div>
               <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tax ({invoice.taxRate}%)</span>
                  <span className="font-medium text-gray-900">{formatCurrency(invoice.taxAmount, invoice.currency)}</span>
               </div>
            </div>
            <div className="pt-4 flex justify-between items-center">
               <span className="text-lg font-bold text-gray-900">Total</span>
               <span className="text-xl md:text-2xl font-bold" style={{ color: invoice.brandColor }}>
                  {formatCurrency(invoice.total, invoice.currency)}
               </span>
            </div>
         </div>
      </div>
    </div>
  );
};