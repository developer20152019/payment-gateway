
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { InvoiceData, LineItem, PaymentStatus, Product, DocumentType, Customer } from '../types';
import { 
    PlusIcon, TrashIcon, DocumentTextIcon, ArrowPathIcon, 
    ChevronLeftIcon, UserPlusIcon, XMarkIcon, 
    CheckCircleIcon, SparklesIcon, IdentificationIcon,
    ShoppingCartIcon, CogIcon, BanknotesIcon
} from '@heroicons/react/24/outline';
import { InvoiceService } from '../services/invoiceService';
import { ProductService } from '../services/productService';
import { CustomerService } from '../services/customerService';
import { SettingsService } from '../services/settingsService';

const generateInvoiceNumber = () => {
  const d = new Date();
  return `PL-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}-${Math.floor(1000 + Math.random() * 9000)}`;
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
  sellerName: '', businessName: '', sellerAddress: '', sellerGstin: '', sellerEmail: '', sellerPhone: '',
  buyerName: '', buyerEmail: '', buyerPhone: '', buyerAddress: '', buyerShippingAddress: '', placeOfSupply: '', buyerPinCode: '',
  items: [{ id: `item_${Date.now()}`, name: '', description: '', quantity: 1, rate: 0, amount: 0 }],
  subtotal: 0, taxRate: 18, taxAmount: 0, total: 0, currency: 'INR',
  status: PaymentStatus.PENDING, paymentGateway: 'Razorpay', notes: 'Thank you for your business.'
});

