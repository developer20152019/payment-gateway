import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { InvoiceData, PaymentStatus, DocumentType } from '../types';
import { InvoiceService } from '../services/invoiceService';
import { PlusIcon, DocumentTextIcon, TrashIcon, MagnifyingGlassIcon, LinkIcon, CheckIcon, XMarkIcon, ArrowUpIcon, ArrowDownIcon, BanknotesIcon, PencilIcon, TagIcon, ClipboardDocumentListIcon, UsersIcon, Cog6ToothIcon, MapPinIcon, ArrowRightOnRectangleIcon, CalendarIcon, ClockIcon, ChevronDownIcon, FunnelIcon } from '@heroicons/react/24/outline';
import axios from 'axios';
const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", 
  "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", 
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", 
  "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", "Chandigarh", 
  "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
];
const handleLogout = async () => {
    try {
        // 1. Tell backend to destroy the session
        await axios.post('/api/logout');

        // 2. Force a hard reload to the login page
        // This ensures all React states are cleared and the auth check runs again
        window.location.href = '/login';
    } catch (error) {
        console.error("Logout failed", error);
        // Fallback if server fails
        window.location.href = '/login';
    }
};
// Helper to format date to IST with time
const formatDateToIST = (dateString: string) => {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    
    return date.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch (e) {
    return dateString;
  }
};

