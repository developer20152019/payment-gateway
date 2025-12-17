import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { InvoiceData, LineItem, PaymentStatus, Product, DocumentType, Customer } from '../types';
import { PhotoIcon, PlusIcon, TrashIcon, DocumentTextIcon, ArrowPathIcon, ChevronLeftIcon, CheckCircleIcon, ChatBubbleLeftRightIcon, EyeIcon, UserPlusIcon, XMarkIcon } from '@heroicons/react/24/outline';
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

// Default data for a fresh invoice
const getInitialInvoice = (): InvoiceData => ({
  id: `est_${Date.now()}`,
  invoiceNumber: generateInvoiceNumber(),
  type: 'INVOICE',
  // Store full ISO string to capture exact creation time
  date: new Date().toISOString(),
  dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  
  // Branding Defaults
  template: 'modern',
  brandColor: '#4f46e5', // Indigo-600 default
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
  
  // Resource Fields (Internal)
  resourceSection: '',
  resourceName: '',

  items: [
    { id: `item_${Date.now()}`, name: '', description: '', quantity: 1, rate: 0, amount: 0 },
  ],
  subtotal: 0,
  taxRate: 0, // Default Tax Rate set to 0
  taxAmount: 0,
  total: 0,
  currency: 'INR',
  status: PaymentStatus.PENDING,
  paymentGateway: '', // No Default Selection
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
  
  // States
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeItemIndex, setActiveItemIndex] = useState<number | null>(null); // Track which item row has open dropdown
  const [shippingSameAsBilling, setShippingSameAsBilling] = useState(false);

  // New Customer Modal State
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [newCustomer, setNewCustomer] = useState<Customer>({
      id: '', name: '', email: '', phone: '', address: '', gstin: '',
      contactPerson: '', shippingAddress: '', placeOfSupply: '', pinCode: ''
  });
  const [newCustomerSameAsBilling, setNewCustomerSameAsBilling] = useState(false);

  // Load Invoice and Products and Customers
  useEffect(() => {
    const init = async () => {
        setIsLoading(true);
        // Load Products & Customers
        const [prodData, custData] = await Promise.all([
            ProductService.getAllProducts(),
            CustomerService.getAllCustomers()
        ]);
        setProducts(prodData);
        setCustomers(custData);

        // Load Invoice if ID exists
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
              
              // Check if billing and shipping are same on load
              if (existingInvoice.buyerAddress && existingInvoice.buyerShippingAddress && existingInvoice.buyerAddress === existingInvoice.buyerShippingAddress) {
                  setShippingSameAsBilling(true);
              }

              setIsEditMode(true);
            } else {
              alert("Invoice not found.");
              navigate('/');
            }
          } catch(e) {
              console.error(e);
              alert("Error loading invoice");
          }
        } else {
            // New Invoice: Load Default Seller Settings
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
            } catch(e) {
                console.error("Failed to load seller defaults", e);
            }
        }
        setIsLoading(false);
    };
    init();
  }, [id, navigate]);

  // Sync Shipping with Billing if checked
  useEffect(() => {
      if (shippingSameAsBilling) {
          setInvoice(prev => ({ ...prev, buyerShippingAddress: prev.buyerAddress }));
      }
  }, [invoice.buyerAddress, shippingSameAsBilling]);

  const handleChange = (section: keyof InvoiceData, value: any) => {
     setInvoice({ ...invoice, [section]: value });
  };

  const handleDateChange = (section: keyof InvoiceData, newValue: string) => {
      // Input date is YYYY-MM-DD. We want to preserve the time from the existing ISO string.
      const currentIso = invoice[section] as string;
      // Default to current time if no time found or new string
      const currentTimePart = (currentIso && currentIso.includes('T')) 
          ? currentIso.split('T')[1] 
          : new Date().toISOString().split('T')[1];
      
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
    setActiveItemIndex(null); // Close dropdown
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

  // Add New Customer Logic
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
          console.error("Failed to save customer", error);
          alert("Failed to save customer. Please try again.");
      }
  };

  const handleAddItem = () => {
    const newItem: LineItem = {
      id: `item_${Date.now()}`,
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
      // Reload defaults
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

    // Require Email for Invoices to ensure sending works
    if (docType === 'INVOICE' && !invoice.buyerEmail) {
        missingFields.push("Client Email Address (Required for sending)");
    } else if (invoice.buyerEmail && !isValidEmail(invoice.buyerEmail)) {
        missingFields.push("Valid Client Email Address");
    }

    if (docType === 'INVOICE' && !invoice.paymentGateway) {
        missingFields.push("Payment Gateway");
    }

    if (!invoice.resourceSection) missingFields.push("Resource Section");
    if (!invoice.resourceName) missingFields.push("Resource Name");

    let itemsValid = true;
    invoice.items.forEach((item) => {
        if (!item.name || item.name.trim() === '') {
            itemsValid = false;
        }
    });
    if (!itemsValid) {
        missingFields.push("All items must have a name");
    }

    if (missingFields.length > 0) {
        alert(`Please correct the following before saving:\n\n- ${missingFields.join('\n- ')}`);
        return;
    }

    setIsSaving(true);
    try {
        const invoiceToSave = { ...invoice, type: docType };
        
        // Save to Backend/Storage
        await InvoiceService.saveInvoice(invoiceToSave);
        
        // Redirect to View Invoice page and trigger email/share workflow
        navigate(`/view/${invoiceToSave.id}`, { 
            state: { 
                autoSendEmail: true,
                openShare: true 
            } 
        });
        
    } catch (error) {
        console.error("Failed to save:", error);
        alert("An error occurred while saving the document.");
    } finally {
        setIsSaving(false);
    }
  };

  if (isLoading) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-gray-50">
              <div className="text-gray-500 font-medium animate-pulse">Loading editor...</div>
          </div>
      );
  }

  // Safe split for input display
  const dateValue = invoice.date ? invoice.date.split('T')[0] : '';
  const dueDateValue = invoice.dueDate ? invoice.dueDate.split('T')[0] : '';

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <nav className="bg-white border-b border-gray-200 px-4 md:px-6 py-4 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
             <button onClick={() => navigate('/')} className="text-gray-500 hover:text-gray-800 transition-colors">
                <ChevronLeftIcon className="w-5 h-5" />
             </button>
             <h1 className="font-bold text-xl text-gray-900">
               {isEditMode ? 'Edit Document' : 'New Document'}
             </h1>
          </div>
          <div className="flex gap-3">
             <button 
                onClick={handleReset}
                className="hidden md:flex items-center gap-2 text-gray-500 hover:text-red-600 px-3 py-2 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium"
             >
                <ArrowPathIcon className="w-4 h-4" /> Reset
             </button>
             <button 
                onClick={(e) => handleSubmit(e, 'QUOTATION')}
                disabled={isSaving}
                className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium text-sm hover:bg-gray-50 transition-colors flex items-center gap-2"
             >
                Send Quote
             </button>
             <button 
                onClick={(e) => handleSubmit(e, 'INVOICE')}
                disabled={isSaving}
                className="bg-indigo-600 text-white px-5 py-2 rounded-lg font-medium text-sm hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-sm shadow-indigo-200"
             >
                {isSaving ? 'Saving...' : 'Send Invoice'}
             </button>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 mt-8">
         <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Column: Form */}
            <div className="lg:col-span-2 space-y-6">
                
                {/* 1. Document Details */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Reference No</label>
                            <div className="flex items-center gap-2">
                                <span className="text-gray-400 font-mono text-lg">#</span>
                                <input 
                                    type="text" 
                                    className="w-full font-mono text-lg font-bold text-gray-800 border-b-2 border-gray-200 focus:border-indigo-500 outline-none py-1 bg-transparent transition-colors"
                                    value={invoice.invoiceNumber}
                                    onChange={(e) => handleChange('invoiceNumber', e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                                    Date <span className="text-red-500">*</span>
                                </label>
                                <input 
                                    type="date" 
                                    required
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow"
                                    value={dateValue}
                                    onChange={(e) => handleDateChange('date', e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                                    Due Date
                                </label>
                                <input 
                                    type="date" 
                                    min={dateValue}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow"
                                    value={dueDateValue}
                                    onChange={(e) => handleDateChange('dueDate', e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Resources & Payment Gateway */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-100">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                                Resource Section <span className="text-red-500">*</span>
                            </label>
                            <select 
                                className={`w-full border rounded-md p-2 text-sm bg-white focus:ring-indigo-500 focus:border-indigo-500 ${!invoice.resourceSection ? 'border-amber-300 bg-amber-50' : 'border-gray-300'}`}
                                value={invoice.resourceSection}
                                onChange={(e) => handleChange('resourceSection', e.target.value)}
                            >
                                <option value="">Select Section</option>
                                {RESOURCE_SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                                Resource Name <span className="text-red-500">*</span>
                            </label>
                            <select 
                                className={`w-full border rounded-md p-2 text-sm bg-white focus:ring-indigo-500 focus:border-indigo-500 ${!invoice.resourceName ? 'border-amber-300 bg-amber-50' : 'border-gray-300'}`}
                                value={invoice.resourceName}
                                onChange={(e) => handleChange('resourceName', e.target.value)}
                            >
                                <option value="">Select Resource</option>
                                {RESOURCE_NAMES.map(n => <option key={n} value={n}>{n}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Payment Gateway</label>
                            <select 
                                className="w-full border border-gray-300 rounded-md p-2 text-sm bg-white focus:ring-indigo-500 focus:border-indigo-500"
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

                {/* 2. Client Details */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Bill To (Client)</h2>
                        <button 
                            onClick={() => setShowAddCustomerModal(true)}
                            className="text-xs flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-medium"
                        >
                            <UserPlusIcon className="w-4 h-4" /> Add New Client
                        </button>
                    </div>
                    
                    <div className="relative mb-4">
                        <input 
                            type="text" 
                            className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                            placeholder="Search or enter client name..."
                            value={invoice.buyerName}
                            onChange={(e) => {
                                handleChange('buyerName', e.target.value);
                                setShowSuggestions(true);
                            }}
                            onFocus={() => setShowSuggestions(true)}
                            onClick={() => setShowSuggestions(true)} // Open on click too
                        />
                        {/* Suggestions Dropdown */}
                        {showSuggestions && (
                            <div className="absolute z-10 w-full bg-white border border-gray-200 mt-1 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                                {customers.filter(c => c.name.toLowerCase().includes((invoice.buyerName || '').toLowerCase())).map(c => (
                                    <div 
                                        key={c.id} 
                                        className="px-4 py-2 hover:bg-gray-50 cursor-pointer text-sm"
                                        onClick={() => handleCustomerSelect(c)}
                                    >
                                        <div className="font-bold text-gray-800">{c.name}</div>
                                        <div className="text-gray-500 text-xs">{c.email}</div>
                                    </div>
                                ))}
                                {customers.length > 0 && customers.filter(c => c.name.toLowerCase().includes((invoice.buyerName || '').toLowerCase())).length === 0 && (
                                    <div className="px-4 py-2 text-xs text-gray-400 italic">No matching clients found.</div>
                                )}
                                {customers.length === 0 && (
                                     <div className="px-4 py-2 text-xs text-gray-400 italic">No saved customers. Add one above.</div>
                                )}
                            </div>
                        )}
                        {/* Overlay to close suggestions */}
                        {showSuggestions && <div className="fixed inset-0 z-0" onClick={() => setShowSuggestions(false)}></div>}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="relative">
                            <input 
                                type="email" 
                                placeholder="Email Address" 
                                className={`w-full border rounded-lg p-2 text-sm outline-none focus:border-indigo-500 ${!invoice.buyerEmail ? 'border-amber-300 bg-amber-50' : 'border-gray-300'}`}
                                value={invoice.buyerEmail} 
                                onChange={(e) => handleChange('buyerEmail', e.target.value)} 
                            />
                            {!invoice.buyerEmail && <span className="absolute right-2 top-2 text-[10px] text-amber-600 font-bold">Required</span>}
                        </div>
                        <input type="tel" placeholder="Phone Number" className="border border-gray-300 rounded-lg p-2 text-sm outline-none focus:border-indigo-500" value={invoice.buyerPhone} onChange={(e) => handlePhoneChange('buyerPhone', e.target.value)} />
                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Billing Address</label>
                            <textarea rows={2} placeholder="Street, Building, Area..." className="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none focus:border-indigo-500 resize-none" value={invoice.buyerAddress} onChange={(e) => handleChange('buyerAddress', e.target.value)}></textarea>
                        </div>
                        
                        {/* Shipping Address */}
                        <div className="md:col-span-2">
                            <div className="flex items-center gap-2 mb-2">
                                <input 
                                    type="checkbox" 
                                    id="sameAsBilling"
                                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
                                    checked={shippingSameAsBilling}
                                    onChange={(e) => setShippingSameAsBilling(e.target.checked)}
                                />
                                <label htmlFor="sameAsBilling" className="text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer select-none">
                                    Shipping Address same as Billing
                                </label>
                            </div>
                            
                            {!shippingSameAsBilling && (
                                <textarea 
                                    rows={2} 
                                    placeholder="Shipping Address" 
                                    className="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none focus:border-indigo-500 resize-none animate-fade-in"
                                    value={invoice.buyerShippingAddress} 
                                    onChange={(e) => handleChange('buyerShippingAddress', e.target.value)}
                                ></textarea>
                            )}
                        </div>

                        <div>
                            <input type="text" placeholder="Place of Supply (State)" className="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none focus:border-indigo-500" value={invoice.placeOfSupply} onChange={(e) => handleChange('placeOfSupply', e.target.value)} />
                        </div>
                        <div>
                            <input type="text" placeholder="Pin Code" className="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none focus:border-indigo-500" value={invoice.buyerPinCode} onChange={(e) => handleChange('buyerPinCode', e.target.value)} />
                        </div>
                    </div>
                </div>

                {/* 3. Items */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 relative">
                    <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Line Items</h2>
                    <div className="space-y-4">
                        {invoice.items.map((item, index) => {
                            // Logic to find available products for THIS row (filter out already selected in OTHER rows)
                            const otherItemNames = invoice.items
                                .filter((_, i) => i !== index)
                                .map(i => i.name);

                            const filteredProducts = products.filter(p =>
                                !otherItemNames.includes(p.name) &&
                                p.name.toLowerCase().includes((item.name || '').toLowerCase())
                            );

                            return (
                            <div key={item.id} className="group relative p-4 border border-gray-200 rounded-lg hover:border-indigo-300 hover:shadow-sm transition-all bg-gray-50/50">
                                <div className="grid grid-cols-12 gap-3 mb-2">
                                    <div className="col-span-12 sm:col-span-6 relative">
                                        <label className="text-[10px] text-gray-400 font-bold uppercase mb-1 block">Item Name</label>
                                        <input 
                                            type="text" 
                                            className="w-full bg-white border border-gray-300 rounded p-2 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                                            placeholder="Item / Service"
                                            value={item.name}
                                            onChange={(e) => handleItemChange(item.id, 'name', e.target.value)}
                                            onFocus={() => setActiveItemIndex(index)}
                                            onClick={() => setActiveItemIndex(index)}
                                        />
                                        
                                        {/* Custom Item Dropdown */}
                                        {activeItemIndex === index && (
                                            <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                                                {filteredProducts.map(p => (
                                                    <div 
                                                        key={p.id} 
                                                        className="px-3 py-2 hover:bg-indigo-50 cursor-pointer text-sm border-b border-gray-50 last:border-0"
                                                        onClick={() => handleProductSelect(index, p)}
                                                    >
                                                        <div className="font-bold text-gray-800">{p.name}</div>
                                                        <div className="text-xs text-gray-500 truncate">{p.description}</div>
                                                        <div className="text-xs font-mono text-indigo-600 mt-0.5">Rate: {p.rate}</div>
                                                    </div>
                                                ))}
                                                {filteredProducts.length === 0 && (
                                                    <div className="px-3 py-2 text-xs text-gray-400 italic">
                                                        {item.name ? 'No matching products available' : 'Start typing to search products'}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <div className="col-span-4 sm:col-span-2">
                                        <label className="text-[10px] text-gray-400 font-bold uppercase mb-1 block text-center">Qty</label>
                                        <input 
                                            type="number" 
                                            min="1"
                                            className="w-full bg-white border border-gray-300 rounded p-2 text-sm text-center focus:ring-2 focus:ring-indigo-500 outline-none"
                                            value={item.quantity}
                                            onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value)}
                                        />
                                    </div>
                                    <div className="col-span-4 sm:col-span-2">
                                        <label className="text-[10px] text-gray-400 font-bold uppercase mb-1 block text-right">Rate</label>
                                        <input 
                                            type="number" 
                                            min="0"
                                            className="w-full bg-white border border-gray-300 rounded p-2 text-sm text-right focus:ring-2 focus:ring-indigo-500 outline-none"
                                            value={item.rate}
                                            onChange={(e) => handleItemChange(item.id, 'rate', e.target.value)}
                                        />
                                    </div>
                                    <div className="col-span-4 sm:col-span-2">
                                        <label className="text-[10px] text-gray-400 font-bold uppercase mb-1 block text-right">Amount</label>
                                        <div className="py-2 text-sm font-bold text-gray-800 text-right">
                                            {item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <input 
                                        type="text" 
                                        className="w-full bg-transparent border-b border-dashed border-gray-300 text-xs text-gray-600 focus:border-indigo-500 outline-none pb-1"
                                        placeholder="Add a description..."
                                        value={item.description}
                                        onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                                    />
                                </div>
                                {invoice.items.length > 1 && (
                                    <button 
                                        onClick={() => handleDeleteItem(item.id)}
                                        className="absolute -right-2 -top-2 bg-white text-red-500 p-1 rounded-full shadow-md border border-gray-100 opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="Remove Item"
                                    >
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        )})}
                    </div>
                    <button 
                        onClick={handleAddItem}
                        className="mt-4 w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 font-medium hover:border-indigo-400 hover:text-indigo-600 transition-colors flex items-center justify-center gap-2 text-sm"
                    >
                        <PlusIcon className="w-4 h-4" /> Add Item
                    </button>
                    
                    {/* Overlay to close item dropdown */}
                    {activeItemIndex !== null && (
                        <div className="fixed inset-0 z-0 cursor-default" onClick={() => setActiveItemIndex(null)}></div>
                    )}
                </div>

                {/* 4. Notes & Terms */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Terms & Notes</label>
                    <textarea 
                        rows={3} 
                        className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                        value={invoice.notes}
                        onChange={(e) => handleChange('notes', e.target.value)}
                    ></textarea>
                </div>
            </div>

            {/* Right Column: Preview & Settings */}
            <div className="space-y-6">
                
                {/* Branding Card */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="text-sm font-bold text-gray-800 mb-4">Branding</h3>
                    
                    <div className="mb-4">
                        <label className="block text-xs text-gray-500 mb-1">Brand Color</label>
                        <div className="flex gap-2">
                            {['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#111827'].map(color => (
                                <button
                                    key={color}
                                    type="button"
                                    onClick={() => handleChange('brandColor', color)}
                                    className={`w-6 h-6 rounded-full border-2 ${invoice.brandColor === color ? 'border-gray-900 scale-110' : 'border-transparent'}`}
                                    style={{ backgroundColor: color }}
                                />
                            ))}
                            <input 
                                type="color" 
                                className="w-6 h-6 p-0 border-0 rounded-full overflow-hidden cursor-pointer"
                                value={invoice.brandColor} 
                                onChange={(e) => handleChange('brandColor', e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="mb-4">
                        <label className="block text-xs text-gray-500 mb-1">Logo</label>
                        <div className="flex items-center gap-3">
                            <label className="cursor-pointer bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 text-xs font-medium text-gray-600 transition-colors">
                                Upload Logo
                                <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                            </label>
                            {invoice.logoUrl && (
                                <button onClick={() => handleChange('logoUrl', '')} className="text-xs text-red-500 hover:underline">Remove</button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Seller Info Card */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="text-sm font-bold text-gray-800 mb-4">Billed From (You)</h3>
                    <div className="space-y-3">
                        <input type="text" placeholder="Business Name" className="w-full text-sm border-b border-gray-200 pb-1 outline-none focus:border-indigo-500 font-medium" value={invoice.businessName} onChange={(e) => handleChange('businessName', e.target.value)} />
                        <input type="text" placeholder="Your Name" className="w-full text-sm border-b border-gray-200 pb-1 outline-none focus:border-indigo-500" value={invoice.sellerName} onChange={(e) => handleChange('sellerName', e.target.value)} />
                        <input type="text" placeholder="Address" className="w-full text-sm border-b border-gray-200 pb-1 outline-none focus:border-indigo-500" value={invoice.sellerAddress} onChange={(e) => handleChange('sellerAddress', e.target.value)} />
                        <input type="text" placeholder="GSTIN" className="w-full text-sm border-b border-gray-200 pb-1 outline-none focus:border-indigo-500 uppercase" value={invoice.sellerGstin} onChange={(e) => handleChange('sellerGstin', e.target.value)} />
                        <div className="flex gap-2">
                            <input type="email" placeholder="Email" className="w-1/2 text-sm border-b border-gray-200 pb-1 outline-none focus:border-indigo-500" value={invoice.sellerEmail} onChange={(e) => handleChange('sellerEmail', e.target.value)} />
                            <input type="tel" placeholder="Phone" className="w-1/2 text-sm border-b border-gray-200 pb-1 outline-none focus:border-indigo-500" value={invoice.sellerPhone} onChange={(e) => handleChange('sellerPhone', e.target.value)} />
                        </div>
                    </div>
                </div>

                {/* Financial Summary */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="text-sm font-bold text-gray-800 mb-4">Summary</h3>
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between text-gray-600">
                            <span>Subtotal</span>
                            <span>{invoice.subtotal.toLocaleString('en-IN', { style: 'currency', currency: invoice.currency })}</span>
                        </div>
                        <div className="flex justify-between items-center text-gray-600">
                            <div className="flex items-center gap-2">
                                <span>Tax Rate</span>
                                <select 
                                    className="bg-gray-50 border border-gray-200 rounded text-xs px-1 py-0.5 outline-none"
                                    value={invoice.taxRate}
                                    onChange={(e) => {
                                        const newRate = Number(e.target.value);
                                        const tax = invoice.subtotal * (newRate / 100);
                                        setInvoice({ ...invoice, taxRate: newRate, taxAmount: tax, total: invoice.subtotal + tax });
                                    }}
                                >
                                    <option value="0">0%</option>
                                    <option value="5">5%</option>
                                    <option value="12">12%</option>
                                    <option value="18">18%</option>
                                    <option value="28">28%</option>
                                </select>
                            </div>
                            <span>{invoice.taxAmount.toLocaleString('en-IN', { style: 'currency', currency: invoice.currency })}</span>
                        </div>
                        <div className="border-t border-dashed border-gray-200 my-2"></div>
                        <div className="flex justify-between font-bold text-lg text-gray-900">
                            <span>Total</span>
                            <span style={{ color: invoice.brandColor }}>
                                {invoice.total.toLocaleString('en-IN', { style: 'currency', currency: invoice.currency })}
                            </span>
                        </div>
                    </div>
                </div>

            </div>
         </div>
      </div>

      {/* --- Add Client Modal --- */}
      {showAddCustomerModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setShowAddCustomerModal(false)}></div>
              <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 animate-fade-in-up">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-lg font-bold text-gray-900">Add New Client</h3>
                      <button onClick={() => setShowAddCustomerModal(false)} className="text-gray-400 hover:text-gray-600">
                          <XMarkIcon className="w-6 h-6" />
                      </button>
                  </div>
                  <div className="space-y-4">
                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Company / Client Name *</label>
                          <input type="text" className="w-full border border-gray-300 rounded-lg p-2 text-sm" value={newCustomer.name} onChange={(e) => setNewCustomer({...newCustomer, name: e.target.value})} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <input type="email" placeholder="Email" className="border border-gray-300 rounded-lg p-2 text-sm" value={newCustomer.email} onChange={(e) => setNewCustomer({...newCustomer, email: e.target.value})} />
                          <input type="tel" placeholder="Phone" className="border border-gray-300 rounded-lg p-2 text-sm" value={newCustomer.phone} onChange={(e) => setNewCustomer({...newCustomer, phone: e.target.value})} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <input type="text" placeholder="Contact Person" className="border border-gray-300 rounded-lg p-2 text-sm" value={newCustomer.contactPerson} onChange={(e) => setNewCustomer({...newCustomer, contactPerson: e.target.value})} />
                          <input type="text" placeholder="GSTIN" className="border border-gray-300 rounded-lg p-2 text-sm uppercase" value={newCustomer.gstin} onChange={(e) => setNewCustomer({...newCustomer, gstin: e.target.value})} />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Billing Address</label>
                          <textarea rows={2} className="w-full border border-gray-300 rounded-lg p-2 text-sm" value={newCustomer.address} onChange={(e) => handleNewCustomerAddressChange(e.target.value)}></textarea>
                      </div>
                      <div>
                          <label className="flex items-center gap-2 cursor-pointer mb-1">
                              <input type="checkbox" className="w-4 h-4 text-indigo-600 rounded border-gray-300" checked={newCustomerSameAsBilling} onChange={handleNewCustomerSameAsBillingChange} />
                              <span className="text-sm text-gray-600">Shipping same as Billing</span>
                          </label>
                          {!newCustomerSameAsBilling && (
                              <textarea rows={2} placeholder="Shipping Address" className="w-full border border-gray-300 rounded-lg p-2 text-sm mt-1" value={newCustomer.shippingAddress} onChange={(e) => setNewCustomer({...newCustomer, shippingAddress: e.target.value})}></textarea>
                          )}
                      </div>
                      <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100">
                          <button onClick={() => setShowAddCustomerModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium">Cancel</button>
                          <button onClick={handleSaveNewCustomer} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">Save Client</button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default CreateInvoice;