import React from 'react';
import { InvoiceData, PaymentStatus, LineItem } from '../types';
import { QrCodeIcon } from '@heroicons/react/24/outline';

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
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className={headerBg}>
              <th className={`py-3 px-4 text-sm font-medium ${headerText}`}>Item Description</th>
              <th className={`py-3 px-4 text-sm font-medium text-center ${headerText}`}>Qty</th>
              <th className={`py-3 px-4 text-sm font-medium text-right ${headerText}`}>Rate</th>
              <th className={`py-3 px-4 text-sm font-medium text-right ${headerText}`}>Amount</th>
            </tr>
          </thead>
          <tbody className="text-sm text-gray-700 bg-white">
            {items.map((item, idx) => (
              <tr key={item.id} className={`border-b border-gray-100 ${idx % 2 !== 0 ? 'bg-gray-50' : ''}`}>
                <td className="py-4 px-4 font-medium text-gray-900">{item.description}</td>
                <td className="py-4 px-4 text-center text-gray-500">{item.quantity}</td>
                <td className="py-4 px-4 text-right text-gray-500">{formatCurrency(item.rate, currency)}</td>
                <td className="py-4 px-4 text-right font-bold text-gray-900">{formatCurrency(item.amount, currency)}</td>
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
              <span className="font-bold text-gray-900 text-sm flex-1 mr-2">{item.description}</span>
              <span className="font-bold text-gray-900 text-sm whitespace-nowrap">{formatCurrency(item.amount, currency)}</span>
            </div>
            <div className="flex justify-between text-xs text-gray-500 border-t border-gray-200 pt-2 mt-2">
               <div className="flex gap-4">
                 <span>Qty: <span className="text-gray-700 font-medium">{item.quantity}</span></span>
                 <span>Rate: <span className="text-gray-700 font-medium">{formatCurrency(item.rate, currency)}</span></span>
               </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

/**
 * TEMPLATE 1: MODERN (RESPONSIVE)
 */
const ModernTemplate: React.FC<{ invoice: InvoiceData }> = ({ invoice }) => {
  return (
    <div className="bg-white w-full p-4 md:p-12 invoice-shadow relative overflow-hidden min-h-full">
      
      {/* Top Header */}
      <div className="flex flex-col-reverse md:flex-row justify-between items-start mb-6 md:mb-8 gap-4 md:gap-0">
        <div className="w-full md:w-auto">
          <h1 className="text-3xl md:text-5xl font-bold text-gray-900 tracking-tight mb-4">Invoice</h1>
          <div className="grid grid-cols-[80px_1fr] md:grid-cols-[100px_1fr] gap-y-1 text-sm">
             <span className="font-bold text-gray-800">Invoice #</span>
             <span className="text-gray-600 font-medium break-all">{invoice.invoiceNumber}</span>
             
             <span className="font-bold text-gray-800">Date</span>
             <span className="text-gray-600 font-medium">{invoice.date}</span>
             
             <span className="font-bold text-gray-800">Due Date</span>
             <span className="text-gray-600 font-medium">{invoice.dueDate}</span>
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
      <div className="flex flex-col md:flex-row gap-4 md:gap-6 mb-6 md:mb-10">
        <div className="flex-1 bg-gray-50 p-4 md:p-6 rounded-sm border-l-4" style={{ borderColor: invoice.brandColor }}>
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

        <div className="flex-1 bg-gray-50 p-4 md:p-6 rounded-sm border-l-4 border-gray-300">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Billed To</h3>
          <div className="text-sm space-y-1 text-gray-600">
             <p className="font-bold text-gray-900">{invoice.buyerName}</p>
             <p className="whitespace-pre-line">{invoice.buyerAddress}</p>
             <div className="mt-3 pt-2 border-t border-gray-200">
                <p><span className="font-medium">Email:</span> <span className="break-all">{invoice.buyerEmail}</span></p>
                <p><span className="font-medium">Phone:</span> {invoice.buyerPhone}</p>
             </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center mb-6 px-1">
         <div className="text-xs md:text-sm">
            <span className="text-gray-500">Status: </span>
            <StatusBadge status={invoice.status} />
         </div>
      </div>

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
         {/* Bank & Notes */}
         <div className="flex-1 order-2 md:order-1">
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
              <h3 className="text-sm font-bold text-gray-900 mb-3">Bank Details</h3>
              <div className="grid grid-cols-2 gap-y-2 text-xs md:text-sm text-gray-600">
                  <span className="text-gray-500">Account Name</span>
                  <span className="font-medium text-gray-900 break-words">{invoice.businessName}</span>
                  <span className="text-gray-500">Bank</span>
                  <span className="font-medium text-gray-900">HDFC Bank</span>
                  <span className="text-gray-500">Account No.</span>
                  <span className="font-medium text-gray-900">1234567890</span>
                  <span className="text-gray-500">IFSC</span>
                  <span className="font-medium text-gray-900">HDFC0001234</span>
              </div>
            </div>
            
            {invoice.notes && (
               <div className="mt-6">
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
            
            <div className="mt-6 flex justify-center">
                <div className="text-center">
                   <QrCodeIcon className="w-16 h-16 mx-auto text-gray-400 mb-1" />
                   <span className="text-[10px] text-gray-500 uppercase tracking-wider">Scan to Pay</span>
                </div>
            </div>
         </div>
      </div>
    </div>
  );
};

/**
 * TEMPLATE 2: CLASSIC (RESPONSIVE)
 */
const ClassicTemplate: React.FC<{ invoice: InvoiceData }> = ({ invoice }) => {
  return (
    <div className="bg-white w-full p-6 md:p-12 invoice-shadow">
      
      {/* Header */}
      <div className="flex flex-col-reverse md:flex-row justify-between items-start md:items-center mb-8 border-b-2 pb-8 gap-6 md:gap-0" style={{ borderColor: invoice.brandColor }}>
         <div>
            {invoice.logoUrl ? (
               <img src={invoice.logoUrl} alt="Logo" className="h-16 md:h-20 w-auto object-contain" />
            ) : (
               <h1 className="text-2xl md:text-3xl font-serif font-bold" style={{ color: invoice.brandColor }}>{invoice.businessName}</h1>
            )}
         </div>
         <div className="text-left md:text-right w-full md:w-auto">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-gray-800 uppercase tracking-widest mb-2">Invoice</h2>
            <p className="text-gray-500">#{invoice.invoiceNumber}</p>
            <p className="text-gray-500 text-sm mt-1">Date: {invoice.date}</p>
         </div>
      </div>

      {/* Addresses */}
      <div className="flex flex-col md:flex-row gap-6 md:gap-8 mb-8 md:mb-12">
         <div className="w-full md:w-1/2 border p-4 md:p-6 rounded-lg border-gray-200 bg-gray-50">
            <h3 className="text-xs font-bold text-gray-500 uppercase mb-3 border-b border-gray-200 pb-2">From</h3>
            <p className="font-serif font-bold text-lg mb-1">{invoice.sellerName}</p>
            <p className="text-sm text-gray-600">{invoice.sellerAddress}</p>
         </div>
         <div className="w-full md:w-1/2 border p-4 md:p-6 rounded-lg border-gray-200">
            <h3 className="text-xs font-bold text-gray-500 uppercase mb-3 border-b border-gray-200 pb-2">Bill To</h3>
            <p className="font-serif font-bold text-lg mb-1">{invoice.buyerName}</p>
            <p className="text-sm text-gray-600">{invoice.buyerAddress}</p>
         </div>
      </div>

      {/* Items */}
      <div className="mb-8">
        <ResponsiveItemsTable 
          items={invoice.items} 
          currency={invoice.currency} 
          headerBg="bg-gray-800" 
          headerText="text-white font-serif"
        />
      </div>

      {/* Summary */}
      <div className="flex justify-end">
         <div className="w-full md:w-1/2 border border-gray-200 rounded p-4">
            <div className="flex justify-between mb-2 text-sm">
               <span>Subtotal</span>
               <span className="font-medium">{formatCurrency(invoice.subtotal, invoice.currency)}</span>
            </div>
            <div className="flex justify-between mb-2 text-sm">
               <span>Tax ({invoice.taxRate}%)</span>
               <span className="font-medium">{formatCurrency(invoice.taxAmount, invoice.currency)}</span>
            </div>
            <div className="flex justify-between border-t border-gray-200 pt-2 mt-2 text-xl font-serif font-bold" style={{ color: invoice.brandColor }}>
               <span>Total</span>
               <span>{formatCurrency(invoice.total, invoice.currency)}</span>
            </div>
         </div>
      </div>
    </div>
  );
};

/**
 * TEMPLATE 3: MINIMAL (RESPONSIVE)
 */
const MinimalTemplate: React.FC<{ invoice: InvoiceData }> = ({ invoice }) => {
  return (
    <div className="bg-white w-full p-6 md:p-12 invoice-shadow">
      {/* Top */}
      <div className="mb-10 md:mb-16">
         {invoice.logoUrl ? (
           <img src={invoice.logoUrl} alt="Logo" className="h-10 md:h-12 mb-6 md:mb-8 w-auto" />
         ) : (
           <div className="h-10 md:h-12 mb-6 md:mb-8 flex items-center">
              <span className="font-bold text-xl md:text-2xl tracking-tight" style={{ color: invoice.brandColor }}>{invoice.businessName}</span>
           </div>
         )}
         
         <h1 className="text-4xl md:text-6xl font-light text-gray-900 mb-4 tracking-tighter">Invoice.</h1>
         <div className="flex flex-wrap gap-6 md:gap-8 text-sm">
            <div>
               <span className="text-gray-400 block">No.</span>
               <span className="font-medium">{invoice.invoiceNumber}</span>
            </div>
            <div>
               <span className="text-gray-400 block">Date</span>
               <span className="font-medium">{invoice.date}</span>
            </div>
         </div>
      </div>

      {/* Addresses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 mb-10 md:mb-16">
         <div>
            <span className="text-gray-400 text-xs uppercase tracking-widest block mb-4">Bill To</span>
            <p className="text-lg md:text-xl font-medium text-gray-900">{invoice.buyerName}</p>
            <p className="text-gray-500 mt-1">{invoice.buyerAddress}</p>
         </div>
         <div>
            <span className="text-gray-400 text-xs uppercase tracking-widest block mb-4">From</span>
            <p className="text-lg font-medium text-gray-900">{invoice.sellerName}</p>
            <p className="text-gray-500 mt-1">{invoice.sellerAddress}</p>
         </div>
      </div>

      {/* Items - Minimal (Already list-like, but improving mobile view) */}
      <div className="mb-12">
         <div className="hidden md:flex border-b border-gray-100 pb-2 mb-4 text-xs text-gray-400 uppercase tracking-widest">
            <div className="flex-1">Item</div>
            <div className="w-24 text-right">Price</div>
            <div className="w-24 text-right">Total</div>
         </div>
         {/* Mobile Header */}
         <div className="md:hidden border-b border-gray-100 pb-2 mb-4 text-xs text-gray-400 uppercase tracking-widest">
            Items
         </div>

         {invoice.items.map(item => (
            <div key={item.id} className="flex flex-col md:flex-row py-4 border-b border-gray-50 group hover:bg-gray-50 transition-colors gap-2 md:gap-0">
               <div className="flex-1">
                  <p className="font-medium text-gray-900">{item.description}</p>
                  <p className="text-xs text-gray-400">Qty: {item.quantity} <span className="md:hidden">@ {formatCurrency(item.rate, invoice.currency)}</span></p>
               </div>
               <div className="w-24 text-right text-gray-500 hidden md:block">
                  {formatCurrency(item.rate, invoice.currency)}
               </div>
               <div className="w-full md:w-24 text-left md:text-right font-medium text-gray-900">
                  {formatCurrency(item.amount, invoice.currency)}
               </div>
            </div>
         ))}
      </div>

      {/* Total */}
      <div className="flex justify-end items-baseline gap-4">
         <span className="text-gray-400 text-sm">Total Due</span>
         <span className="text-3xl md:text-5xl font-light tracking-tight" style={{ color: invoice.brandColor }}>
            {formatCurrency(invoice.total, invoice.currency)}
         </span>
      </div>
    </div>
  );
};


export const InvoicePreview: React.FC<Props> = ({ invoice }) => {
  switch (invoice.template) {
    case 'classic':
      return <ClassicTemplate invoice={invoice} />;
    case 'minimal':
      return <MinimalTemplate invoice={invoice} />;
    case 'modern':
    default:
      return <ModernTemplate invoice={invoice} />;
  }
};
