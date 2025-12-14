import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { InvoiceData, LineItem, PaymentStatus, Product, DocumentType } from '../types';
import { PhotoIcon, PlusIcon, TrashIcon, DocumentTextIcon, ArrowPathIcon, ChevronLeftIcon, CheckCircleIcon, ChatBubbleLeftRightIcon, EyeIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { InvoiceService } from '../services/invoiceService';
import { ProductService } from '../services/productService';

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
  type: 'INVOICE',
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
  buyerName: '',
  buyerEmail: '',
  buyerPhone: '',
  buyerAddress: '',
  
  // Resource Fields (Internal)
  resourceSection: '',
  resourceName: '',

  items: [
    { id: '1', name: '', description: '', quantity: 1, rate: 0, amount: 0 },
  ],
  subtotal: 0,
  taxRate: 18,
  taxAmount: 0,
  total: 0,
  currency: 'INR',
  status: PaymentStatus.PENDING,
  paymentGateway: '', // No Default Selection
  notes: 'Thank you for your business! Please pay within 7 days.'
});

const CreateInvoice: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  
  const [invoice, setInvoice] = useState<InvoiceData>(getInitialInvoice);
  const [products, setProducts] = useState<Product[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(!!id);
  
  // Success Modal State
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // AI Loading State: stores the ID of the field currently generating
  const [generatingField, setGeneratingField] = useState<string | null>(null);

  // Load Invoice and Products
  useEffect(() => {
    const init = async () => {
        // Load Products
        const prodData = await ProductService.getAllProducts();
        setProducts(prodData);

        // Load Invoice if ID exists
        if (id) {
          setIsLoading(true);
          try {
            const existingInvoice = await InvoiceService.getInvoiceById(id);
            if (existingInvoice) {
              setInvoice({
                  ...existingInvoice,
                  resourceSection: existingInvoice.resourceSection || '',
                  resourceName: existingInvoice.resourceName || '',
                  paymentGateway: existingInvoice.paymentGateway || '',
                  type: existingInvoice.type || 'INVOICE',
                  template: 'modern'
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
    init();
  }, [id, navigate]);

  // --- AI GENERATION LOGIC ---
  const generateAIContent = async (
    targetField: 'notes' | string, // 'notes' or item ID
    currentText: string,
    type: 'DESCRIPTION' | 'NOTES'
  ) => {
    // If empty input, prompt user
    if (!currentText || !currentText.trim()) {
        const userInput = prompt(type === 'NOTES' ? "Enter key points for the invoice terms:" : "Enter product keywords (e.g., 'Web Design'):");
        if (!userInput) return;
        currentText = userInput;
    }
    
    setGeneratingField(targetField);
    try {
        const systemInstruction = type === 'DESCRIPTION' 
            ? "You are an invoice assistant. Expand the user's input into a professional, concise line item description (max 20 words)."
            : "You are a professional business assistant. Write polite, clear invoice notes or terms and conditions based on the input.";
            
        const response = await fetch('/api/ai/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: currentText, systemInstruction })
        });
        
        const data = await response.json();
        if (data.text) {
            if (type === 'NOTES') {
                handleChange('notes', data.text.trim());
            } else {
                // It's an item ID
                handleItemChange(targetField, 'description', data.text.trim());
            }
        } else if (data.error) {
            alert("AI Error: " + data.error);
        }
    } catch (e) {
        console.error(e);
        alert("Failed to connect to AI service. Check backend logs.");
    } finally {
        setGeneratingField(null);
    }
  };

  const handleChange = (section: keyof InvoiceData, value: any) => {
     setInvoice({ ...invoice, [section]: value });
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

  const handleProductSelectByName = (itemId: string, productName: string) => {
    const product = products.find(p => p.name === productName);
    if (!product) return;

    const newItems = invoice.items.map(item => {
        if(item.id === itemId) {
            const qty = parseFloat(item.quantity.toString()) || 0;
            const updated = { 
                ...item, 
                name: product.name,
                description: product.description.substring(0, 100), 
                rate: product.rate,
                amount: qty * product.rate
            };
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
      name: '',
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

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSubmit = async (e: React.FormEvent, docType: DocumentType) => {
    e.preventDefault();
    
    const missingFields: string[] = [];

    if (!invoice.invoiceNumber) missingFields.push("Reference Number");
    if (!invoice.date) missingFields.push("Date");
    if (docType === 'INVOICE' && !invoice.dueDate) missingFields.push("Due Date");
    if (!invoice.buyerName) missingFields.push("Client Name");

    if (invoice.buyerEmail && !isValidEmail(invoice.buyerEmail)) {
        missingFields.push("Valid Client Email Address");
    }

    if (docType === 'INVOICE' && !invoice.paymentGateway) {
        missingFields.push("Payment Gateway");
    }

    let itemsValid = true;
    invoice.items.forEach((item) => {
        if (!item.name || item.name.trim() === '') {
            itemsValid = false;
        }
    });
    if (!itemsValid) {
        missingFields.push("Item Name (for all line items)");
    }

    if (missingFields.length > 0) {
        alert(`Please fill in or correct the following fields:\n\n• ${missingFields.join('\n• ')}`);
        return;
    }

    setIsSaving(true);
    
    try {
        const invoiceToSave: InvoiceData = { 
          ...invoice, 
          type: docType,
          status: isEditMode ? invoice.status : PaymentStatus.PENDING 
        };
        
        await InvoiceService.saveInvoice(invoiceToSave);
        InvoiceService.sendEmailNotification(invoiceToSave, 'CREATED');
        setShowSuccessModal(true);
    } catch (error) {
        alert("Failed to save.");
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
     const docType = invoice.type === 'QUOTATION' ? 'quotation' : 'invoice';
     const message = `Hello ${invoice.buyerName}, here is your ${docType} from ${invoice.businessName} for ${amount}. View details here: ${viewUrl}`;
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
          <p className="text-gray-600">Loading...</p>
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
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {invoice.type === 'QUOTATION' ? 'Quotation Generated!' : 'Invoice Created!'}
              </h3>
              <p className="text-gray-500 mb-6 text-sm">
                Your document <strong>{invoice.invoiceNumber}</strong> has been saved. An email has been sent to the client.
              </p>
              
              <div className="space-y-3">
                 <button 
                   onClick={handleWhatsAppRedirect}
                   className="w-full inline-flex justify-center items-center gap-2 rounded-lg border border-transparent bg-[#25D366] px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#128C7E] focus:outline-none focus:ring-2 focus:ring-[#25D366] focus:ring-offset-2 transition-all"
                 >
                   <ChatBubbleLeftRightIcon className="w-5 h-5" />
                   Share Link on WhatsApp
                 </button>
                 
                 <button 
                   onClick={handleViewInvoice}
                   className="w-full inline-flex justify-center items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none transition-all"
                 >
                   <EyeIcon className="w-5 h-5" />
                   View Document
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

          <h1 className="text-3xl font-bold text-gray-900">{isEditMode ? 'Edit Document' : 'Create New Document'}</h1>
          <p className="mt-2 text-gray-600">
            {isEditMode ? 'Correct the details below and update.' : 'Fill in the details below to generate an Invoice or Quotation.'}
          </p>
        </div>

        <form className="space-y-6">
          
          {/* Section 1: Payment Gateway */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4 border-b pb-2">Configuration</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="col-span-1 md:col-span-2">
                 <label className="block text-sm font-medium text-gray-700 mb-2">Payment Gateway <span className="text-gray-400 font-normal">(Required for Invoices)</span></label>
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
                           <span className="text-xs text-gray-500">Supports Netbanking, Cards, UPI</span>
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
                           <span className="text-xs text-gray-500">Modern checkout, UPI, Cards</span>
                        </div>
                    </div>
                 </div>
              </div>
            </div>
          </div>

          {/* Section 2: Invoice Details (Meta) & Resources */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4 border-b pb-2 flex items-center gap-2">
              <DocumentTextIcon className="w-5 h-5 text-gray-500" /> Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ref Number</label>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-100 bg-gray-50 -mx-6 px-6 pb-2">
                <div className="col-span-full">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Internal Resources (Not shown on document)</span>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Resource Section</label>
                    <input
                        type="text"
                        placeholder="e.g. Marketing Dept"
                        value={invoice.resourceSection}
                        onChange={(e) => handleChange('resourceSection', e.target.value)}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Resource Name</label>
                    <input
                        type="text"
                        placeholder="e.g. Project Alpha"
                        value={invoice.resourceName}
                        onChange={(e) => handleChange('resourceName', e.target.value)}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                    />
                </div>
            </div>
          </div>

          {/* Section 3: Seller & Buyer */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  onChange={(e) => handlePhoneChange('sellerPhone', e.target.value)}
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
                  onChange={(e) => handlePhoneChange('buyerPhone', e.target.value)}
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

          {/* Section 4: Items (With AI) */}
          <div className="bg-white shadow-lg rounded-xl overflow-hidden border border-gray-100">
            <div className="p-6 bg-gray-50 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
               <div>
                 <h2 className="text-xl font-bold text-gray-900">Line Items</h2>
                 <p className="text-xs text-gray-500 mt-1">Add products or services to this document.</p>
               </div>
               <div className="flex items-center gap-3 bg-white p-2 rounded-lg border border-gray-200 shadow-sm">
                 <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Currency</label>
                 <select 
                    value={invoice.currency} 
                    onChange={(e) => handleChange('currency', e.target.value)}
                    className="border-none bg-transparent text-sm font-bold text-gray-900 focus:ring-0 cursor-pointer py-0 pl-2 pr-8"
                  >
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                 </select>
               </div>
            </div>

            <div className="p-6">
              <div className="hidden md:grid grid-cols-[1fr_2fr_100px_120px_120px_50px] gap-4 mb-4 text-xs font-semibold text-gray-500 uppercase tracking-wider px-2">
                <div>Item</div>
                <div>Description</div>
                <div className="text-center">Qty</div>
                <div className="text-right">Rate</div>
                <div className="text-right">Amount</div>
                <div></div>
              </div>

              <div className="space-y-4">
                {invoice.items.map((item, index) => (
                  <div key={item.id} className="group relative">
                    
                    {/* Mobile View */}
                    <div className="md:hidden bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow relative">
                        <button
                            type="button"
                            onClick={() => handleDeleteItem(item.id)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-red-500 transition-colors"
                        >
                            <TrashIcon className="w-5 h-5" />
                        </button>

                        <div className="mb-4 pr-8">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">Item</label>
                            <select
                                className="w-full border-gray-300 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm py-2 px-3"
                                onChange={(e) => handleProductSelectByName(item.id, e.target.value)}
                                value={item.name}
                            >
                                <option value="" disabled>Select Item</option>
                                {products.map(p => (
                                    <option key={p.id} value={p.name}>{p.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="mb-4">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block flex justify-between">
                                <span>Description</span>
                                <button
                                    type="button"
                                    onClick={() => generateAIContent(item.id, item.description, 'DESCRIPTION')}
                                    className="text-indigo-600 flex items-center gap-1 text-[10px] bg-indigo-50 px-2 py-0.5 rounded-full hover:bg-indigo-100"
                                >
                                    {generatingField === item.id ? (
                                        <div className="w-3 h-3 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <SparklesIcon className="w-3 h-3" />
                                    )}
                                    AI Enhance
                                </button>
                            </label>
                            <textarea
                                rows={2}
                                className="w-full border-gray-300 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm p-2 resize-none"
                                placeholder="Details..."
                                value={item.description}
                                onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                                maxLength={100}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">Qty</label>
                                <input
                                    type="number"
                                    min="1"
                                    step="any"
                                    className="w-full border-gray-300 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm p-2"
                                    value={item.quantity}
                                    onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">Rate</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    className="w-full border-gray-300 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm p-2 text-right"
                                    value={item.rate}
                                    onChange={(e) => handleItemChange(item.id, 'rate', e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Desktop View */}
                    <div className="hidden md:grid grid-cols-[1fr_2fr_100px_120px_120px_50px] gap-4 items-start bg-white border border-gray-200 rounded-lg p-3 hover:border-indigo-300 transition-colors shadow-sm">
                        
                        <div>
                            <select
                                className="w-full border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500 py-2 px-3 bg-gray-50 focus:bg-white transition-colors"
                                onChange={(e) => handleProductSelectByName(item.id, e.target.value)}
                                value={item.name}
                            >
                                <option value="" disabled>Select Item</option>
                                {products.map(p => (
                                    <option key={p.id} value={p.name}>{p.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="relative">
                            <input
                                type="text"
                                className="w-full border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500 py-2 pl-3 pr-8 bg-gray-50 focus:bg-white transition-colors"
                                placeholder="Description"
                                value={item.description}
                                onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                                maxLength={100}
                            />
                            <button
                                type="button"
                                onClick={() => generateAIContent(item.id, item.description, 'DESCRIPTION')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-indigo-400 hover:text-indigo-600 transition-colors"
                                title="Enhance with AI"
                            >
                                {generatingField === item.id ? (
                                    <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <SparklesIcon className="w-4 h-4" />
                                )}
                            </button>
                        </div>

                        <div>
                            <input
                                type="number"
                                min="1"
                                step="any"
                                className="w-full border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500 py-2 px-3 text-center bg-gray-50 focus:bg-white transition-colors"
                                value={item.quantity}
                                onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value)}
                            />
                        </div>

                        <div>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
                                    {invoice.currency === 'USD' ? '$' : invoice.currency === 'EUR' ? '€' : '₹'}
                                </span>
                                <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    className="w-full border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500 py-2 pl-6 pr-3 text-right bg-gray-50 focus:bg-white transition-colors"
                                    value={item.rate}
                                    onChange={(e) => handleItemChange(item.id, 'rate', e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="py-2 text-right font-bold text-gray-900">
                            {new Intl.NumberFormat('en-IN', { style: 'currency', currency: invoice.currency }).format(item.amount)}
                        </div>

                        <div className="flex justify-center pt-1">
                            <button
                                type="button"
                                onClick={() => handleDeleteItem(item.id)}
                                className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-md transition-all"
                                title="Remove Line Item"
                            >
                                <TrashIcon className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                  </div>
                ))}
              </div>

              <div className="mt-6">
                <button
                    type="button"
                    onClick={handleAddItem}
                    className="w-full md:w-auto flex items-center justify-center gap-2 py-3 px-6 border-2 border-dashed border-indigo-200 rounded-xl text-indigo-600 font-semibold hover:bg-indigo-50 hover:border-indigo-300 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                    <PlusIcon className="w-5 h-5" />
                    <span>Add New Line Item</span>
                </button>
              </div>
            </div>

            {/* Totals Section */}
            <div className="bg-gray-50 border-t border-gray-200 p-6">
                <div className="flex flex-col md:flex-row justify-end items-end gap-2">
                    <div className="w-full md:w-80 space-y-3">
                        <div className="flex justify-between text-sm text-gray-600">
                            <span>Subtotal</span>
                            <span className="font-medium">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: invoice.currency }).format(invoice.subtotal)}</span>
                        </div>
                        
                        <div className="flex justify-between items-center text-sm text-gray-600">
                            <span className="flex items-center gap-2">
                                Tax Rate 
                                <span className="bg-gray-200 text-gray-600 text-xs py-0.5 px-1.5 rounded">%</span>
                            </span>
                            <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.01"
                                className="w-24 border-gray-300 rounded-md text-right text-sm focus:ring-indigo-500 focus:border-indigo-500 p-1.5"
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
                            <span className="font-medium">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: invoice.currency }).format(invoice.taxAmount)}</span>
                        </div>

                        <div className="border-t border-gray-200 pt-3 mt-2 flex justify-between items-center">
                            <span className="text-base font-bold text-gray-900">Total Payable</span>
                            <span className="text-2xl font-bold text-indigo-600">
                                {new Intl.NumberFormat('en-IN', { style: 'currency', currency: invoice.currency }).format(invoice.total)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
          </div>

           {/* Section 5: Notes (With AI) */}
           <div className="bg-white shadow rounded-lg p-6">
              <div className="flex justify-between items-center mb-4 border-b pb-2">
                  <h2 className="text-lg font-medium text-gray-900">Additional Notes</h2>
                  <button
                    type="button"
                    onClick={() => generateAIContent('notes', invoice.notes || '', 'NOTES')}
                    className="text-indigo-600 hover:text-indigo-800 text-xs font-medium flex items-center gap-1 bg-indigo-50 px-2 py-1 rounded-full transition-colors"
                  >
                    {generatingField === 'notes' ? (
                        <div className="w-3 h-3 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    ) : (
                        <SparklesIcon className="w-3 h-3" />
                    )}
                    Generate Professional Terms
                  </button>
              </div>
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
                type="button"
                onClick={(e) => handleSubmit(e, 'QUOTATION')}
                disabled={isSaving}
                className="px-6 py-3 bg-teal-600 text-white font-bold rounded-lg shadow-md hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-colors flex justify-center items-center disabled:opacity-70"
            >
                {isSaving ? 'Processing...' : isEditMode && invoice.type === 'QUOTATION' ? 'Update Quotation' : 'Generate Quotation'}
            </button>

            <button
              type="button"
              onClick={(e) => handleSubmit(e, 'INVOICE')}
              disabled={isSaving}
              className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-lg shadow-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-transform transform active:scale-95 flex justify-center items-center disabled:opacity-70 disabled:cursor-not-allowed"
              style={{ backgroundColor: invoice.brandColor }}
            >
              {isSaving ? (
                 <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                 isEditMode && invoice.type === 'INVOICE' ? 'Update Invoice' : 'Generate Invoice'
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default CreateInvoice;