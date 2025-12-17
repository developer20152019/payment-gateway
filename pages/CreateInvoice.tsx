
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { InvoiceData, LineItem, PaymentStatus, Product, DocumentType, Customer } from '../types';
import { PhotoIcon, PlusIcon, TrashIcon, ChevronLeftIcon, UserPlusIcon } from '@heroicons/react/24/outline';
import { InvoiceService } from '../services/invoiceService';
import { ProductService } from '../services/productService';
import { CustomerService } from '../services/customerService';
import { SettingsService } from '../services/settingsService';

const generateInvoiceNumber = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.floor(1000 + Math.random() * 9000);
  return `EST-${year}${month}${day}-${random}`;
};

const getInitialInvoice = (): InvoiceData => ({
  id: `est_${Date.now()}`,
  invoiceNumber: generateInvoiceNumber(),
  type: 'INVOICE',
  date: new Date().toISOString(),
  dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  template: 'modern',
  brandColor: '#4f46e5',
  logoUrl: '',
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
  resourceSection: '',
  resourceName: '',
  items: [
    { id: `item_${Date.now()}`, name: '', description: '', quantity: 1, rate: 0, amount: 0 },
  ],
  subtotal: 0,
  taxRate: 0,
  taxAmount: 0,
  total: 0,
  currency: 'INR',
  status: PaymentStatus.PENDING,
  paymentGateway: '',
  notes: 'Thank you for your business! Please pay within 7 days.'
});