const CreateInvoice: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [invoice, setInvoice] = useState<InvoiceData>(getInitialInvoice);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeItemIndex, setActiveItemIndex] = useState<number | null>(null);

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
          const existing = await InvoiceService.getInvoiceById(id);
          if (existing) setInvoice(existing);
        } else {
          const profile = await SettingsService.getSellerProfile();
          if (profile) setInvoice(prev => ({ ...prev, ...profile }));
        }
        setIsLoading(false);
    };
    init();
  }, [id]);

  const recalculate = (items: LineItem[], taxRate: number) => {
    const subtotal = items.reduce((s, i) => s + i.amount, 0);
    const taxAmount = subtotal * (taxRate / 100);
    return { subtotal, taxAmount, total: subtotal + taxAmount };
  };

  const handleItemChange = (itemId: string, field: keyof LineItem, val: any) => {
    const newItems = invoice.items.map(item => {
      if (item.id === itemId) {
        const up = { ...item, [field]: val };
        up.amount = (parseFloat(up.quantity.toString()) || 0) * (parseFloat(up.rate.toString()) || 0);
        return up;
      }
      return item;
    });
    setInvoice({ ...invoice, items: newItems, ...recalculate(newItems, invoice.taxRate) });
  };

  const addItem = () => {
    const newItems = [...invoice.items, { id: `li_${Date.now()}`, name: '', description: '', quantity: 1, rate: 0, amount: 0 }];
    setInvoice({ ...invoice, items: newItems });
  };

  const handleSave = async (docType: DocumentType) => {
    if (!invoice.buyerName || !invoice.buyerEmail) return alert("Client details are required.");
    setIsSaving(true);
    const toSave = { ...invoice, type: docType };
    await InvoiceService.saveInvoice(toSave);
    navigate(`/view/${toSave.id}`, { state: { openShare: true } });
    setIsSaving(false);
  };

  if (isLoading) return <div className="flex h-screen items-center justify-center font-bold text-slate-400">Loading Editor...</div>;

  return (
    <div className="min-h-screen pb-12">
      {/* Dynamic Header */}
      <header className="sticky top-0 z-40 bg-white/80 border-b border-slate-200 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 py-4 flex justify-between items-center sm:px-6">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/')} className="rounded-full p-2 hover:bg-slate-100 transition-colors">
              <ChevronLeftIcon className="h-6 w-6 text-slate-500" />
            </button>
            <h1 className="text-xl font-black text-slate-900">{id ? 'Edit Document' : 'Draft New Document'}</h1>
          </div>
          <div className="flex items-center gap-3">
            <button 
                onClick={() => handleSave('QUOTATION')}
                className="hidden md:flex rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-200 transition-all"
            >
                Draft Quote
            </button>
            <button 
                onClick={() => handleSave('INVOICE')}
                disabled={isSaving}
                className="rounded-xl indigo-gradient px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-100 transition-all hover:scale-[1.02] active:scale-95 flex items-center gap-2"
            >
                {isSaving ? 'Processing...' : <><SparklesIcon className="h-5 w-5" /> Generate Invoice</>}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 mt-10 grid gap-10 lg:grid-cols-3 sm:px-6">
        {/* Main Form Area */}
        <div className="lg:col-span-2 space-y-10">
          
          {/* Section 1: Client Info */}
          <section className="rounded-3xl bg-white p-8 premium-shadow border border-slate-100">
            <div className="mb-6 flex items-center gap-3">
                <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                    <IdentificationIcon className="h-6 w-6" />
                </div>
                <h2 className="text-lg font-bold text-slate-900">Client Recipient</h2>
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
                <div className="sm:col-span-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 mb-2 block">Client Name / Business</label>
                    <input 
                        type="text" placeholder="Select or enter name..."
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 p-4 font-bold text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all"
                        value={invoice.buyerName} onChange={(e) => setInvoice({...invoice, buyerName: e.target.value})}
                    />
                </div>
                <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 mb-2 block">Email Address</label>
                    <input 
                        type="email" placeholder="client@example.com"
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 p-4 font-bold text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all"
                        value={invoice.buyerEmail} onChange={(e) => setInvoice({...invoice, buyerEmail: e.target.value})}
                    />
                </div>
                <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 mb-2 block">Phone (WhatsApp)</label>
                    <input 
                        type="tel" placeholder="+91..."
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 p-4 font-bold text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all"
                        value={invoice.buyerPhone} onChange={(e) => setInvoice({...invoice, buyerPhone: e.target.value})}
                    />
                </div>
                <div className="sm:col-span-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 mb-2 block">Billing Address</label>
                    <textarea 
                        rows={3} placeholder="Street name, floor, city..."
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 p-4 font-bold text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all resize-none"
                        value={invoice.buyerAddress} onChange={(e) => setInvoice({...invoice, buyerAddress: e.target.value})}
                    />
                </div>
            </div>
          </section>

          {/* Section 2: Line Items */}
          <section className="rounded-3xl bg-white p-8 premium-shadow border border-slate-100">
            <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                        <ShoppingCartIcon className="h-6 w-6" />
                    </div>
                    <h2 className="text-lg font-bold text-slate-900">Items & Services</h2>
                </div>
                <button onClick={addItem} className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-800 transition-colors">
                    <PlusIcon className="h-4 w-4" /> Add Line
                </button>
            </div>
            <div className="space-y-6">
                {invoice.items.map((item, idx) => (
                    <div key={item.id} className="group relative rounded-2xl border border-slate-100 bg-slate-50/30 p-5 transition-all hover:border-indigo-200 hover:bg-white hover:shadow-lg hover:shadow-indigo-50/50">
                        <div className="grid gap-4 sm:grid-cols-12">
                            <div className="sm:col-span-7">
                                <input 
                                    type="text" placeholder="Description of service..."
                                    className="w-full bg-transparent text-sm font-bold text-slate-900 outline-none placeholder:text-slate-400"
                                    value={item.name} onChange={(e) => handleItemChange(item.id, 'name', e.target.value)}
                                />
                            </div>
                            <div className="sm:col-span-2">
                                <input 
                                    type="number" placeholder="Qty"
                                    className="w-full bg-transparent text-right text-sm font-bold text-slate-600 outline-none"
                                    value={item.quantity} onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value)}
                                />
                            </div>
                            <div className="sm:col-span-3">
                                <input 
                                    type="number" placeholder="Rate"
                                    className="w-full bg-transparent text-right text-sm font-black text-slate-900 outline-none"
                                    value={item.rate} onChange={(e) => handleItemChange(item.id, 'rate', e.target.value)}
                                />
                            </div>
                        </div>
                        {invoice.items.length > 1 && (
                            <button 
                                onClick={() => setInvoice({...invoice, items: invoice.items.filter(i => i.id !== item.id)})}
                                className="absolute -right-3 -top-3 hidden group-hover:flex h-8 w-8 items-center justify-center rounded-full bg-rose-50 text-rose-500 shadow-lg transition-all hover:bg-rose-500 hover:text-white"
                            >
                                <TrashIcon className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                ))}
            </div>
          </section>
        </div>

        {/* Sidebar: Totals & Settings */}
        <div className="space-y-8">
            <div className="sticky top-24 rounded-3xl bg-slate-900 p-8 text-white premium-shadow">
                <div className="mb-8 flex items-center gap-3">
                    <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/10">
                        {/* Fix: Added missing icon import */}
                        <BanknotesIcon className="h-6 w-6" />
                    </div>
                    <h2 className="text-lg font-bold">Billing Summary</h2>
                </div>
                
                <div className="space-y-4">
                    <div className="flex justify-between text-slate-400 text-sm font-bold">
                        <span>Subtotal</span>
                        <span className="text-white">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(invoice.subtotal)}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-400 text-sm font-bold">
                        <span>GST (%)</span>
                        <input 
                            type="number" 
                            className="w-16 bg-white/10 rounded-lg px-2 py-1 text-right text-white outline-none border border-white/10"
                            value={invoice.taxRate} 
                            onChange={(e) => setInvoice({...invoice, taxRate: parseFloat(e.target.value) || 0, ...recalculate(invoice.items, parseFloat(e.target.value) || 0)})} 
                        />
                    </div>
                    <div className="pt-4 border-t border-white/10 flex justify-between items-end">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Total Amount Due</p>
                            <p className="text-3xl font-black">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(invoice.total)}</p>
                        </div>
                    </div>
                </div>

                <div className="mt-10 space-y-3">
                    <button 
                        onClick={() => handleSave('INVOICE')}
                        className="w-full rounded-2xl bg-white py-4 text-sm font-black text-slate-900 shadow-xl transition-all hover:bg-indigo-50 active:scale-95"
                    >
                        Review & Send
                    </button>
                    <p className="text-center text-[10px] font-bold text-slate-500 uppercase tracking-widest">Client will receive a PDF via Email</p>
                </div>
            </div>

            <div className="rounded-3xl bg-white p-8 premium-shadow border border-slate-100">
                <div className="mb-6 flex items-center gap-3">
                    <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-slate-50 text-slate-600">
                        <CogIcon className="h-6 w-6" />
                    </div>
                    <h2 className="text-lg font-bold text-slate-900">Document Prefs</h2>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 mb-1 block">Reference #</label>
                        <input 
                            type="text" className="w-full rounded-xl border border-slate-200 bg-slate-50/30 p-3 text-sm font-bold"
                            value={invoice.invoiceNumber} onChange={(e) => setInvoice({...invoice, invoiceNumber: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 mb-1 block">Payment Provider</label>
                        <select 
                            className="w-full rounded-xl border border-slate-200 bg-slate-50/30 p-3 text-sm font-bold"
                            value={invoice.paymentGateway} onChange={(e) => setInvoice({...invoice, paymentGateway: e.target.value as any})}
                        >
                            <option value="Razorpay">Razorpay Checkout</option>
                            <option value="CCAvenue">CCAvenue Secure</option>
                            <option value="CASH">Manual / Cash</option>
                        </select>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default CreateInvoice;
