
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { InvoiceData, LineItem, PaymentStatus, Product, DocumentType, Customer } from '../types';
import { PlusIcon, TrashIcon, ChevronLeftIcon, UserPlusIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
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
                    });
                    setIsEditMode(true);
                } else {
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

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-4 md:px-6 py-4 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
             <button onClick={() => navigate('/')} className="text-gray-500 hover:text-gray-800 transition-colors"><ChevronLeftIcon className="w-5 h-5" /></button>
             <h1 className="font-bold text-xl text-gray-900">{isEditMode ? 'Edit Document' : 'New Document'}</h1>
          </div>
          <div className="flex gap-3">
             <button onClick={(e) => handleSubmit(e, 'QUOTATION')} disabled={isSaving} className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium text-sm hover:bg-gray-50">Send Quote</button>
             <button onClick={(e) => handleSubmit(e, 'INVOICE')} disabled={isSaving} className="bg-indigo-600 text-white px-5 py-2 rounded-lg font-medium text-sm hover:bg-indigo-700 flex items-center gap-2 shadow-sm">{isSaving ? 'Saving...' : 'Send Invoice'}</button>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="lg:col-span-2 space-y-6">
            {/* Header Information */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Number</label>
                  <input 
                    type="text" 
                    className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
                    value={invoice.invoiceNumber} 
                    onChange={(e) => handleChange('invoiceNumber', e.target.value)} 
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                    <input 
                      type="date" 
                      className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
                      value={invoice.date?.split('T')[0]} 
                      onChange={(e) => handleDateChange('date', e.target.value)} 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                    <input 
                      type="date" 
                      className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
                      value={invoice.dueDate?.split('T')[0]} 
                      onChange={(e) => handleDateChange('dueDate', e.target.value)} 
                    />
                  </div>
                </div>
              </div>

              {/* Dynamic Resource Selectors */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-100">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Resource Section</label>
                  <select 
                    className="w-full border border-gray-300 rounded-lg p-2 text-sm bg-gray-50 focus:bg-white" 
                    value={invoice.resourceSection} 
                    onChange={(e) => handleChange('resourceSection', e.target.value)}
                  >
                    <option value="">Select Section</option>
                    {resourceSections.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Resource Name</label>
                  <select 
                    className="w-full border border-gray-300 rounded-lg p-2 text-sm bg-gray-50 focus:bg-white" 
                    value={invoice.resourceName} 
                    onChange={(e) => handleChange('resourceName', e.target.value)}
                  >
                    <option value="">Select Resource</option>
                    {resourceNames.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Payment Gateway</label>
                  <select 
                    className="w-full border border-gray-300 rounded-lg p-2 text-sm bg-gray-50 focus:bg-white" 
                    value={invoice.paymentGateway} 
                    onChange={(e) => handleChange('paymentGateway', e.target.value)}
                  >
                    <option value="">None (Cash/Manual)</option>
                    <option value="Razorpay">Razorpay</option>
                    <option value="CCAvenue">CCAvenue</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Client Information */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Bill To (Client)</h2>
                <button onClick={() => navigate('/customers')} className="text-xs text-indigo-600 flex items-center gap-1 font-medium hover:underline">
                  <UserPlusIcon className="w-4 h-4" /> Manage Clients
                </button>
              </div>
              <div className="relative">
                <input 
                  type="text" 
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none" 
                  placeholder="Search client name..." 
                  value={invoice.buyerName} 
                  onChange={(e) => { handleChange('buyerName', e.target.value); setShowSuggestions(true); }} 
                  onFocus={() => setShowSuggestions(true)}
                />
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

            {/* Line Items */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4">Line Items</h2>
              <div className="space-y-4">
                {invoice.items.map((item) => (
                  <div key={item.id} className="p-4 border border-gray-100 rounded-lg bg-gray-50/30">
                    <div className="grid grid-cols-12 gap-4">
                      <div className="col-span-12 md:col-span-6">
                        <input 
                          type="text" 
                          className="w-full bg-white border border-gray-300 rounded p-2 text-sm font-medium" 
                          placeholder="Item Name"
                          value={item.name} 
                          onChange={(e) => handleItemChange(item.id, 'name', e.target.value)} 
                        />
                      </div>
                      <div className="col-span-4 md:col-span-2">
                        <input 
                          type="number" 
                          className="w-full bg-white border border-gray-300 rounded p-2 text-sm text-center" 
                          placeholder="Qty"
                          value={item.quantity} 
                          onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value)} 
                        />
                      </div>
                      <div className="col-span-4 md:col-span-2">
                        <input 
                          type="number" 
                          className="w-full bg-white border border-gray-300 rounded p-2 text-sm text-right" 
                          placeholder="Rate"
                          value={item.rate} 
                          onChange={(e) => handleItemChange(item.id, 'rate', e.target.value)} 
                        />
                      </div>
                      <div className="col-span-4 md:col-span-2 flex items-center justify-between">
                        <span className="text-sm font-bold text-gray-900">{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        {invoice.items.length > 1 && (
                          <button onClick={() => handleDeleteItem(item.id)} className="text-red-400 hover:text-red-600 transition-colors ml-2">
                            <TrashIcon className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </div>
                    <textarea 
                      className="w-full bg-transparent border-none text-xs text-gray-500 mt-2 resize-none focus:ring-0" 
                      placeholder="Add description..." 
                      rows={1}
                      value={item.description} 
                      onChange={(e) => handleItemChange(item.id, 'description', e.target.value)} 
                    />
                  </div>
                ))}
              </div>
              <button onClick={handleAddItem} className="mt-4 w-full py-2 border-2 border-dashed border-gray-200 rounded-lg text-gray-400 font-medium hover:border-indigo-300 hover:text-indigo-600 transition-all flex items-center justify-center gap-2 text-sm">
                <PlusIcon className="w-4 h-4" /> Add Line Item
              </button>
            </div>
          </div>

          {/* Sidebar Summary */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-sm font-bold text-gray-800 mb-6 flex items-center gap-2">
                <DocumentTextIcon className="w-5 h-5 text-indigo-500" /> Financial Summary
              </h3>
              <div className="space-y-4 text-sm">
                <div className="flex justify-between text-gray-500">
                  <span>Subtotal</span>
                  <span className="font-bold text-gray-900">{invoice.subtotal.toLocaleString('en-IN', { style: 'currency', currency: invoice.currency })}</span>
                </div>
                <div className="flex justify-between items-center text-gray-500">
                  <div className="flex items-center gap-2">
                    <span>Tax (%)</span>
                    <select 
                      className="bg-gray-50 border border-gray-300 rounded text-xs px-2 py-1"
                      value={invoice.taxRate} 
                      onChange={(e) => { 
                        const r = Number(e.target.value); 
                        const t = invoice.subtotal * (r/100); 
                        setInvoice({...invoice, taxRate: r, taxAmount: t, total: invoice.subtotal + t}); 
                      }}
                    >
                      {[0,5,12,18,28].map(v => <option key={v} value={v}>{v}%</option>)}
                    </select>
                  </div>
                  <span className="font-bold text-gray-900">{invoice.taxAmount.toLocaleString('en-IN', { style: 'currency', currency: invoice.currency })}</span>
                </div>
                <div className="pt-4 border-t border-gray-100">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-gray-900">Total Amount</span>
                    <span className="text-xl font-bold text-indigo-600">
                      {invoice.total.toLocaleString('en-IN', { style: 'currency', currency: invoice.currency })}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Internal Notes / Terms</label>
              <textarea 
                rows={4} 
                className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none" 
                value={invoice.notes} 
                onChange={(e) => handleChange('notes', e.target.value)} 
              />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default CreateInvoice;
