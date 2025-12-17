import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { InvoiceData, PaymentStatus, DocumentType } from '../types';
import { InvoiceService } from '../services/invoiceService';
import { PlusIcon, DocumentTextIcon, TrashIcon, MagnifyingGlassIcon, LinkIcon, CheckIcon, XMarkIcon, ArrowUpIcon, ArrowDownIcon, BanknotesIcon, PencilIcon, TagIcon, ClipboardDocumentListIcon, UsersIcon, Cog6ToothIcon, MapPinIcon, ArrowRightOnRectangleIcon, CalendarIcon } from '@heroicons/react/24/outline';

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", 
  "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", 
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", 
  "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", "Chandigarh", 
  "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
];

// Helper to format date to IST with time
const formatDateToIST = (dateString: string) => {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    // Check if date is valid
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

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [placeOfSupplyFilter, setPlaceOfSupplyFilter] = useState<string>('ALL');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  
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

  const handleLogout = () => {
      localStorage.removeItem('isAuthenticated');
      navigate('/login');
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this document?")) {
      await InvoiceService.deleteInvoice(id);
      loadInvoices();
    }
  };

  const handleCopyLink = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const url = `${window.location.origin}${window.location.pathname}#/view/${id}`;
    
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
        // Reload to get the generated ID
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
      [PaymentStatus.PAID]: 'bg-green-100 text-green-800',
      [PaymentStatus.PENDING]: 'bg-amber-100 text-amber-800',
      [PaymentStatus.OVERDUE]: 'bg-red-100 text-red-800',
      [PaymentStatus.FAILED]: 'bg-gray-100 text-gray-800',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-bold ${styles[status]}`}>
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

  const totalRevenue = invoices
    .filter(i => i.status === PaymentStatus.PAID && i.type === 'INVOICE')
    .reduce((sum, i) => sum + i.total, 0);

  const pendingAmount = invoices
    .filter(i => i.status === PaymentStatus.PENDING && i.type === 'INVOICE')
    .reduce((sum, i) => sum + i.total, 0);

  // Filter Logic
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

    // Resource Filter
    const matchesResourceSection = !resourceSectionFilter || (invoice.resourceSection || '').toLowerCase().includes(resourceSectionFilter.toLowerCase());
    const matchesResourceName = !resourceNameFilter || (invoice.resourceName || '').toLowerCase().includes(resourceNameFilter.toLowerCase());

    const invoiceDate = new Date(invoice.date);
    let matchesStart = true;
    if (dateRange.start) {
        const startDate = new Date(dateRange.start);
        matchesStart = invoiceDate >= startDate;
    }

    let matchesEnd = true;
    if (dateRange.end) {
        const endDate = new Date(dateRange.end);
        // Set end date to end of day
        endDate.setHours(23, 59, 59, 999);
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
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 px-4 md:px-6 py-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="font-bold text-xl text-indigo-600 flex items-center gap-2">
            <DocumentTextIcon className="w-6 h-6" /> PayLink
          </div>
          <div className="flex gap-2 sm:gap-3">
            <button
                onClick={() => navigate('/settings')}
                className="text-gray-500 hover:text-gray-800 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                title="Settings"
            >
                <Cog6ToothIcon className="w-6 h-6" />
            </button>
            <button
                onClick={() => navigate('/customers')}
                className="bg-white text-gray-700 border border-gray-300 px-3 py-2 rounded-lg font-medium text-sm flex items-center gap-2 hover:bg-gray-50 transition-colors"
            >
                <UsersIcon className="w-4 h-4" /> <span className="hidden sm:inline">Customers</span>
            </button>
            <button
                onClick={() => navigate('/products')}
                className="bg-white text-gray-700 border border-gray-300 px-3 py-2 rounded-lg font-medium text-sm flex items-center gap-2 hover:bg-gray-50 transition-colors"
            >
                <TagIcon className="w-4 h-4" /> <span className="hidden sm:inline">Products</span>
            </button>
            <button
                onClick={() => navigate('/create')}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 hover:bg-indigo-700 transition-colors"
            >
                <PlusIcon className="w-4 h-4" /> <span className="hidden sm:inline">New Document</span>
            </button>
            <button
                onClick={handleLogout}
                className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors"
                title="Logout"
            >
                <ArrowRightOnRectangleIcon className="w-6 h-6" />
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 mt-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
             <p className="text-sm text-gray-500 font-medium">Total Revenue (Invoices)</p>
             <p className="text-2xl font-bold text-gray-900 mt-1">
               {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(totalRevenue)}
             </p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
             <p className="text-sm text-gray-500 font-medium">Pending Payments (Invoices)</p>
             <p className="text-2xl font-bold text-amber-600 mt-1">
               {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(pendingAmount)}
             </p>
          </div>
        </div>

        {/* Invoice List Container */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          
          {/* --- NEW FILTER SECTION --- */}
          <div className="border-b border-gray-200 bg-white p-5">
             <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                    <h2 className="font-bold text-gray-900 text-lg">Documents</h2>
                    <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs font-semibold">{sortedInvoices.length}</span>
                </div>
                {hasActiveFilters && (
                    <button onClick={clearFilters} className="text-sm text-red-600 hover:text-red-800 font-medium flex items-center gap-1">
                        <XMarkIcon className="w-4 h-4" /> Clear Filters
                    </button>
                )}
             </div>

             <div className="flex flex-col gap-4">
                 {/* Row 1: Search & Date Range */}
                 <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    {/* Search */}
                    <div className="md:col-span-6 lg:col-span-5 relative">
                        <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1 tracking-wide">Search</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                placeholder="Client, email, invoice #..."
                                className="block w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Date Range */}
                    <div className="md:col-span-6 lg:col-span-4">
                        <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1 tracking-wide">Date Range</label>
                        <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                                <input
                                    type="date"
                                    className="block w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all text-gray-600"
                                    value={dateRange.start}
                                    onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                                />
                            </div>
                            <span className="text-gray-400 text-sm font-medium">to</span>
                            <div className="relative flex-1">
                                <input
                                    type="date"
                                    className="block w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all text-gray-600"
                                    value={dateRange.end}
                                    onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>
                 </div>

                 {/* Row 2: Secondary Filters */}
                 <div className="grid grid-cols-2 md:grid-cols-5 gap-4 pt-2">
                    <div className="col-span-1">
                        <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1 tracking-wide">Status</label>
                        <select
                            className="block w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none cursor-pointer"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="ALL">All Status</option>
                            <option value={PaymentStatus.PENDING}>Pending</option>
                            <option value={PaymentStatus.PAID}>Paid</option>
                            <option value={PaymentStatus.OVERDUE}>Overdue</option>
                            <option value={PaymentStatus.FAILED}>Failed</option>
                        </select>
                    </div>

                    <div className="col-span-1">
                        <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1 tracking-wide">Type</label>
                        <select
                            className="block w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none cursor-pointer"
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                        >
                            <option value="ALL">All Types</option>
                            <option value="INVOICE">Invoice</option>
                            <option value="QUOTATION">Quote</option>
                        </select>
                    </div>

                    <div className="col-span-2 md:col-span-1">
                        <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1 tracking-wide">State</label>
                        <select
                            className="block w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none cursor-pointer truncate"
                            value={placeOfSupplyFilter}
                            onChange={(e) => setPlaceOfSupplyFilter(e.target.value)}
                        >
                            <option value="ALL">All States</option>
                            {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>

                    <div className="col-span-1">
                        <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1 tracking-wide">Res. Section</label>
                        <input
                            type="text"
                            placeholder="All"
                            className="block w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none"
                            value={resourceSectionFilter}
                            onChange={(e) => setResourceSectionFilter(e.target.value)}
                        />
                    </div>

                    <div className="col-span-1">
                        <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1 tracking-wide">Res. Name</label>
                        <input
                            type="text"
                            placeholder="All"
                            className="block w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none"
                            value={resourceNameFilter}
                            onChange={(e) => setResourceNameFilter(e.target.value)}
                        />
                    </div>
                 </div>
             </div>
          </div>

          <div className="overflow-x-auto overflow-y-auto max-h-[500px]">
                <table className="w-full text-left border-collapse">
                   <thead className="bg-gray-50 text-xs uppercase font-medium text-gray-500 border-b border-gray-200 sticky top-0 z-10">
                      <tr>
                         <th className="px-6 py-4 bg-gray-50">Reference</th>
                         <th className="px-6 py-4 bg-gray-50">Invoice #</th>
                         <th className="px-6 py-4 bg-gray-50">Client</th>
                         <th className="px-6 py-4 cursor-pointer hover:text-gray-700 bg-gray-50" onClick={() => handleSort('date')}>
                            <div className="flex items-center gap-1">Date {sortConfig.key === 'date' && (sortConfig.direction === 'asc' ? <ArrowUpIcon className="w-3 h-3"/> : <ArrowDownIcon className="w-3 h-3"/>)}</div>
                         </th>
                         <th className="px-6 py-4 cursor-pointer hover:text-gray-700 text-right bg-gray-50" onClick={() => handleSort('amount')}>
                            <div className="flex items-center justify-end gap-1">Amount {sortConfig.key === 'amount' && (sortConfig.direction === 'asc' ? <ArrowUpIcon className="w-3 h-3"/> : <ArrowDownIcon className="w-3 h-3"/>)}</div>
                         </th>
                         <th className="px-6 py-4 text-center bg-gray-50">Status</th>
                         <th className="px-6 py-4 text-right bg-gray-50">Actions</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-100 text-sm">
                      {isLoading ? (
                          <tr>
                              <td colSpan={7} className="px-6 py-8 text-center text-gray-500">Loading...</td>
                          </tr>
                      ) : sortedInvoices.length === 0 ? (
                          <tr>
                              <td colSpan={7} className="px-6 py-12 text-center text-gray-500 flex flex-col items-center justify-center">
                                  <DocumentTextIcon className="w-12 h-12 text-gray-300 mb-2" />
                                  <p>No documents found matching your filters.</p>
                              </td>
                          </tr>
                      ) : sortedInvoices.map((inv) => (
                          <tr key={inv.id} className="hover:bg-gray-50 transition-colors group cursor-pointer border-b border-gray-100 last:border-0" onClick={() => navigate(`/view/${inv.id}`)}>
                              <td className="px-6 py-4">
                                  <div className="font-bold text-gray-700">{inv.invoiceNumber}</div>
                                  <div className="mt-1">{getTypeBadge(inv.type)}</div>
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
                                          className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors relative"
                                          title="Copy Link"
                                      >
                                          {copiedId === inv.id ? <CheckIcon className="w-5 h-5 text-green-600" /> : <LinkIcon className="w-5 h-5" />}
                                      </button>
                                      
                                      {inv.status !== PaymentStatus.PAID && (
                                          <button 
                                              onClick={(e) => handleEdit(e, inv.id)}
                                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                              title="Edit"
                                          >
                                              <PencilIcon className="w-5 h-5" />
                                          </button>
                                      )}

                                      {inv.type === 'INVOICE' && inv.status !== PaymentStatus.PAID && (
                                          <button 
                                              onClick={(e) => handleMarkAsPaid(e, inv.id, inv.invoiceNumber)}
                                              className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                                              title="Mark as Paid (Cash)"
                                          >
                                              <BanknotesIcon className="w-5 h-5" />
                                          </button>
                                      )}

                                      <button 
                                          onClick={(e) => handleDelete(e, inv.id)}
                                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
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