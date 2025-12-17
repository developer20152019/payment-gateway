import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { InvoiceData, LineItem, PaymentStatus, Product, DocumentType, Customer } from '../types';
import { PlusIcon, TrashIcon, ArrowPathIcon, ChevronLeftIcon, UserPlusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { InvoiceService } from '../services/invoiceService';
import { ProductService } from '../services/productService';
import { CustomerService } from '../services/customerService';
import { SettingsService } from '../services/settingsService';

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", 
  "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", 
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", 
  "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", "Chandigarh", 
  "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
];

const RESOURCE_SECTIONS = [
    "Google",
    "Facebook",
    "Linkedin",
    "Cold Calling",
    "Website",
    "Recharge",
    "Reference"
];

const RESOURCE_NAMES = [
  "Swapan Dutta", 
  "Sharbhashish Nayak", 
  "Dipraj Nath"
];

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
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeItemIndex, setActiveItemIndex] = useState<number | null>(null);
  const [shippingSameAsBilling, setShippingSameAsBilling] = useState(false);

  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [newCustomer, setNewCustomer] = useState<Customer>({
      id: '', name: '', email: '', phone: '', address: '', gstin: '',
      contactPerson: '', shippingAddress: '', placeOfSupply: '', pinCode: ''
  });
  const [newCustomerSameAsBilling, setNewCustomerSameAsBilling] = useState(false);

  useEffect(() => {
    const init = async () => {
        setIsLoading(true);
        const [prodData, custData] = await Promise.all([
            ProductService.getAllProducts(),
            CustomerService.getAllCustomers()
        ]);
        setProducts(prodData);
        setCustomers(custData);

        if (id) {
          try {
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
          } catch(e) {
              alert("Error loading invoice");
          }
        } else {
            try {
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
            } catch(e) {}
        }
        setIsLoading(false);
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
      const currentTimePart = (currentIso && currentIso.includes('T')) ? currentIso.split('T')[1] : new Date().toISOString().split('T')[1];
      const newIso = `${newValue}T${currentTimePart}`;
      setInvoice({ ...invoice, [section]: newIso });
  };

  const handlePhoneChange = (section: keyof InvoiceData, value: string) => {
     const cleanValue = value.replace(/[^0-9+\-\s]/g, '');
     setInvoice({ ...invoice, [section]: cleanValue });
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        handleChange('logoUrl', reader.result as string);
      };
      reader.readAsDataURL(file);
    }
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

  const handleProductSelect = (index: number, product: Product) => {
    const newItems = [...invoice.items];
    const currentItem = newItems[index];
    const qty = parseFloat(currentItem.quantity.toString()) || 1;
    newItems[index] = {
        ...currentItem,
        name: product.name,
        description: product.description,
        rate: product.rate,
        amount: qty * product.rate
    };
    const totals = recalculateTotals(newItems);
    setInvoice({ ...invoice, items: newItems, ...totals });
    setActiveItemIndex(null);
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

  const handleNewCustomerAddressChange = (val: string) => {
      setNewCustomer(prev => ({
          ...prev, 
          address: val, 
          shippingAddress: newCustomerSameAsBilling ? val : prev.shippingAddress 
      }));
  };

  const handleNewCustomerSameAsBillingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const checked = e.target.checked;
      setNewCustomerSameAsBilling(checked);
      if (checked) {
          setNewCustomer(prev => ({ ...prev, shippingAddress: prev.address }));
      } else {
          setNewCustomer(prev => ({ ...prev, shippingAddress: '' }));
      }
  };

  const handleSaveNewCustomer = async (e: React.MouseEvent) => {
      e.preventDefault(); 
      if (!newCustomer.name || newCustomer.name.trim() === '') {
          alert("Customer Name is required");
          return;
      }
      const custToSave: Customer = {
          id: `cust_${Date.now()}`,
          name: newCustomer.name.trim(),
          email: newCustomer.email?.trim() || '',
          phone: newCustomer.phone?.trim() || '',
          address: newCustomer.address?.trim() || '',
          gstin: newCustomer.gstin?.trim() || '',
          contactPerson: newCustomer.contactPerson?.trim() || '',
          placeOfSupply: newCustomer.placeOfSupply || '',
          pinCode: newCustomer.pinCode?.trim() || '',
          shippingAddress: newCustomerSameAsBilling ? newCustomer.address?.trim() : newCustomer.shippingAddress?.trim() || ''
      };
      try {
          await CustomerService.saveCustomer(custToSave);
          setCustomers(prev => [...prev, custToSave]);
          handleCustomerSelect(custToSave);
          setShowAddCustomerModal(false);
          setNewCustomer({ 
              id: '', name: '', email: '', phone: '', address: '', gstin: '', 
              contactPerson: '', shippingAddress: '', placeOfSupply: '', pinCode: '' 
          });
          setNewCustomerSameAsBilling(false);
      } catch (error) {
          alert("Failed to save customer. Please try again.");
      }
  };

  const handleAddItem = () => {
    const newItem: LineItem = {
      id: `item_${Date.now()}`, name: '', description: '', quantity: 1, rate: 0, amount: 0
    };
    const newItems = [...invoice.items, newItem];
    const totals = recalculateTotals(newItems);
    setInvoice({ ...invoice, items: newItems, ...totals });
  };

  const handleDeleteItem = (id: string) => {
    const newItems = invoice.items.filter(item => item.id !== id);
    const totals = recalculateTotals(newItems);
    setInvoice({ ...invoice, items: newItems, ...totals });
  };

  const handleReset = () => {
    if(window.confirm("Are you sure you want to reset the form?")) {
      setIsLoading(true);
      SettingsService.getSellerProfile().then(profile => {
          const fresh = getInitialInvoice();
          if(profile) {
             fresh.sellerName = profile.sellerName;
             fresh.businessName = profile.businessName;
             fresh.sellerAddress = profile.sellerAddress;
             fresh.sellerGstin = profile.sellerGstin;
             fresh.sellerEmail = profile.sellerEmail;
             fresh.sellerPhone = profile.sellerPhone;
             fresh.logoUrl = profile.logoUrl || '';
             fresh.brandColor = profile.brandColor || '#4f46e5';
          }
          setInvoice(fresh);
          setIsEditMode(false);
          setShippingSameAsBilling(false);
          navigate('/create');
          window.scrollTo(0, 0);
          setIsLoading(false);
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent, docType: DocumentType) => {
    e.preventDefault();
    const missingFields: string[] = [];
    if (!invoice.invoiceNumber) missingFields.push("Reference Number");
    if (!invoice.date) missingFields.push("Date");
    if (!invoice.buyerName) missingFields.push("Client Name");
    if (docType === 'INVOICE' && !invoice.paymentGateway) missingFields.push("Payment Gateway");
    if (!invoice.resourceSection) missingFields.push("Resource Section");
    if (!invoice.resourceName) missingFields.push("Resource Name");
    if (missingFields.length > 0) {
        alert(`Missing fields:\n- ${missingFields.join('\n- ')}`);
        return;
    }
    setIsSaving(true);
    try {
        const invoiceToSave = { ...invoice, type: docType };
        await InvoiceService.saveInvoice(invoiceToSave);
        navigate(`/view/${invoiceToSave.id}`, { state: { autoSendEmail: true, openShare: true } });
    } catch (error) {
        alert("An error occurred while saving the document.");
    } finally {
        setIsSaving(false);
    }
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-gray-50">Loading editor...</div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <nav className="bg-white border-b border-gray-200 px-4 md:px-6 py-4 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
             <button onClick={() => navigate('/')} className="text-gray-500 hover:text-gray-800"><ChevronLeftIcon className="w-5 h-5" /></button>
             <h1 className="font-bold text-xl text-gray-900">{isEditMode ? 'Edit Document' : 'New Document'}</h1>
          </div>
          <div className="flex gap-3">
             <button onClick={handleReset} className="hidden md:flex items-center gap-2 text-gray-500 hover:text-red-600 text-sm font-medium"><ArrowPathIcon className="w-4 h-4" /> Reset</button>
             <button onClick={(e) => handleSubmit(e, 'QUOTATION')} disabled={isSaving} className="bg-white border border-gray-300 px-4 py-2 rounded-lg text-sm">Send Quote</button>
             <button onClick={(e) => handleSubmit(e, 'INVOICE')} disabled={isSaving} className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm">Send Invoice</button>
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
                            <input type="text" className="w-full font-mono text-lg font-bold border-b-2 border-gray-200 focus:border-indigo-500 outline-none" value={invoice.invoiceNumber} onChange={(e) => handleChange('invoiceNumber', e.target.value)} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Date *</label>
                                <input type="date" required className="w-full border rounded-lg px-3 py-2 text-sm" value={invoice.date?.split('T')[0]} onChange={(e) => handleDateChange('date', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Due Date</label>
                                <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={invoice.dueDate?.split('T')[0]} onChange={(e) => handleDateChange('dueDate', e.target.value)} />
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                        <select className="border rounded p-2 text-sm" value={invoice.resourceSection} onChange={(e) => handleChange('resourceSection', e.target.value)}>
                            <option value="">Resource Section *</option>
                            {RESOURCE_SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <select className="border rounded p-2 text-sm" value={invoice.resourceName} onChange={(e) => handleChange('resourceName', e.target.value)}>
                            <option value="">Resource Name *</option>
                            {RESOURCE_NAMES.map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                        <select className="border rounded p-2 text-sm" value={invoice.paymentGateway} onChange={(e) => handleChange('paymentGateway', e.target.value)}>
                            <option value="">Payment Gateway</option>
                            <option value="Razorpay">Razorpay</option>
                            <option value="CCAvenue">CCAvenue</option>
                        </select>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-sm font-bold text-gray-500 uppercase">Bill To</h2>
                        <button onClick={() => setShowAddCustomerModal(true)} className="text-xs flex items-center gap-1 text-indigo-600 font-medium"><UserPlusIcon className="w-4 h-4" /> Add New Client</button>
                    </div>
                    <div className="relative mb-4">
                        <input type="text" className="w-full border rounded-lg p-2.5 text-sm" placeholder="Search or enter client name..." value={invoice.buyerName} onChange={(e) => { handleChange('buyerName', e.target.value); setShowSuggestions(true); }} onFocus={() => setShowSuggestions(true)} />
                        {showSuggestions && (
                            <div className="absolute z-10 w-full bg-white border mt-1 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                                {customers.filter(c => c.name.toLowerCase().includes((invoice.buyerName || '').toLowerCase())).map(c => (
                                    <div key={c.id} className="px-4 py-2 hover:bg-gray-50 cursor-pointer text-sm" onClick={() => handleCustomerSelect(c)}>
                                        <div className="font-bold">{c.name}</div>
                                        <div className="text-gray-500 text-xs">{c.email}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                        {showSuggestions && <div className="fixed inset-0 z-0" onClick={() => setShowSuggestions(false)}></div>}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input type="email" placeholder="Email Address" className="border rounded-lg p-2 text-sm" value={invoice.buyerEmail} onChange={(e) => handleChange('buyerEmail', e.target.value)} />
                        <input type="tel" placeholder="Phone Number" className="border rounded-lg p-2 text-sm" value={invoice.buyerPhone} onChange={(e) => handlePhoneChange('buyerPhone', e.target.value)} />
                        <div className="md:col-span-2">
                            <textarea rows={2} placeholder="Billing Address" className="w-full border rounded-lg p-2 text-sm" value={invoice.buyerAddress} onChange={(e) => handleChange('buyerAddress', e.target.value)}></textarea>
                        </div>
                        <div className="md:col-span-2">
                            <label className="flex items-center gap-2 mb-2 text-xs font-bold text-gray-500 uppercase"><input type="checkbox" checked={shippingSameAsBilling} onChange={(e) => setShippingSameAsBilling(e.target.checked)} /> Shipping same as Billing</label>
                            {!shippingSameAsBilling && <textarea rows={2} placeholder="Shipping Address" className="w-full border rounded-lg p-2 text-sm" value={invoice.buyerShippingAddress} onChange={(e) => handleChange('buyerShippingAddress', e.target.value)}></textarea>}
                        </div>
                        <input type="text" placeholder="Place of Supply" className="border rounded-lg p-2 text-sm" value={invoice.placeOfSupply} onChange={(e) => handleChange('placeOfSupply', e.target.value)} />
                        <input type="text" placeholder="Pin Code" className="border rounded-lg p-2 text-sm" value={invoice.buyerPinCode} onChange={(e) => handleChange('buyerPinCode', e.target.value)} />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h2 className="text-sm font-bold text-gray-500 uppercase mb-4">Line Items</h2>
                    <div className="space-y-4">
                        {invoice.items.map((item, index) => (
                            <div key={item.id} className="p-4 border rounded-lg bg-gray-50/50 relative">
                                <div className="grid grid-cols-12 gap-3 mb-2">
                                    <div className="col-span-12 sm:col-span-6">
                                        <input type="text" className="w-full border rounded p-2 text-sm" placeholder="Item Name" value={item.name} onChange={(e) => handleItemChange(item.id, 'name', e.target.value)} onFocus={() => setActiveItemIndex(index)} />
                                        {activeItemIndex === index && (
                                            <div className="absolute z-50 left-4 right-4 mt-1 bg-white border rounded shadow-xl max-h-48 overflow-y-auto">
                                                {products.filter(p => p.name.toLowerCase().includes(item.name.toLowerCase())).map(p => (
                                                    <div key={p.id} className="px-3 py-2 hover:bg-indigo-50 cursor-pointer text-sm" onClick={() => handleProductSelect(index, p)}>
                                                        <div className="font-bold">{p.name}</div>
                                                        <div className="text-xs text-gray-500">Rate: {p.rate}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="col-span-4 sm:col-span-2"><input type="number" className="w-full border rounded p-2 text-sm text-center" value={item.quantity} onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value)} /></div>
                                    <div className="col-span-4 sm:col-span-2"><input type="number" className="w-full border rounded p-2 text-sm text-right" value={item.rate} onChange={(e) => handleItemChange(item.id, 'rate', e.target.value)} /></div>
                                    <div className="col-span-4 sm:col-span-2 text-right py-2 text-sm font-bold">{item.amount.toFixed(2)}</div>
                                </div>
                                <input type="text" className="w-full border-b border-dashed text-xs pb-1" placeholder="Description" value={item.description} onChange={(e) => handleItemChange(item.id, 'description', e.target.value)} />
                                <button onClick={() => handleDeleteItem(item.id)} className="absolute -right-2 -top-2 bg-white text-red-500 p-1 rounded-full shadow border"><TrashIcon className="w-4 h-4" /></button>
                            </div>
                        ))}
                    </div>
                    <button onClick={handleAddItem} className="mt-4 w-full py-2 border-2 border-dashed rounded-lg text-gray-500 text-sm">+ Add Item</button>
                    {activeItemIndex !== null && <div className="fixed inset-0 z-0" onClick={() => setActiveItemIndex(null)}></div>}
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Terms & Notes</label>
                    <textarea rows={3} className="w-full border rounded-lg p-3 text-sm" value={invoice.notes} onChange={(e) => handleChange('notes', e.target.value)}></textarea>
                </div>
            </div>

            <div className="space-y-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="text-sm font-bold text-gray-800 mb-4">Summary</h3>
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>{invoice.subtotal.toFixed(2)}</span></div>
                        <div className="flex justify-between items-center text-gray-600">
                            <span>Tax Rate</span>
                            <select className="bg-gray-50 border rounded text-xs px-1" value={invoice.taxRate} onChange={(e) => { const r = Number(e.target.value); const t = invoice.subtotal * (r/100); setInvoice({...invoice, taxRate: r, taxAmount: t, total: invoice.subtotal + t}); }}>
                                {[0, 5, 12, 18, 28].map(v => <option key={v} value={v}>{v}%</option>)}
                            </select>
                        </div>
                        <div className="border-t border-dashed my-2"></div>
                        <div className="flex justify-between font-bold text-lg"><span>Total</span><span style={{ color: invoice.brandColor }}>{invoice.total.toFixed(2)}</span></div>
                    </div>
                </div>
            </div>
         </div>
      </div>

      {showAddCustomerModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setShowAddCustomerModal(false)}></div>
              <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg p-6">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-lg font-bold">Add New Client</h3>
                      <button onClick={() => setShowAddCustomerModal(false)}><XMarkIcon className="w-6 h-6 text-gray-400" /></button>
                  </div>
                  <div className="space-y-4">
                      <input type="text" className="w-full border rounded-lg p-2 text-sm" placeholder="Company Name *" value={newCustomer.name} onChange={(e) => setNewCustomer({...newCustomer, name: e.target.value})} />
                      <div className="grid grid-cols-2 gap-4">
                          <input type="email" placeholder="Email" className="border rounded-lg p-2 text-sm" value={newCustomer.email} onChange={(e) => setNewCustomer({...newCustomer, email: e.target.value})} />
                          <input type="tel" placeholder="Phone" className="border rounded-lg p-2 text-sm" value={newCustomer.phone} onChange={(e) => setNewCustomer({...newCustomer, phone: e.target.value})} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <input type="text" placeholder="Place of Supply" className="border rounded-lg p-2 text-sm" value={newCustomer.placeOfSupply} onChange={(e) => setNewCustomer({...newCustomer, placeOfSupply: e.target.value})} />
                          <input type="text" placeholder="Pin Code" className="border rounded-lg p-2 text-sm" value={newCustomer.pinCode} onChange={(e) => setNewCustomer({...newCustomer, pinCode: e.target.value})} />
                      </div>
                      <textarea rows={2} className="w-full border rounded-lg p-2 text-sm" placeholder="Billing Address" value={newCustomer.address} onChange={(e) => handleNewCustomerAddressChange(e.target.value)}></textarea>
                      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={newCustomerSameAsBilling} onChange={handleNewCustomerSameAsBillingChange} /> Shipping same as Billing</label>
                      {!newCustomerSameAsBilling && <textarea rows={2} className="w-full border rounded-lg p-2 text-sm" placeholder="Shipping Address" value={newCustomer.shippingAddress} onChange={(e) => setNewCustomer({...newCustomer, shippingAddress: e.target.value})}></textarea>}
                      <div className="flex justify-end gap-2 mt-4"><button onClick={() => setShowAddCustomerModal(false)} className="px-4 py-2 text-sm">Cancel</button><button onClick={handleSaveNewCustomer} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm">Save Client</button></div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default CreateInvoice;