// Helper to get local YYYY-MM-DD string
const getLocalDateString = (dateVal?: string | Date) => {
    const d = dateVal ? new Date(dateVal) : new Date();
    if (isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filter States for List
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [placeOfSupplyFilter, setPlaceOfSupplyFilter] = useState<string>('ALL');
  
  // Date Range for List - Defaults to Today
  const [dateRange, setDateRange] = useState({ 
      start: getLocalDateString(), 
      end: getLocalDateString() 
  });
  
  // Stats Range Filter (For cards)
  const [statsRangeOption, setStatsRangeOption] = useState('today');

  // Resource Filters
  const [resourceSectionFilter, setResourceSectionFilter] = useState('');
  const [resourceNameFilter, setResourceNameFilter] = useState('');

  // Sort State
  const [sortConfig, setSortConfig] = useState<{ key: 'date' | 'amount'; direction: 'asc' | 'desc' }>({
    key: 'date',
    direction: 'desc'
  });

  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    setIsLoading(true);
    const data = await InvoiceService.getAllInvoices();
    setInvoices(data);
    setIsLoading(false);
  };

  // Stats Calculation Logic
  const statsData = useMemo(() => {
    const now = new Date();
    // Start of today (00:00:00)
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    // End of today (23:59:59)
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    let start = new Date(todayStart);
    let end = new Date(todayEnd);
    let label = "Today";

    switch (statsRangeOption) {
        case 'yesterday':
            start.setDate(start.getDate() - 1);
            end = new Date(start);
            end.setHours(23, 59, 59, 999);
            label = "Yesterday";
            break;
        case 'last_7':
            start.setDate(start.getDate() - 6); // 7 days inclusive
            label = "Last 7 Days";
            break;
        case 'last_15':
            start.setDate(start.getDate() - 14); // 15 days inclusive
            label = "Last 15 Days";
            break;
        case 'last_30':
            start.setDate(start.getDate() - 29); // 30 days inclusive
            label = "Last 30 Days";
            break;
        case 'this_month':
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            label = "This Month";
            break;
        case 'last_month':
            start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
            label = "Last Month";
            break;
        case 'today':
        default:
            label = "Today";
            break;
    }

    const relevantInvoices = invoices.filter(inv => {
        const d = new Date(inv.date);
        return d >= start && d <= end;
    });

    const revenue = relevantInvoices
        .filter(i => i.status === PaymentStatus.PAID && i.type === 'INVOICE')
        .reduce((sum, i) => sum + i.total, 0);

    const pending = relevantInvoices
        .filter(i => i.status === PaymentStatus.PENDING && i.type === 'INVOICE')
        .reduce((sum, i) => sum + i.total, 0);

    return { revenue, pending, label };
  }, [invoices, statsRangeOption]);

 

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this document?")) {
      await InvoiceService.deleteInvoice(id);
      loadInvoices();
    }
  };

  const handleCopyLink = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const url = `${window.location.origin}/view/${id}`;
    
    const copyToClipboard = (text: string) => {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(() => {
                setCopiedId(id);
                setTimeout(() => setCopiedId(null), 2000);
            }).catch(err => {
                console.error("Clipboard API failed, trying fallback", err);
                fallbackCopy(text);
            });
        } else {
            fallbackCopy(text);
        }
    };

    const fallbackCopy = (text: string) => {
        try {
            const textArea = document.createElement("textarea");
            textArea.value = text;
            textArea.style.position = "fixed";
            textArea.style.left = "-9999px";
            textArea.style.top = "0";
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            const successful = document.execCommand('copy');
            document.body.removeChild(textArea);
            if (successful) {
                setCopiedId(id);
                setTimeout(() => setCopiedId(null), 2000);
            } else {
                window.prompt("Copy this link:", text);
            }
        } catch (err) {
            console.error("Fallback copy failed", err);
            window.prompt("Copy this link:", text);
        }
    };

    copyToClipboard(url);
  };

  const handleEdit = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    navigate(`/edit/${id}`);
  };

  const handleMarkAsPaid = async (e: React.MouseEvent, id: string, invoiceNumber: string) => {
    e.stopPropagation();
    const currentInvoice = invoices.find(inv => inv.id === id);
    if (!currentInvoice || currentInvoice.status === PaymentStatus.PAID) return;

    if (!window.confirm(`Mark invoice ${invoiceNumber} as PAID via CASH? \n\nThis will record the payment method as 'CASH' and cannot be undone.`)) {
        return;
    }

    const previousInvoices = [...invoices];
    setInvoices(prevInvoices => 
        prevInvoices.map(inv => 
            inv.id === id ? { ...inv, status: PaymentStatus.PAID, paymentGateway: 'CASH' } : inv
        )
    );

    try {
        await InvoiceService.updateStatus(id, PaymentStatus.PAID, 'CASH');
        loadInvoices();
    } catch (error) {
        console.error("Failed to update status:", error);
        alert("Failed to update invoice status on the server. Changes reverted.");
        setInvoices(previousInvoices); 
    }
  };

  const handleSort = (key: 'date' | 'amount') => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const getStatusBadge = (status: PaymentStatus) => {
    const styles = {
      [PaymentStatus.PAID]: 'bg-green-100 text-green-700 border border-green-200',
      [PaymentStatus.PENDING]: 'bg-amber-50 text-amber-700 border border-amber-200',
      [PaymentStatus.OVERDUE]: 'bg-red-50 text-red-700 border border-red-200',
      [PaymentStatus.FAILED]: 'bg-gray-100 text-gray-600 border border-gray-200',
    };
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide ${styles[status]}`}>
        {status}
      </span>
    );
  };

  const getTypeBadge = (type: DocumentType) => {
      const isQuote = type === 'QUOTATION';
      return (
          <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider border ${
              isQuote ? 'bg-teal-50 text-teal-700 border-teal-200' : 'bg-indigo-50 text-indigo-700 border-indigo-200'
          }`}>
              {isQuote ? 'Quote' : 'Invoice'}
          </span>
      );
  };

  // Filter Logic for List
  const filteredInvoices = invoices.filter((invoice) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = (
      invoice.invoiceNumber.toLowerCase().includes(query) ||
      (invoice.paidInvoiceNumber || '').toLowerCase().includes(query) ||
      invoice.buyerName.toLowerCase().includes(query) ||
      (invoice.buyerEmail || '').toLowerCase().includes(query) ||
      invoice.total.toString().includes(query) ||
      invoice.status.toLowerCase().includes(query) ||
      invoice.date.includes(query)
    );

    const matchesStatus = statusFilter === 'ALL' || invoice.status === statusFilter;
    const matchesType = typeFilter === 'ALL' || invoice.type === typeFilter;
    const matchesPlaceOfSupply = placeOfSupplyFilter === 'ALL' || (invoice.placeOfSupply && invoice.placeOfSupply === placeOfSupplyFilter);

    const matchesResourceSection = !resourceSectionFilter || (invoice.resourceSection || '').toLowerCase().includes(resourceSectionFilter.toLowerCase());
    const matchesResourceName = !resourceNameFilter || (invoice.resourceName || '').toLowerCase().includes(resourceNameFilter.toLowerCase());

    const invoiceDate = new Date(invoice.date);
    let matchesStart = true;
    if (dateRange.start) {
        const startDate = new Date(dateRange.start);
        startDate.setHours(0, 0, 0, 0); // Start of day
        matchesStart = invoiceDate >= startDate;
    }

    let matchesEnd = true;
    if (dateRange.end) {
        const endDate = new Date(dateRange.end);
        endDate.setHours(23, 59, 59, 999); // End of day
        matchesEnd = invoiceDate <= endDate;
    }

    return matchesSearch && matchesStatus && matchesType && matchesPlaceOfSupply && matchesResourceSection && matchesResourceName && matchesStart && matchesEnd;
  });

  // Sort Logic
  const sortedInvoices = [...filteredInvoices].sort((a, b) => {
    const modifier = sortConfig.direction === 'asc' ? 1 : -1;
    if (sortConfig.key === 'date') {
        return (new Date(a.date).getTime() - new Date(b.date).getTime()) * modifier;
    } else {
        return (a.total - b.total) * modifier;
    }
  });

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('ALL');
    setTypeFilter('ALL');
    setPlaceOfSupplyFilter('ALL');
    setDateRange({ start: '', end: '' }); 
    setResourceSectionFilter('');
    setResourceNameFilter('');
  };

  const hasActiveFilters = searchQuery || statusFilter !== 'ALL' || typeFilter !== 'ALL' || placeOfSupplyFilter !== 'ALL' || dateRange.start || dateRange.end || resourceSectionFilter || resourceNameFilter;

  return (
    <div className="min-h-screen bg-gray-50/50 pb-12 font-sans text-gray-900">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 px-4 md:px-6 py-4 sticky top-0 z-20 shadow-sm bg-opacity-90 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="font-bold text-xl text-indigo-600 flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 text-white rounded-lg flex items-center justify-center">
                <DocumentTextIcon className="w-5 h-5" />
            </div>
            <span className="text-gray-900">Wappie Finance</span>
          </div>
          <div className="flex gap-2 sm:gap-3">
            <button
                onClick={() => navigate('/settings')}
                className="text-gray-500 hover:text-gray-800 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                title="Settings"
            >
                <Cog6ToothIcon className="w-6 h-6" />
            </button>
            <button
                onClick={() => navigate('/customers')}
                className="hidden md:flex bg-white text-gray-700 border border-gray-200 px-4 py-2 rounded-lg font-medium text-sm items-center gap-2 hover:bg-gray-50 transition-colors shadow-sm"
            >
                <UsersIcon className="w-4 h-4" /> Customers
            </button>
            <button
                onClick={() => navigate('/products')}
                className="hidden md:flex bg-white text-gray-700 border border-gray-200 px-4 py-2 rounded-lg font-medium text-sm items-center gap-2 hover:bg-gray-50 transition-colors shadow-sm"
            >
                <TagIcon className="w-4 h-4" /> Products
            </button>
            <button
                onClick={() => navigate('/create')}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-100"
            >
                <PlusIcon className="w-4 h-4" /> <span className="hidden sm:inline">New Invoice</span>
            </button>
            <button
                onClick={handleLogout}
                className="text-gray-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition-colors"
                title="Logout"
            >
                <ArrowRightOnRectangleIcon className="w-6 h-6" />
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        
        {/* Stats Header with Dropdown */}
        <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-700 font-bold text-lg flex items-center gap-2">
                Performance Overview
            </h3>
            <div className="relative group">
                <select 
                    value={statsRangeOption}
                    onChange={(e) => setStatsRangeOption(e.target.value)}
                    className="pl-10 pr-8 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all hover:border-gray-300 cursor-pointer appearance-none"
                >
                    <option value="today">Today</option>
                    <option value="yesterday">Yesterday</option>
                    <option value="last_7">Last 7 Days</option>
                    <option value="last_15">Last 15 Days</option>
                    <option value="last_30">Last 30 Days</option>
                    <option value="this_month">This Month</option>
                    <option value="last_month">Last Month</option>
                </select>
                <CalendarIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none group-hover:text-indigo-500 transition-colors" />
                <ChevronDownIcon className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="relative overflow-hidden bg-white p-6 rounded-2xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-gray-100 group hover:border-indigo-100 transition-all">
             <div className="flex justify-between items-start">
                <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">Total Revenue</p>
                    <p className="text-3xl font-bold text-gray-900 tracking-tight">
                        {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(statsData.revenue)}
                    </p>
                </div>
                <div className="p-3 bg-indigo-50 rounded-2xl group-hover:bg-indigo-100 transition-colors">
                    <BanknotesIcon className="w-6 h-6 text-indigo-600" />
                </div>
             </div>
             <div className="mt-4 flex items-center text-sm text-green-600 font-medium">
                <ArrowUpIcon className="w-4 h-4 mr-1" />
                <span>Paid in {statsData.label}</span>
             </div>
          </div>
          <div className="relative overflow-hidden bg-white p-6 rounded-2xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-gray-100 group hover:border-amber-100 transition-all">
             <div className="flex justify-between items-start">
                <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">Pending Payments</p>
                    <p className="text-3xl font-bold text-gray-900 tracking-tight">
                        {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(statsData.pending)}
                    </p>
                </div>
                <div className="p-3 bg-amber-50 rounded-2xl group-hover:bg-amber-100 transition-colors">
                    <ClockIcon className="w-6 h-6 text-amber-600" />
                </div>
             </div>
             <div className="mt-4 flex items-center text-sm text-amber-600 font-medium">
                <span>Created in {statsData.label}</span>
             </div>
          </div>
        </div>

        {/* Filters & Content */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
          
          <div className="p-5 border-b border-gray-100">
             <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <h2 className="text-lg font-bold text-gray-900">Transactions</h2>
                    <span className="bg-gray-100 text-gray-600 py-0.5 px-2.5 rounded-full text-xs font-bold">{sortedInvoices.length}</span>
                </div>
                
                {hasActiveFilters && (
                    <button 
                        onClick={clearFilters} 
                        className="text-sm font-medium text-red-600 hover:text-red-800 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 self-start sm:self-auto"
                    >
                        <XMarkIcon className="w-4 h-4" /> Reset Filters
                    </button>
                )}
             </div>

             <div className="flex flex-col gap-4">
                 {/* Row 1: Primary Filters */}
                 <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                    {/* Search */}
                    <div className="md:col-span-4 relative group">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Search clients, invoice #..."
                            className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-gray-400"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {/* Status */}
                    <div className="md:col-span-2 relative">
                        <select
                            className="block w-full pl-3 pr-8 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all appearance-none cursor-pointer text-gray-700"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="ALL">All Status</option>
                            <option value={PaymentStatus.PENDING}>Pending</option>
                            <option value={PaymentStatus.PAID}>Paid</option>
                            <option value={PaymentStatus.OVERDUE}>Overdue</option>
                            <option value={PaymentStatus.FAILED}>Failed</option>
                        </select>
                        <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    </div>

                    {/* Date Range */}
                    <div className="md:col-span-4 flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 focus-within:bg-white transition-all">
                        <CalendarIcon className="w-5 h-5 text-gray-400 shrink-0" />
                        <input
                            type="date"
                            className="block w-full bg-transparent border-none p-0 text-sm text-gray-700 focus:ring-0 outline-none cursor-pointer"
                            value={dateRange.start}
                            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                            title="Start Date"
                        />
                        <span className="text-gray-300">|</span>
                        <input
                            type="date"
                            className="block w-full bg-transparent border-none p-0 text-sm text-gray-700 focus:ring-0 outline-none cursor-pointer"
                            value={dateRange.end}
                            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                            title="End Date"
                        />
                    </div>

                    {/* Type */}
                    <div className="md:col-span-2 relative">
                        <select
                            className="block w-full pl-3 pr-8 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all appearance-none cursor-pointer text-gray-700"
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                        >
                            <option value="ALL">All Types</option>
                            <option value="INVOICE">Invoices</option>
                            <option value="QUOTATION">Quotes</option>
                        </select>
                        <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    </div>
                 </div>

                 {/* Row 2: Secondary Filters (Lighter Styling) */}
                 <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="relative">
                        <MapPinIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <select
                            className="block w-full pl-9 pr-8 py-2 border border-gray-200 rounded-lg text-xs bg-white text-gray-600 outline-none focus:border-indigo-500 transition-all appearance-none hover:bg-gray-50 cursor-pointer"
                            value={placeOfSupplyFilter}
                            onChange={(e) => setPlaceOfSupplyFilter(e.target.value)}
                        >
                            <option value="ALL">Filter by State</option>
                            {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div className="relative">
                        <ClipboardDocumentListIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Resource Section"
                            className="block w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-xs bg-white text-gray-600 placeholder-gray-400 outline-none focus:border-indigo-500 transition-all hover:bg-gray-50"
                            value={resourceSectionFilter}
                            onChange={(e) => setResourceSectionFilter(e.target.value)}
                        />
                    </div>
                    <div className="relative">
                        <TagIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Resource Name"
                            className="block w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-xs bg-white text-gray-600 placeholder-gray-400 outline-none focus:border-indigo-500 transition-all hover:bg-gray-50"
                            value={resourceNameFilter}
                            onChange={(e) => setResourceNameFilter(e.target.value)}
                        />
                    </div>
                 </div>
             </div>
          </div>

          <div className="overflow-x-auto overflow-y-auto max-h-[500px]">
                <table className="w-full text-left border-collapse">
                   <thead className="bg-gray-50 text-xs uppercase font-semibold text-gray-500 border-b border-gray-200 sticky top-0 z-10">
                      <tr>
                         <th className="px-6 py-4 bg-gray-50/95 backdrop-blur">Ref #</th>
                         <th className="px-6 py-4 bg-gray-50/95 backdrop-blur">Inv #</th>
                         <th className="px-6 py-4 bg-gray-50/95 backdrop-blur">Client</th>
                         <th className="px-6 py-4 cursor-pointer hover:text-gray-700 bg-gray-50/95 backdrop-blur" onClick={() => handleSort('date')}>
                            <div className="flex items-center gap-1">Date {sortConfig.key === 'date' && (sortConfig.direction === 'asc' ? <ArrowUpIcon className="w-3 h-3"/> : <ArrowDownIcon className="w-3 h-3"/>)}</div>
                         </th>
                         <th className="px-6 py-4 cursor-pointer hover:text-gray-700 text-right bg-gray-50/95 backdrop-blur" onClick={() => handleSort('amount')}>
                            <div className="flex items-center justify-end gap-1">Amount {sortConfig.key === 'amount' && (sortConfig.direction === 'asc' ? <ArrowUpIcon className="w-3 h-3"/> : <ArrowDownIcon className="w-3 h-3"/>)}</div>
                         </th>
                         <th className="px-6 py-4 text-center bg-gray-50/95 backdrop-blur">Status</th>
                         <th className="px-6 py-4 text-right bg-gray-50/95 backdrop-blur">Actions</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-100 text-sm bg-white">
                      {isLoading ? (
                          <tr>
                              <td colSpan={7} className="px-6 py-12 text-center text-gray-500">Loading documents...</td>
                          </tr>
                      ) : sortedInvoices.length === 0 ? (
                          <tr>
                              <td colSpan={7} className="px-6 py-12 text-center text-gray-500 flex flex-col items-center justify-center">
                                  <DocumentTextIcon className="w-12 h-12 text-gray-300 mb-2 opacity-50" />
                                  <p>No documents found matching your filters.</p>
                              </td>
                          </tr>
                      ) : sortedInvoices.map((inv) => (
                          <tr key={inv.id} className="hover:bg-gray-50 transition-colors group cursor-pointer border-b border-gray-100 last:border-0" onClick={() => navigate(`/view/${inv.id}`)}>
                              <td className="px-6 py-4">
                                  <div className="font-bold text-gray-700">{inv.invoiceNumber}</div>
                                  <div className="mt-1 opacity-80">{getTypeBadge(inv.type)}</div>
                              </td>
                              <td className="px-6 py-4 text-gray-600">
                                  {inv.paidInvoiceNumber ? (
                                      <span className="font-mono text-indigo-700 font-bold bg-indigo-50 px-1.5 py-0.5 rounded text-xs">{inv.paidInvoiceNumber}</span>
                                  ) : (
                                      <span className="text-gray-300">-</span>
                                  )}
                              </td>
                              <td className="px-6 py-4">
                                  <div className="font-medium text-gray-900">{inv.buyerName}</div>
                                  {inv.placeOfSupply && <div className="text-xs text-gray-400 mt-0.5">{inv.placeOfSupply}</div>}
                              </td>
                              <td className="px-6 py-4 text-gray-600 whitespace-nowrap">
                                  {formatDateToIST(inv.date)}
                              </td>
                              <td className="px-6 py-4 text-right font-medium text-gray-900 whitespace-nowrap">
                                  {new Intl.NumberFormat('en-IN', { style: 'currency', currency: inv.currency }).format(inv.total)}
                              </td>
                              <td className="px-6 py-4 text-center">
                                  {inv.type === 'INVOICE' && getStatusBadge(inv.status)}
                              </td>
                              <td className="px-6 py-4 text-right">
                                  <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                      <button 
                                          onClick={(e) => handleCopyLink(e, inv.id)}
                                          className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors relative"
                                          title="Copy Link"
                                      >
                                          {copiedId === inv.id ? <CheckIcon className="w-5 h-5 text-green-600" /> : <LinkIcon className="w-5 h-5" />}
                                      </button>
                                      
                                      {inv.status !== PaymentStatus.PAID && (
                                          <button 
                                              onClick={(e) => handleEdit(e, inv.id)}
                                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                              title="Edit"
                                          >
                                              <PencilIcon className="w-5 h-5" />
                                          </button>
                                      )}

                                      {inv.type === 'INVOICE' && inv.status !== PaymentStatus.PAID && (
                                          <button 
                                              onClick={(e) => handleMarkAsPaid(e, inv.id, inv.invoiceNumber)}
                                              className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                              title="Mark as Paid (Cash)"
                                          >
                                              <BanknotesIcon className="w-5 h-5" />
                                          </button>
                                      )}

                                      <button 
                                          onClick={(e) => handleDelete(e, inv.id)}
                                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                          title="Delete"
                                      >
                                          <TrashIcon className="w-5 h-5" />
                                      </button>
                                  </div>
                              </td>
                          </tr>
                      ))}
                   </tbody>
                </table>
             </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;