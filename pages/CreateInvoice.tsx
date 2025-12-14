import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { InvoiceData, LineItem, InvoiceTemplate, PaymentStatus, PaymentGateway } from '../types';
import { PhotoIcon, PlusIcon, TrashIcon, DocumentTextIcon, ArrowPathIcon, ChevronLeftIcon, CheckCircleIcon, ChatBubbleLeftRightIcon, EyeIcon, CreditCardIcon } from '@heroicons/react/24/outline';
import { InvoiceService } from '../services/invoiceService';

const generateInvoiceNumber = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.floor(1000 + Math.random() * 9000);
  return `INV-${year}${month}${day}-${random}`;
};

// Default data for a fresh invoice
const getInitialInvoice = (): InvoiceData => ({
  id: `inv_${Date.now()}`,
  invoiceNumber: generateInvoiceNumber(),
  date: new Date().toISOString().split('T')[0],
  dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  
  // Branding Defaults
  template: 'modern',
  brandColor: '#4f46e5', // Indigo-600 default
  logoUrl: '',

  sellerName: 'John Doe',
  businessName: 'Acme Design Studio',
  sellerAddress: '123 Creator Lane, Tech Park, Bangalore, KA 560038',
  sellerGstin: '29ABCDE1234F1Z5',
  sellerEmail: 'accounts@acmedesign.com',
  sellerPhone: '+91 98765 43210',
  buyerName: 'Sarah Smith',
  buyerEmail: 'sarah@client.com',
  buyerPhone: '+91 98765 12345',
  buyerAddress: '456 Startup Hub, Indiranagar, Bangalore, KA 560008',
  items: [
    { id: '1', description: 'UI/UX Design Services', quantity: 1, rate: 50000, amount: 50000 },
    { id: '2', description: 'Frontend Implementation', quantity: 1, rate: 35000, amount: 35000 }
  ],
  subtotal: 85000,
  taxRate: 18,
  taxAmount: 15300,
  total: 100300,
  currency: 'INR',
  status: PaymentStatus.PENDING,
  paymentGateway: 'CCAvenue', // Default
  notes: 'Thank you for your business! Please pay within 7 days.'
});

