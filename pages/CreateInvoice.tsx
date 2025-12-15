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
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [invoice, setInvoice] = useState<InvoiceData>(getInitialInvoice);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Autocomplete State
  const [showSuggestions, setShowSuggestions] = useState(false);

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

  const handleCustomerSelect = (customer: Customer) => {
      setInvoice(prev => ({
          ...prev,
          buyerName: customer.name,
          buyerEmail: customer.email,
          buyerPhone: customer.phone,
          buyerAddress: customer.address,
          buyerContactPerson: customer.contactPerson || '',
          buyerShippingAddress: customer.shippingAddress || customer.address, // Default to billing if empty
          placeOfSupply: customer.placeOfSupply || '',
          buyerPinCode: customer.pinCode || ''
      }));
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
        
        if (isEditMode) {
            navigate(`/view/${invoiceToSave.id}`);
        } else {
            // Pass state to ViewInvoice to trigger auto-email
            navigate(`/view/${invoiceToSave.id}`, { state: { autoSendEmail: true, emailType: 'CREATED' } });
        }

    } catch (error) {
        alert("Failed to save.");
        console.error(error);
        setIsSaving(false);
    }
  };

  // Filter customers for autocomplete
  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes((invoice.buyerName || '').toLowerCase())
  );

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
      
      {/* Add Customer Modal */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setShowAddCustomerModal(false)}></div>
           <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 animate-fade-in-up max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <UserPlusIcon className="w-5 h-5 text-indigo-600" />
                      Add New Customer
                  </h3>
                  <button type="button" onClick={() => setShowAddCustomerModal(false)} className="text-gray-400 hover:text-gray-600">
                      <XMarkIcon className="w-5 h-5" />
                  </button>
              </div>
              
              <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Company *</label>
                          <input 
                              type="text" 
                              className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                              placeholder="Company Name"
                              value={newCustomer.name}
                              onChange={e => setNewCustomer({...newCustomer, name: e.target.value})}
                          />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
                          <input 
                              type="text" 
                              className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                              placeholder="Name"
                              value={newCustomer.contactPerson || ''}
                              onChange={e => setNewCustomer({...newCustomer, contactPerson: e.target.value})}
                          />
                      </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                          <input 
                              type="email" 
                              className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                              placeholder="email@example.com"
                              value={newCustomer.email}
                              onChange={e => setNewCustomer({...newCustomer, email: e.target.value})}
                          />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                          <input 
                              type="tel" 
                              className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                              placeholder="+91..."
                              value={newCustomer.phone}
                              onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})}
                          />
                      </div>
                  </div>

                  <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Billing Address</label>
                      <textarea 
                          rows={2}
                          className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none"
                          placeholder="Full Address"
                          value={newCustomer.address}
                          onChange={e => handleNewCustomerAddressChange(e.target.value)}
                      />
                  </div>

                  <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="block text-sm font-medium text-gray-700">Shipping Address</label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" className="w-3.5 h-3.5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500" checked={newCustomerSameAsBilling} onChange={handleNewCustomerSameAsBillingChange} />
                                <span className="text-xs text-gray-500">Same as Billing</span>
                            </label>
                        </div>
                        <textarea 
                            rows={2}
                            disabled={newCustomerSameAsBilling}
                            className={`w-full border border-gray-300 rounded-lg p-2 text-sm resize-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none ${newCustomerSameAsBilling ? 'bg-gray-100 text-gray-500' : 'bg-white'}`}
                            placeholder="Shipping Location"
                            value={newCustomerSameAsBilling ? newCustomer.address : (newCustomer.shippingAddress || '')}
                            onChange={e => setNewCustomer({...newCustomer, shippingAddress: e.target.value})}
                        />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Place of Supply</label>
                          <select 
                              className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
                              value={newCustomer.placeOfSupply || ''}
                              onChange={e => setNewCustomer({...newCustomer, placeOfSupply: e.target.value})}
                          >
                              <option value="">Select State</option>
                              {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Pin Code</label>
                          <input 
                              type="text" 
                              className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                              placeholder="000000"
                              maxLength={6}
                              value={newCustomer.pinCode || ''}
                              onChange={e => setNewCustomer({...newCustomer, pinCode: e.target.value})}
                          />
                      </div>
                  </div>

                  <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">GSTIN (Optional)</label>
                      <input 
                          type="text" 
                          className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none uppercase"
                          placeholder="GSTIN..."
                          value={newCustomer.gstin}
                          onChange={e => setNewCustomer({...newCustomer, gstin: e.target.value})}
                      />
                  </div>
                  <button 
                      type="button"
                      onClick={handleSaveNewCustomer}
                      className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors mt-2 flex items-center justify-center gap-2"
                  >
                      <CheckCircleIcon className="w-5 h-5" />
                      Save & Select Customer
                  </button>
              </div>
           </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto">
        <div className="mb-8 text-center relative">
          <button 
             type="button"
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
              <div className="flex justify-between items-center mb-4 border-b pb-2">
                  <h2 className="text-lg font-medium text-gray-900">Bill To (Client)</h2>
                  <button 
                    type="button" 
                    onClick={() => setShowAddCustomerModal(true)}
                    className="bg-indigo-100 hover:bg-indigo-200 text-indigo-700 px-3 py-1 rounded-full text-xs font-medium transition-colors flex items-center gap-1"
                    title="Add New Client"
                  >
                      <PlusIcon className="w-3.5 h-3.5" /> New Client
                  </button>
              </div>
              <div className="space-y-4">
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Client Company Name"
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2 font-bold"
                        value={invoice.buyerName}
                        onChange={(e) => {
                            handleChange('buyerName', e.target.value);
                            setShowSuggestions(true);
                        }}
                        onFocus={() => setShowSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                        autoComplete="off"
                    />
                    {showSuggestions && filteredCustomers.length > 0 && (
                        <ul className="absolute z-50 w-full bg-white border border-gray-200 mt-1 rounded-md shadow-lg max-h-60 overflow-y-auto">
                            {filteredCustomers.map((c) => (
                                <li 
                                    key={c.id} 
                                    className="px-4 py-2 hover:bg-indigo-50 cursor-pointer text-sm text-gray-700"
                                    onMouseDown={(e) => {
                                      e.preventDefault(); 
                                      handleCustomerSelect(c);
                                    }}
                                >
                                    <div className="font-bold">{c.name}</div>
                                    <div className="text-xs text-gray-500">{c.email}</div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
                
                <input
                  type="text"
                  placeholder="Contact Person (Optional)"
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                  value={invoice.buyerContactPerson || ''}
                  onChange={(e) => handleChange('buyerContactPerson', e.target.value)}
                />

                <div className="grid grid-cols-2 gap-4">
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
                </div>

                <div className="space-y-1">
                    <label className="text-xs text-gray-500 font-medium ml-1">Billing Address</label>
                    <textarea
                      placeholder="Billing Address"
                      rows={2}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2 resize-none"
                      value={invoice.buyerAddress}
                      onChange={(e) => handleChange('buyerAddress', e.target.value)}
                    />
                </div>

                <div className="space-y-1">
                    <label className="text-xs text-gray-500 font-medium ml-1">Shipping Address</label>
                    <textarea
                      placeholder="Shipping Address"
                      rows={2}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2 resize-none"
                      value={invoice.buyerShippingAddress || ''}
                      onChange={(e) => handleChange('buyerShippingAddress', e.target.value)}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-xs text-gray-500 font-medium ml-1">Place of Supply</label>
                        <select
                            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2 bg-white"
                            value={invoice.placeOfSupply || ''}
                            onChange={(e) => handleChange('placeOfSupply', e.target.value)}
                        >
                            <option value="">Select State</option>
                            {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs text-gray-500 font-medium ml-1">Pin Code</label>
                        <input
                            type="text"
                            placeholder="Pin Code"
                            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                            value={invoice.buyerPinCode || ''}
                            onChange={(e) => handleChange('buyerPinCode', e.target.value)}
                            maxLength={6}
                        />
                    </div>
                </div>

              </div>
            </div>
          </div>

          {/* Section 4: Items */}
          <div className="bg-white shadow-lg rounded-xl overflow-hidden border border-gray-100">
            {/* ... Item section omitted for brevity, unchanged ... */}
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
                    {/* ... (Mobile & Desktop View Rows) ... */}
                    {/* Simplified for response size limit, logic is same as before */}
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
                    {/* Mobile View Omitted for brevity but included in full impl */}
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
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">Description</label>
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

           {/* Section 5: Notes */}
           <div className="bg-white shadow rounded-lg p-6">
              <div className="flex justify-between items-center mb-4 border-b pb-2">
                  <h2 className="text-lg font-medium text-gray-900">Additional Notes</h2>
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