const CreateInvoice: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [invoice, setInvoice] = useState<InvoiceData>(getInitialInvoice);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [resourceSections, setResourceSections] = useState<string[]>([]);
  const [resourceNames, setResourceNames] = useState<string[]>([]);
  
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [shippingSameAsBilling, setShippingSameAsBilling] = useState(false);

  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [newCustomer, setNewCustomer] = useState<Customer>({
      id: '', name: '', email: '', phone: '', address: '', gstin: '',
      contactPerson: '', shippingAddress: '', placeOfSupply: '', pinCode: ''
  });

  useEffect(() => {
    const init = async () => {
        setIsLoading(true);
        try {
            const [prodData, custData, resData] = await Promise.all([
                ProductService.getAllProducts(),
                CustomerService.getAllCustomers(),
                fetch('/api/resources').then(r => r.json())
            ]);
            setProducts(prodData);
            setCustomers(custData);
            setResourceSections(resData.sections || []);
            setResourceNames(resData.names || []);

            if (id) {
                const existingInvoice = await InvoiceService.getInvoiceById(id);
                if (existingInvoice) {
                    setInvoice({
                        ...existingInvoice,
                        resourceSection: existingInvoice.resourceSection || '',
                        resourceName: existingInvoice.resourceName || '',
                        paymentGateway: existingInvoice.paymentGateway || '',
                        type: existingInvoice.type || 'INVOICE',
                        template: 'modern',
                        buyerContactPerson: existingInvoice.buyerContactPerson || '',
                        buyerShippingAddress: existingInvoice.buyerShippingAddress || '',
                        placeOfSupply: existingInvoice.placeOfSupply || '',
                        buyerPinCode: existingInvoice.buyerPinCode || ''
                    });
                    if (existingInvoice.buyerAddress && existingInvoice.buyerShippingAddress && existingInvoice.buyerAddress === existingInvoice.buyerShippingAddress) {
                        setShippingSameAsBilling(true);
                    }
                    setIsEditMode(true);
                } else {
                    alert("Invoice not found.");
                    navigate('/');
                }
            } else {
                const profile = await SettingsService.getSellerProfile();
                if (profile) {
                    setInvoice(prev => ({
                        ...prev,
                        sellerName: profile.sellerName,
                        businessName: profile.businessName,
                        sellerAddress: profile.sellerAddress,
                        sellerGstin: profile.sellerGstin,
                        sellerEmail: profile.sellerEmail,
                        sellerPhone: profile.sellerPhone,
                        logoUrl: profile.logoUrl || prev.logoUrl,
                        brandColor: profile.brandColor || prev.brandColor
                    }));
                }
            }
        } catch(e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };
    init();
  }, [id, navigate]);

  useEffect(() => {
      if (shippingSameAsBilling) {
          setInvoice(prev => ({ ...prev, buyerShippingAddress: prev.buyerAddress }));
      }
  }, [invoice.buyerAddress, shippingSameAsBilling]);

  const handleChange = (section: keyof InvoiceData, value: any) => {
     setInvoice({ ...invoice, [section]: value });
  };

  const handleDateChange = (section: keyof InvoiceData, newValue: string) => {
      const currentIso = invoice[section] as string;
      const currentTimePart = (currentIso && currentIso.includes('T')) 
          ? currentIso.split('T')[1] 
          : new Date().toISOString().split('T')[1];
      const newIso = `${newValue}T${currentTimePart}`;
      setInvoice({ ...invoice, [section]: newIso });
  };

  const recalculateTotals = (items: LineItem[]) => {
    const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
    const taxAmount = subtotal * (invoice.taxRate / 100);
    const total = subtotal + taxAmount;
    return { subtotal, taxAmount, total };
  };

  const handleItemChange = (id: string, field: keyof LineItem, value: string | number) => {
    const newItems = invoice.items.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        const qty = parseFloat(updated.quantity.toString()) || 0;
        const rate = parseFloat(updated.rate.toString()) || 0;
        updated.amount = qty * rate;
        return updated;
      }
      return item;
    });
    const totals = recalculateTotals(newItems);
    setInvoice({ ...invoice, items: newItems, ...totals });
  };

  const handleCustomerSelect = (customer: Customer) => {
      const isSameAddress = customer.shippingAddress === customer.address || !customer.shippingAddress;
      setInvoice(prev => ({
          ...prev,
          buyerName: customer.name,
          buyerEmail: customer.email,
          buyerPhone: customer.phone,
          buyerAddress: customer.address,
          buyerContactPerson: customer.contactPerson || '',
          buyerShippingAddress: customer.shippingAddress || customer.address, 
          placeOfSupply: customer.placeOfSupply || '',
          buyerPinCode: customer.pinCode || ''
      }));
      setShippingSameAsBilling(isSameAddress);
      setShowSuggestions(false);
  };

  const handleAddItem = () => {
    const newItem: LineItem = { id: `item_${Date.now()}`, name: '', description: '', quantity: 1, rate: 0, amount: 0 };
    const newItems = [...invoice.items, newItem];
    const totals = recalculateTotals(newItems);
    setInvoice({ ...invoice, items: newItems, ...totals });
  };

  const handleDeleteItem = (id: string) => {
    const newItems = invoice.items.filter(item => item.id !== id);
    const totals = recalculateTotals(newItems);
    setInvoice({ ...invoice, items: newItems, ...totals });
  };

  const handleSubmit = async (e: React.FormEvent, docType: DocumentType) => {
    e.preventDefault();
    setIsSaving(true);
    try {
        const invoiceToSave = { ...invoice, type: docType };
        await InvoiceService.saveInvoice(invoiceToSave);
        navigate(`/view/${invoiceToSave.id}`, { state: { autoSendEmail: true, openShare: true } });
    } catch (error) {
        alert("An error occurred while saving.");
    } finally {
        setIsSaving(false);
    }
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="text-gray-500 font-medium animate-pulse">Loading...</div></div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <nav className="bg-white border-b border-gray-200 px-4 md:px-6 py-4 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
             <button onClick={() => navigate('/')} className="text-gray-500 hover:text-gray-800 transition-colors"><ChevronLeftIcon className="w-5 h-5" /></button>
             <h1 className="font-bold text-xl text-gray-900">{isEditMode ? 'Edit Document' : 'New Document'}</h1>
          </div>
          <div className="flex gap-3">
             <button onClick={(e) => handleSubmit(e, 'QUOTATION')} disabled={isSaving} className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium text-sm hover:bg-gray-50 transition-colors">Send Quote</button>
             <button onClick={(e) => handleSubmit(e, 'INVOICE')} disabled={isSaving} className="bg-indigo-600 text-white px-5 py-2 rounded-lg font-medium text-sm hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-sm shadow-indigo-200">{isSaving ? 'Saving...' : 'Send Invoice'}</button>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 mt-8">
         <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Reference No</label>
                            <input type="text" className="w-full font-mono text-lg font-bold text-gray-800 border-b-2 border-gray-200 focus:border-indigo-500 outline-none py-1 bg-transparent" value={invoice.invoiceNumber} onChange={(e) => handleChange('invoiceNumber', e.target.value)} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Date *</label>
                                <input type="date" required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={invoice.date?.split('T')[0]} onChange={(e) => handleDateChange('date', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Due Date</label>
                                <input type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={invoice.dueDate?.split('T')[0]} onChange={(e) => handleDateChange('dueDate', e.target.value)} />
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-100">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Resource Section *</label>
                            <select className="w-full border rounded-md p-2 text-sm bg-white" value={invoice.resourceSection} onChange={(e) => handleChange('resourceSection', e.target.value)}>
                                <option value="">Select Section</option>
                                {resourceSections.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Resource Name *</label>
                            <select className="w-full border rounded-md p-2 text-sm bg-white" value={invoice.resourceName} onChange={(e) => handleChange('resourceName', e.target.value)}>
                                <option value="">Select Resource</option>
                                {resourceNames.map(n => <option key={n} value={n}>{n}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Payment Gateway</label>
                            <select className="w-full border border-gray-300 rounded-md p-2 text-sm bg-white" value={invoice.paymentGateway} onChange={(e) => handleChange('paymentGateway', e.target.value)}>
                                <option value="">None (Cash/Manual)</option>
                                <option value="Razorpay">Razorpay</option>
                                <option value="CCAvenue">CCAvenue</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-sm font-bold text-gray-500 uppercase">Bill To (Client)</h2>
                        <button onClick={() => navigate('/customers')} className="text-xs flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-medium"><UserPlusIcon className="w-4 h-4" /> Manage Clients</button>
                    </div>
                    <div className="relative mb-4">
                        <input type="text" className="w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none font-medium" placeholder="Search client..." value={invoice.buyerName} onChange={(e) => { handleChange('buyerName', e.target.value); setShowSuggestions(true); }} onFocus={() => setShowSuggestions(true)} />
                        {showSuggestions && (
                            <div className="absolute z-10 w-full bg-white border border-gray-200 mt-1 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                                {customers.filter(c => c.name.toLowerCase().includes((invoice.buyerName || '').toLowerCase())).map(c => (
                                    <div key={c.id} className="px-4 py-2 hover:bg-gray-50 cursor-pointer text-sm" onClick={() => handleCustomerSelect(c)}>
                                        <div className="font-bold text-gray-800">{c.name}</div>
                                        <div className="text-gray-500 text-xs">{c.email}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h2 className="text-sm font-bold text-gray-500 uppercase mb-4">Line Items</h2>
                    <div className="space-y-4">
                        {invoice.items.map((item, index) => (
                            <div key={item.id} className="group relative p-4 border border-gray-200 rounded-lg hover:border-indigo-300 transition-all bg-gray-50/50">
                                <div className="grid grid-cols-12 gap-3 mb-2">
                                    <div className="col-span-12 sm:col-span-6 relative">
                                        <label className="text-[10px] text-gray-400 font-bold uppercase mb-1 block">Item Name</label>
                                        <input type="text" className="w-full bg-white border border-gray-300 rounded p-2 text-sm font-medium outline-none" value={item.name} onChange={(e) => handleItemChange(item.id, 'name', e.target.value)} />
                                    </div>
                                    <div className="col-span-4 sm:col-span-2">
                                        <label className="text-[10px] text-gray-400 font-bold uppercase mb-1 block text-center">Qty</label>
                                        <input type="number" className="w-full bg-white border border-gray-300 rounded p-2 text-sm text-center outline-none" value={item.quantity} onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value)} />
                                    </div>
                                    <div className="col-span-4 sm:col-span-2">
                                        <label className="text-[10px] text-gray-400 font-bold uppercase mb-1 block text-right">Rate</label>
                                        <input type="number" className="w-full bg-white border border-gray-300 rounded p-2 text-sm text-right outline-none" value={item.rate} onChange={(e) => handleItemChange(item.id, 'rate', e.target.value)} />
                                    </div>
                                    <div className="col-span-4 sm:col-span-2">
                                        <label className="text-[10px] text-gray-400 font-bold uppercase mb-1 block text-right">Amount</label>
                                        <div className="py-2 text-sm font-bold text-gray-800 text-right">{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                                    </div>
                                </div>
                                <div className="relative">
                                    <input type="text" className="w-full bg-transparent border-b border-dashed border-gray-300 text-xs text-gray-600 outline-none pb-1" placeholder="Description..." value={item.description} onChange={(e) => handleItemChange(item.id, 'description', e.target.value)} />
                                </div>
                                {invoice.items.length > 1 && <button onClick={() => handleDeleteItem(item.id)} className="absolute -right-2 -top-2 bg-white text-red-500 p-1 rounded-full shadow-md border border-gray-100 opacity-0 group-hover:opacity-100 transition-opacity"><TrashIcon className="w-4 h-4" /></button>}
                            </div>
                        ))}
                    </div>
                    <button onClick={handleAddItem} className="mt-4 w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 font-medium hover:border-indigo-400 hover:text-indigo-600 transition-colors flex items-center justify-center gap-2 text-sm"><PlusIcon className="w-4 h-4" /> Add Item</button>
                </div>
            </div>

            <div className="space-y-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="text-sm font-bold text-gray-800 mb-4">Financial Summary</h3>
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>{invoice.subtotal.toLocaleString('en-IN', { style: 'currency', currency: invoice.currency })}</span></div>
                        <div className="flex justify-between items-center text-gray-600">
                            <div className="flex items-center gap-2"><span>Tax Rate</span><select className="bg-gray-50 border border-gray-200 rounded text-xs px-1 py-0.5 outline-none" value={invoice.taxRate} onChange={(e) => { const r = Number(e.target.value); const t = invoice.subtotal * (r/100); setInvoice({...invoice, taxRate: r, taxAmount: t, total: invoice.subtotal + t}); }}>{ [0,5,12,18,28].map(v => <option key={v} value={v}>{v}%</option>) }</select></div>
                            <span>{invoice.taxAmount.toLocaleString('en-IN', { style: 'currency', currency: invoice.currency })}</span>
                        </div>
                        <div className="border-t border-dashed border-gray-200 my-2"></div>
                        <div className="flex justify-between font-bold text-lg text-gray-900"><span>Total</span><span style={{ color: invoice.brandColor }}>{invoice.total.toLocaleString('en-IN', { style: 'currency', currency: invoice.currency })}</span></div>
                    </div>
                </div>
            </div>
         </div>
      </div>
    </div>
  );
};

export default CreateInvoice;