const CreateInvoice: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  
  const [invoice, setInvoice] = useState<InvoiceData>(getInitialInvoice);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(!!id);
  
  // Success Modal State
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Check if we are in Edit Mode and load data
  useEffect(() => {
    const loadInvoice = async () => {
        if (id) {
          setIsLoading(true);
          try {
            const existingInvoice = await InvoiceService.getInvoiceById(id);
            if (existingInvoice) {
              setInvoice({
                  ...existingInvoice,
                  paymentGateway: existingInvoice.paymentGateway || 'CCAvenue' // Backwards compatibility
              });
              setIsEditMode(true);
            } else {
              alert("Invoice not found.");
              navigate('/');
            }
          } catch(e) {
              console.error(e);
              alert("Error loading invoice");
          } finally {
            setIsLoading(false);
          }
        }
    };
    loadInvoice();
  }, [id, navigate]);

  const handleChange = (section: keyof InvoiceData, value: any) => {
     setInvoice({ ...invoice, [section]: value });
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
        updated.amount = updated.quantity * updated.rate;
        return updated;
      }
      return item;
    });
    
    const totals = recalculateTotals(newItems);
    setInvoice({ ...invoice, items: newItems, ...totals });
  };

  const handleAddItem = () => {
    const newItem: LineItem = {
      id: Date.now().toString(),
      description: '',
      quantity: 1,
      rate: 0,
      amount: 0
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
      setInvoice(getInitialInvoice());
      setIsEditMode(false);
      navigate('/create');
      window.scrollTo(0, 0);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
        const invoiceToSave = { 
          ...invoice, 
          status: isEditMode ? invoice.status : PaymentStatus.PENDING 
        };
        
        await InvoiceService.saveInvoice(invoiceToSave);
        setShowSuccessModal(true);
    } catch (error) {
        alert("Failed to save invoice.");
        console.error(error);
    } finally {
        setIsSaving(false);
    }
  };

  const handleWhatsAppRedirect = () => {
     if (!invoice.buyerPhone) return;

     const baseUrl = window.location.href.split('#')[0];
     const viewUrl = `${baseUrl}#/view/${invoice.id}`;
     const amount = new Intl.NumberFormat('en-IN', { style: 'currency', currency: invoice.currency }).format(invoice.total);
     
     const message = `Hello ${invoice.buyerName}, here is your invoice from ${invoice.businessName} for ${amount}. View and pay here: ${viewUrl}`;
     
     const cleanPhone = invoice.buyerPhone.replace(/[^0-9]/g, '');
     const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
     
     window.open(whatsappUrl, '_blank');
     navigate(`/view/${invoice.id}`);
  };

  const handleViewInvoice = () => {
    navigate(`/view/${invoice.id}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading invoice...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8 relative">
      
      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity" />
           <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center animate-fade-in-up">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
                <CheckCircleIcon className="h-10 w-10 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Invoice Created!</h3>
              <p className="text-gray-500 mb-6 text-sm">
                Your invoice <strong>{invoice.invoiceNumber}</strong> has been generated successfully. How would you like to proceed?
              </p>
              
              <div className="space-y-3">
                 <button 
                   onClick={handleWhatsAppRedirect}
                   className="w-full inline-flex justify-center items-center gap-2 rounded-lg border border-transparent bg-[#25D366] px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#128C7E] focus:outline-none focus:ring-2 focus:ring-[#25D366] focus:ring-offset-2 transition-all"
                 >
                   <ChatBubbleLeftRightIcon className="w-5 h-5" />
                   Send on WhatsApp
                 </button>
                 
                 <button 
                   onClick={handleViewInvoice}
                   className="w-full inline-flex justify-center items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none transition-all"
                 >
                   <EyeIcon className="w-5 h-5" />
                   View Invoice Only
                 </button>
              </div>
           </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto">
        <div className="mb-8 text-center relative">
          <button 
             onClick={() => navigate(isEditMode ? `/view/${invoice.id}` : '/')}
             className="absolute left-0 top-1 text-gray-500 hover:text-gray-800 flex items-center gap-1 text-sm font-medium"
          >
             <ChevronLeftIcon className="w-4 h-4" /> {isEditMode ? 'Cancel Edit' : 'Dashboard'}
          </button>

          <h1 className="text-3xl font-bold text-gray-900">{isEditMode ? 'Edit Invoice' : 'Create New Invoice'}</h1>
          <p className="mt-2 text-gray-600">
            {isEditMode ? 'Correct the details below and update.' : 'Fill in the details below to generate your invoice.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Section 1: Branding & Template */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4 border-b pb-2">Configuration</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Invoice Template</label>
                <div className="flex gap-3">
                  {(['modern', 'classic', 'minimal'] as InvoiceTemplate[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => handleChange('template', t)}
                      className={`px-4 py-2 text-sm rounded-md capitalize border transition-colors ${
                        invoice.template === t 
                          ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-medium' 
                          : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Brand Color</label>
                <div className="flex items-center gap-3">
                  <input 
                    type="color" 
                    value={invoice.brandColor}
                    onChange={(e) => handleChange('brandColor', e.target.value)}
                    className="h-10 w-10 rounded border-0 p-0 cursor-pointer shadow-sm"
                  />
                  <div className="flex gap-2">
                    {['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#111827'].map(color => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => handleChange('brandColor', color)}
                        className={`w-6 h-6 rounded-full border border-gray-200 ${invoice.brandColor === color ? 'ring-2 ring-offset-2 ring-gray-400' : ''}`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Payment Gateway Selector */}
              <div className="col-span-1 md:col-span-2 mt-2 pt-4 border-t border-gray-100">
                 <label className="block text-sm font-medium text-gray-700 mb-2">Payment Gateway</label>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div 
                      onClick={() => handleChange('paymentGateway', 'CCAvenue')}
                      className={`cursor-pointer border rounded-lg p-4 flex items-center gap-3 transition-all ${
                        invoice.paymentGateway === 'CCAvenue' 
                        ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500' 
                        : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${invoice.paymentGateway === 'CCAvenue' ? 'border-indigo-600' : 'border-gray-400'}`}>
                           {invoice.paymentGateway === 'CCAvenue' && <div className="w-3 h-3 bg-indigo-600 rounded-full" />}
                        </div>
                        <div className="flex-1">
                           <span className="font-bold text-gray-900 block">CCAvenue</span>
                           <span className="text-xs text-gray-500">Supports Netbanking, Cards, UPI (Popup Flow)</span>
                        </div>
                    </div>

                    <div 
                      onClick={() => handleChange('paymentGateway', 'Razorpay')}
                      className={`cursor-pointer border rounded-lg p-4 flex items-center gap-3 transition-all ${
                        invoice.paymentGateway === 'Razorpay' 
                        ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' 
                        : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${invoice.paymentGateway === 'Razorpay' ? 'border-blue-600' : 'border-gray-400'}`}>
                           {invoice.paymentGateway === 'Razorpay' && <div className="w-3 h-3 bg-blue-600 rounded-full" />}
                        </div>
                        <div className="flex-1">
                           <span className="font-bold text-gray-900 block">Razorpay</span>
                           <span className="text-xs text-gray-500">Modern checkout, UPI, Cards (Modal Flow)</span>
                        </div>
                    </div>
                 </div>
              </div>
            </div>
          </div>

          {/* Section 2: Invoice Details (Meta) */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4 border-b pb-2 flex items-center gap-2">
              <DocumentTextIcon className="w-5 h-5 text-gray-500" /> Invoice Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Number</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. INV-001"
                  value={invoice.invoiceNumber}
                  onChange={(e) => handleChange('invoiceNumber', e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  required
                  value={invoice.date}
                  onChange={(e) => handleChange('date', e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                <input
                  type="date"
                  required
                  value={invoice.dueDate}
                  onChange={(e) => handleChange('dueDate', e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Seller & Buyer */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Seller */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4 border-b pb-2">From (Seller)</h2>
              <div className="space-y-4">
                <div className="flex items-center gap-4 mb-4">
                    <div className="h-16 w-16 bg-gray-100 rounded flex items-center justify-center overflow-hidden border border-gray-200">
                      {invoice.logoUrl ? (
                        <img src={invoice.logoUrl} alt="Logo" className="h-full w-full object-contain" />
                      ) : (
                        <PhotoIcon className="h-8 w-8 text-gray-400" />
                      )}
                    </div>
                    <div>
                      <label className="cursor-pointer bg-white py-2 px-3 border border-gray-300 rounded-md shadow-sm text-sm leading-4 font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                        Upload Logo
                        <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                      </label>
                    </div>
                </div>

                <input
                  type="text"
                  placeholder="Business Name"
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                  value={invoice.businessName}
                  onChange={(e) => handleChange('businessName', e.target.value)}
                />
                <input
                  type="text"
                  placeholder="Your Name"
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                  value={invoice.sellerName}
                  onChange={(e) => handleChange('sellerName', e.target.value)}
                />
                <input
                  type="text"
                  placeholder="GSTIN / Tax ID"
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                  value={invoice.sellerGstin}
                  onChange={(e) => handleChange('sellerGstin', e.target.value)}
                />
                <input
                  type="email"
                  placeholder="Email Address"
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                  value={invoice.sellerEmail}
                  onChange={(e) => handleChange('sellerEmail', e.target.value)}
                />
                <input
                  type="tel"
                  placeholder="Phone Number"
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                  value={invoice.sellerPhone}
                  onChange={(e) => handleChange('sellerPhone', e.target.value)}
                />
                <textarea
                  placeholder="Address"
                  rows={3}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                  value={invoice.sellerAddress}
                  onChange={(e) => handleChange('sellerAddress', e.target.value)}
                />
              </div>
            </div>

            {/* Buyer */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4 border-b pb-2">Bill To (Client)</h2>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Client Name"
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                  value={invoice.buyerName}
                  onChange={(e) => handleChange('buyerName', e.target.value)}
                />
                <input
                  type="email"
                  placeholder="Client Email"
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                  value={invoice.buyerEmail}
                  onChange={(e) => handleChange('buyerEmail', e.target.value)}
                />
                <input
                  type="tel"
                  placeholder="Client Phone"
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                  value={invoice.buyerPhone}
                  onChange={(e) => handleChange('buyerPhone', e.target.value)}
                />
                <textarea
                  placeholder="Client Address"
                  rows={3}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                  value={invoice.buyerAddress}
                  onChange={(e) => handleChange('buyerAddress', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Section 4: Items */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex justify-between items-center mb-4 border-b pb-2">
               <h2 className="text-lg font-medium text-gray-900">Items</h2>
               <div className="flex items-center gap-2">
                 <label className="text-sm text-gray-600">Currency:</label>
                 <select 
                    value={invoice.currency} 
                    onChange={(e) => handleChange('currency', e.target.value)}
                    className="border border-gray-300 rounded text-sm p-1"
                  >
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                 </select>
               </div>
            </div>

            <div className="space-y-4">
              {/* Table Header (Hidden on mobile) */}
              <div className="hidden md:flex gap-4 text-sm font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex-1">Description</div>
                <div className="w-24 text-center">Qty</div>
                <div className="w-32 text-right">Rate</div>
                <div className="w-32 text-right">Amount</div>
                <div className="w-10"></div>
              </div>

              {invoice.items.map((item, index) => (
                <div key={item.id} className="flex flex-col md:flex-row gap-4 items-start md:items-center bg-gray-50 p-3 rounded-md md:bg-transparent md:p-0">
                  <div className="flex-1 w-full">
                    <label className="md:hidden text-xs text-gray-500 font-bold mb-1 block">Description</label>
                    <input
                      type="text"
                      placeholder="Item description"
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                      value={item.description}
                      onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                    />
                  </div>
                  <div className="flex gap-4 w-full md:w-auto">
                    <div className="w-24">
                      <label className="md:hidden text-xs text-gray-500 font-bold mb-1 block">Qty</label>
                      <input
                        type="number"
                        min="1"
                        placeholder="Qty"
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2 text-center"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(item.id, 'quantity', Number(e.target.value))}
                      />
                    </div>
                    <div className="w-full md:w-32">
                      <label className="md:hidden text-xs text-gray-500 font-bold mb-1 block">Rate</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="Rate"
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2 text-right"
                        value={item.rate}
                        onChange={(e) => handleItemChange(item.id, 'rate', Number(e.target.value))}
                      />
                    </div>
                  </div>
                  <div className="w-full md:w-32 text-right font-medium text-gray-900 flex justify-between md:block items-center">
                    <span className="md:hidden text-sm text-gray-500">Total:</span>
                    {new Intl.NumberFormat('en-IN', { style: 'currency', currency: invoice.currency }).format(item.amount)}
                  </div>
                  <div className="w-full md:w-10 flex justify-end">
                     <button
                        type="button"
                        onClick={() => handleDeleteItem(item.id)}
                        className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-full transition-colors"
                        title="Remove Item"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={handleAddItem}
                className="mt-2 flex items-center gap-2 text-indigo-600 font-medium text-sm hover:text-indigo-800"
              >
                <PlusIcon className="w-4 h-4" /> Add Line Item
              </button>
            </div>

            {/* Totals Section */}
            <div className="mt-8 border-t pt-4 flex flex-col items-end">
              <div className="w-full md:w-1/3 space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Subtotal</span>
                  <span>{new Intl.NumberFormat('en-IN', { style: 'currency', currency: invoice.currency }).format(invoice.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm items-center">
                  <span className="text-gray-600">Tax Rate (%)</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    className="w-20 rounded border-gray-300 text-right p-1 text-sm border focus:ring-indigo-500"
                    value={invoice.taxRate}
                    onChange={(e) => {
                       const newRate = Number(e.target.value);
                       const newTaxAmount = invoice.subtotal * (newRate / 100);
                       setInvoice({ ...invoice, taxRate: newRate, taxAmount: newTaxAmount, total: invoice.subtotal + newTaxAmount });
                    }}
                  />
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Tax Amount</span>
                  <span>{new Intl.NumberFormat('en-IN', { style: 'currency', currency: invoice.currency }).format(invoice.taxAmount)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold text-gray-900 border-t pt-2 mt-2">
                  <span>Total</span>
                  <span style={{ color: invoice.brandColor }}>
                    {new Intl.NumberFormat('en-IN', { style: 'currency', currency: invoice.currency }).format(invoice.total)}
                  </span>
                </div>
              </div>
            </div>
          </div>

           {/* Section 5: Notes */}
           <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4 border-b pb-2">Additional Notes</h2>
              <textarea
                rows={4}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                placeholder="Terms & Conditions, Payment details, or a thank you note..."
                value={invoice.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
              />
           </div>

          {/* Submit Action */}
          <div className="flex flex-col-reverse md:flex-row justify-end gap-4 pt-4 pb-12">
            {!isEditMode && (
              <button
                type="button"
                onClick={handleReset}
                className="px-6 py-3 bg-white text-gray-700 font-medium rounded-lg shadow-sm border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400 flex justify-center items-center gap-2"
              >
                <ArrowPathIcon className="w-5 h-5" /> Reset
              </button>
            )}
            <button
              type="submit"
              disabled={isSaving}
              className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-lg shadow-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-transform transform active:scale-95 flex justify-center items-center disabled:opacity-70 disabled:cursor-not-allowed"
              style={{ backgroundColor: invoice.brandColor }}
            >
              {isSaving ? (
                 <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                 isEditMode ? 'Update Invoice' : 'Generate Invoice'
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default CreateInvoice;