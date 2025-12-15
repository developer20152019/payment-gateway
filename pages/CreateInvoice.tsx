import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { InvoiceData, PaymentStatus, LineItem, Product, Customer, SellerProfile, DocumentType } from '../types';
import { InvoiceService } from '../services/invoiceService';
import { ProductService } from '../services/productService';
import { CustomerService } from '../services/customerService';
import { SettingsService } from '../services/settingsService';
import { PlusIcon, TrashIcon, ChevronLeftIcon, PaperAirplaneIcon, CalculatorIcon } from '@heroicons/react/24/outline';

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", 
  "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", 
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", 
  "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", "Chandigarh", 
  "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
];

const CreateInvoice: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  
  const [invoice, setInvoice] = useState<InvoiceData>({
    id: '',
    invoiceNumber: '',
    type: 'INVOICE',
    date: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    template: 'modern',
    brandColor: '#4f46e5',
    sellerName: '',
    businessName: '',
    sellerAddress: '',
    sellerGstin: '',
    sellerEmail: '',
    sellerPhone: '',
    buyerName: '',
    buyerContactPerson: '',
    buyerEmail: '',
    buyerPhone: '',
    buyerAddress: '',
    buyerShippingAddress: '',
    placeOfSupply: '',
    buyerPinCode: '',
    items: [],
    subtotal: 0,
    taxRate: 0,
    taxAmount: 0,
    total: 0,
    currency: 'INR',
    status: PaymentStatus.PENDING,
    paymentGateway: 'CCAvenue'
  });

  // Load Data
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      try {
        const [loadedProducts, loadedCustomers, sellerProfile] = await Promise.all([
          ProductService.getAllProducts(),
          CustomerService.getAllCustomers(),
          SettingsService.getSellerProfile()
        ]);

        setProducts(loadedProducts);
        setCustomers(loadedCustomers);

        if (id) {
          const data = await InvoiceService.getInvoiceById(id);
          if (data) {
            setInvoice(data);
          } else {
            alert("Invoice not found");
            navigate('/');
          }
        } else {
          // Initialize new invoice
          const invNum = `INV-${Date.now().toString().slice(-6)}`;
          setInvoice(prev => ({
            ...prev,
            id: `inv_${Date.now()}`,
            invoiceNumber: invNum,
            brandColor: sellerProfile?.brandColor || '#4f46e5',
            logoUrl: sellerProfile?.logoUrl,
            sellerName: sellerProfile?.sellerName || '',
            businessName: sellerProfile?.businessName || '',
            sellerAddress: sellerProfile?.sellerAddress || '',
            sellerGstin: sellerProfile?.sellerGstin || '',
            sellerEmail: sellerProfile?.sellerEmail || '',
            sellerPhone: sellerProfile?.sellerPhone || '',
          }));
        }
      } catch (error) {
        console.error(error);
        alert("Failed to load data");
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, [id, navigate]);

  // Calculations
  useEffect(() => {
    const subtotal = invoice.items.reduce((sum, item) => sum + item.amount, 0);
    const taxAmount = (subtotal * invoice.taxRate) / 100;
    const total = subtotal + taxAmount;
    
    setInvoice(prev => ({
        ...prev,
        subtotal,
        taxAmount,
        total
    }));
  }, [invoice.items, invoice.taxRate]);

  const handleInputChange = (field: keyof InvoiceData, value: any) => {
    setInvoice(prev => ({ ...prev, [field]: value }));
  };

  const handleItemChange = (index: number, field: keyof LineItem, value: any) => {
    const newItems = [...invoice.items];
    const item = { ...newItems[index], [field]: value };
    
    // Recalculate amount
    if (field === 'quantity' || field === 'rate') {
       item.amount = Number(item.quantity) * Number(item.rate);
    }
    
    newItems[index] = item;
    setInvoice(prev => ({ ...prev, items: newItems }));
  };

  const addItem = () => {
    const newItem: LineItem = {
      id: `item_${Date.now()}`,
      name: '',
      description: '',
      quantity: 1,
      rate: 0,
      amount: 0
    };
    setInvoice(prev => ({ ...prev, items: [...prev.items, newItem] }));
  };

  const removeItem = (index: number) => {
    const newItems = [...invoice.items];
    newItems.splice(index, 1);
    setInvoice(prev => ({ ...prev, items: newItems }));
  };

  const handleProductSelect = (index: number, productName: string) => {
      const product = products.find(p => p.name === productName);
      if (product) {
          const newItems = [...invoice.items];
          newItems[index] = {
              ...newItems[index],
              name: product.name,
              description: product.description,
              rate: product.rate,
              amount: Number(newItems[index].quantity) * product.rate
          };
          setInvoice(prev => ({ ...prev, items: newItems }));
      } else {
          // Just update name if not found (custom item)
          handleItemChange(index, 'name', productName);
      }
  };

  const handleCustomerSelect = (customerName: string) => {
      const customer = customers.find(c => c.name === customerName);
      if (customer) {
          setInvoice(prev => ({
              ...prev,
              buyerName: customer.name,
              buyerContactPerson: customer.contactPerson || '',
              buyerEmail: customer.email,
              buyerPhone: customer.phone,
              buyerAddress: customer.address,
              buyerShippingAddress: customer.shippingAddress || customer.address,
              placeOfSupply: customer.placeOfSupply || '',
              buyerPinCode: customer.pinCode || ''
          }));
      } else {
          handleInputChange('buyerName', customerName);
      }
  };

  const handleSave = async (sendEmail = false) => {
      if(!invoice.buyerName || invoice.items.length === 0) {
          alert("Please fill in buyer details and add at least one item.");
          return;
      }
      setIsSaving(true);
      try {
          await InvoiceService.saveInvoice(invoice);
          if (sendEmail) {
              // Navigate to view with state to trigger email
              navigate(`/view/${invoice.id}`, { state: { autoSendEmail: true, emailType: 'CREATED' } });
          } else {
              navigate(`/view/${invoice.id}`);
          }
      } catch (e) {
          console.error(e);
          alert("Failed to save invoice.");
      } finally {
          setIsSaving(false);
      }
  };

  // Filter customers for autocomplete
  const filteredCustomers = customers.filter(c => 
    (c.name || '').toLowerCase().includes((invoice.buyerName || '').toLowerCase())
  );

  if (isLoading) {
      return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
       {/* Navbar */}
       <nav className="bg-white border-b border-gray-200 px-4 md:px-6 py-4 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <button 
             onClick={() => navigate('/')}
             className="text-gray-500 hover:text-gray-800 flex items-center gap-1 text-sm font-medium"
          >
             <ChevronLeftIcon className="w-4 h-4" /> Cancel
          </button>
          
          <div className="flex gap-2">
             <button 
                onClick={() => handleSave(false)}
                disabled={isSaving}
                className="px-4 py-2 border border-gray-300 bg-white text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
             >
                Save Draft
             </button>
             <button 
                onClick={() => handleSave(true)}
                disabled={isSaving}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center gap-2 disabled:opacity-50"
             >
                {isSaving ? 'Saving...' : <><PaperAirplaneIcon className="w-4 h-4"/> Save & Send</>}
             </button>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 mt-8 space-y-6">
         
         {/* Document Info Card */}
         <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
             <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                 <div>
                     <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Type</label>
                     <select 
                        className="w-full border-gray-300 rounded-lg text-sm"
                        value={invoice.type}
                        onChange={(e) => handleInputChange('type', e.target.value)}
                     >
                         <option value="INVOICE">Tax Invoice</option>
                         <option value="QUOTATION">Quotation / Estimate</option>
                     </select>
                 </div>
                 <div>
                     <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Number</label>
                     <input 
                        type="text" 
                        className="w-full border-gray-300 rounded-lg text-sm font-medium"
                        value={invoice.invoiceNumber}
                        onChange={(e) => handleInputChange('invoiceNumber', e.target.value)}
                     />
                 </div>
                 <div>
                     <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Date</label>
                     <input 
                        type="date" 
                        className="w-full border-gray-300 rounded-lg text-sm"
                        value={invoice.date}
                        onChange={(e) => handleInputChange('date', e.target.value)}
                     />
                 </div>
                 <div>
                     <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Due Date</label>
                     <input 
                        type="date" 
                        className="w-full border-gray-300 rounded-lg text-sm"
                        value={invoice.dueDate}
                        onChange={(e) => handleInputChange('dueDate', e.target.value)}
                     />
                 </div>
             </div>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             {/* Billed By (ReadOnly / Settings Link) */}
             <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                 <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-gray-900">Billed By</h3>
                    <button onClick={() => navigate('/settings')} className="text-xs text-indigo-600 hover:underline">Edit Profile</button>
                 </div>
                 <div className="space-y-2 text-sm">
                     <p className="font-medium text-gray-900">{invoice.businessName || 'Business Name'}</p>
                     <p className="text-gray-500">{invoice.sellerName}</p>
                     <p className="text-gray-500 whitespace-pre-line">{invoice.sellerAddress}</p>
                     {invoice.sellerGstin && <p className="text-gray-500"><span className="font-medium">GSTIN:</span> {invoice.sellerGstin}</p>}
                 </div>
             </div>

             {/* Billed To */}
             <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                 <h3 className="font-bold text-gray-900 mb-4">Billed To</h3>
                 <div className="space-y-3">
                     <div className="relative group">
                         <input 
                            type="text" 
                            className="w-full border-gray-300 rounded-lg text-sm placeholder-gray-400"
                            placeholder="Client Name / Company"
                            value={invoice.buyerName}
                            onChange={(e) => handleCustomerSelect(e.target.value)}
                            list="customer-list"
                         />
                         <datalist id="customer-list">
                             {customers.map(c => <option key={c.id} value={c.name} />)}
                         </datalist>
                     </div>
                     <div className="grid grid-cols-2 gap-3">
                        <input 
                            type="email" 
                            className="w-full border-gray-300 rounded-lg text-sm placeholder-gray-400"
                            placeholder="Email Address"
                            value={invoice.buyerEmail}
                            onChange={(e) => handleInputChange('buyerEmail', e.target.value)}
                        />
                        <input 
                            type="text" 
                            className="w-full border-gray-300 rounded-lg text-sm placeholder-gray-400"
                            placeholder="Phone"
                            value={invoice.buyerPhone}
                            onChange={(e) => handleInputChange('buyerPhone', e.target.value)}
                        />
                     </div>
                     <textarea 
                        className="w-full border-gray-300 rounded-lg text-sm placeholder-gray-400 resize-none"
                        rows={2}
                        placeholder="Billing Address"
                        value={invoice.buyerAddress}
                        onChange={(e) => handleInputChange('buyerAddress', e.target.value)}
                     />
                     <div className="grid grid-cols-2 gap-3">
                        <select
                            className="w-full border-gray-300 rounded-lg text-sm text-gray-600"
                            value={invoice.placeOfSupply}
                            onChange={(e) => handleInputChange('placeOfSupply', e.target.value)}
                        >
                            <option value="">Place of Supply</option>
                            {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <input 
                            type="text" 
                            className="w-full border-gray-300 rounded-lg text-sm placeholder-gray-400"
                            placeholder="Pin Code"
                            value={invoice.buyerPinCode}
                            onChange={(e) => handleInputChange('buyerPinCode', e.target.value)}
                        />
                     </div>
                 </div>
             </div>
         </div>

         {/* Items */}
         <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
             <h3 className="font-bold text-gray-900 mb-4">Items</h3>
             <div className="space-y-4">
                 {/* Desktop Header */}
                 <div className="hidden md:grid grid-cols-12 gap-4 text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 px-2">
                     <div className="col-span-5">Item Details</div>
                     <div className="col-span-2 text-center">Qty</div>
                     <div className="col-span-2 text-right">Rate</div>
                     <div className="col-span-2 text-right">Amount</div>
                     <div className="col-span-1"></div>
                 </div>

                 {invoice.items.map((item, index) => (
                     <div key={item.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start bg-gray-50 md:bg-white p-4 md:p-0 rounded-lg border md:border-0 border-gray-100 relative group">
                         <div className="md:col-span-5 space-y-2">
                             <input 
                                type="text" 
                                className="w-full border-gray-300 rounded-lg text-sm font-medium placeholder-gray-400"
                                placeholder="Item Name"
                                value={item.name}
                                onChange={(e) => handleProductSelect(index, e.target.value)}
                                list={`products-list-${index}`}
                             />
                             <datalist id={`products-list-${index}`}>
                                 {products.map(p => <option key={p.id} value={p.name} />)}
                             </datalist>
                             <textarea 
                                className="w-full border-gray-300 rounded-lg text-sm placeholder-gray-400 resize-none h-10 md:h-auto"
                                rows={2}
                                placeholder="Description"
                                value={item.description}
                                onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                             />
                         </div>
                         <div className="grid grid-cols-2 md:block md:col-span-2 gap-4">
                             <label className="md:hidden text-xs font-bold text-gray-500">Qty</label>
                             <input 
                                type="number" 
                                min="1"
                                className="w-full border-gray-300 rounded-lg text-sm text-center"
                                value={item.quantity}
                                onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                             />
                         </div>
                         <div className="grid grid-cols-2 md:block md:col-span-2 gap-4">
                             <label className="md:hidden text-xs font-bold text-gray-500">Rate</label>
                             <input 
                                type="number" 
                                min="0"
                                step="0.01"
                                className="w-full border-gray-300 rounded-lg text-sm text-right"
                                value={item.rate}
                                onChange={(e) => handleItemChange(index, 'rate', parseFloat(e.target.value) || 0)}
                             />
                         </div>
                         <div className="grid grid-cols-2 md:block md:col-span-2 gap-4">
                             <label className="md:hidden text-xs font-bold text-gray-500">Amount</label>
                             <div className="w-full py-2 px-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-right font-medium text-gray-700">
                                 {item.amount.toFixed(2)}
                             </div>
                         </div>
                         <div className="absolute top-2 right-2 md:relative md:top-0 md:right-0 md:col-span-1 md:text-right">
                             <button 
                                onClick={() => removeItem(index)}
                                className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-full transition-colors"
                             >
                                 <TrashIcon className="w-5 h-5" />
                             </button>
                         </div>
                     </div>
                 ))}

                 <button 
                    onClick={addItem}
                    className="w-full md:w-auto flex items-center justify-center gap-2 text-indigo-600 hover:text-indigo-800 font-medium text-sm py-2 px-4 rounded-lg border border-dashed border-indigo-300 hover:bg-indigo-50 hover:border-indigo-400 transition-all"
                 >
                     <PlusIcon className="w-4 h-4" /> Add Item
                 </button>
             </div>
         </div>

         {/* Footer / Totals */}
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="space-y-4">
                 <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                     <h3 className="font-bold text-gray-900 mb-2">Terms & Notes</h3>
                     <textarea 
                        className="w-full border-gray-300 rounded-lg text-sm placeholder-gray-400 resize-none h-32"
                        placeholder="Payment terms, bank details, or thank you note..."
                        value={invoice.notes}
                        onChange={(e) => handleInputChange('notes', e.target.value)}
                     />
                 </div>
                 
                 <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                     <h3 className="font-bold text-gray-900 mb-2">Payment Settings</h3>
                     <div>
                         <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Payment Gateway</label>
                         <select 
                            className="w-full border-gray-300 rounded-lg text-sm"
                            value={invoice.paymentGateway}
                            onChange={(e) => handleInputChange('paymentGateway', e.target.value)}
                         >
                             <option value="CCAvenue">CCAvenue</option>
                             <option value="Razorpay">Razorpay</option>
                             <option value="CASH">Cash / Offline</option>
                         </select>
                     </div>
                 </div>
             </div>

             <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 h-fit">
                 <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                     <CalculatorIcon className="w-5 h-5 text-gray-400"/> Summary
                 </h3>
                 <div className="space-y-3 text-sm">
                     <div className="flex justify-between text-gray-600">
                         <span>Subtotal</span>
                         <span>{invoice.subtotal.toFixed(2)}</span>
                     </div>
                     <div className="flex justify-between items-center text-gray-600">
                         <div className="flex items-center gap-2">
                             <span>Tax Rate (%)</span>
                             <input 
                                type="number" 
                                min="0" 
                                max="100"
                                className="w-16 border-gray-300 rounded-md text-xs py-1 px-2" 
                                value={invoice.taxRate}
                                onChange={(e) => handleInputChange('taxRate', parseFloat(e.target.value) || 0)}
                             />
                         </div>
                         <span>{invoice.taxAmount.toFixed(2)}</span>
                     </div>
                     <div className="border-t border-gray-100 pt-3 flex justify-between items-center">
                         <span className="font-bold text-gray-900 text-lg">Total</span>
                         <span className="font-bold text-indigo-600 text-xl">
                             {new Intl.NumberFormat('en-IN', { style: 'currency', currency: invoice.currency }).format(invoice.total)}
                         </span>
                     </div>
                 </div>
             </div>
         </div>
      </div>
    </div>
  );
};

export default CreateInvoice;