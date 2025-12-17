import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { InvoiceData, PaymentStatus, DocumentType } from '../types';
import { InvoiceService } from '../services/invoiceService';
import { 
    PlusIcon, DocumentTextIcon, TrashIcon, MagnifyingGlassIcon, 
    LinkIcon, CheckIcon, XMarkIcon, ArrowUpIcon, ArrowDownIcon, 
    BanknotesIcon, PencilIcon, TagIcon, ClipboardDocumentListIcon, 
    UsersIcon, Cog6ToothIcon, MapPinIcon, ArrowRightOnRectangleIcon, 
    CalendarIcon, ClockIcon, ChevronDownIcon, FunnelIcon,
    ArrowTrendingUpIcon, WalletIcon
} from '@heroicons/react/24/outline';

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", 
  "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", 
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", 
  "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", "Chandigarh", 
  "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
];

const formatDateToIST = (dateString: string) => {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    });
  } catch (e) { return dateString; }
};

const getLocalDateString = (dateVal?: string | Date) => {
    const d = dateVal ? new Date(dateVal) : new Date();
    if (isNaN(d.getTime())) return '';
    return d.toISOString().split('T')[0];
};

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<{name: string} | null>(null);
  
  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [statsRangeOption, setStatsRangeOption] = useState('this_month');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) setUser(JSON.parse(savedUser));
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    setIsLoading(true);
    const data = await InvoiceService.getAllInvoices();
    setInvoices(data);
    setIsLoading(false);
  };

  const statsData = useMemo(() => {
    const now = new Date();
    let start = new Date(now.getFullYear(), now.getMonth(), 1); // Default This Month
    let end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    let label = "This Month";

    switch (statsRangeOption) {
        case 'today':
            start = new Date(now.setHours(0,0,0,0));
            label = "Today"; break;
        case 'last_7':
            start = new Date(now.setDate(now.getDate() - 7));
            label = "Last 7 Days"; break;
        case 'last_30':
            start = new Date(now.setDate(now.getDate() - 30));
            label = "Last 30 Days"; break;
        case 'this_month':
        default: break;
    }

    const relevant = invoices.filter(inv => {
        const d = new Date(inv.date);
        return d >= start && d <= end;
    });

    const revenue = relevant.filter(i => i.status === PaymentStatus.PAID).reduce((s, i) => s + i.total, 0);
    const pending = relevant.filter(i => i.status === PaymentStatus.PENDING).reduce((s, i) => s + i.total, 0);
    const count = relevant.length;

    return { revenue, pending, count, label };
  }, [invoices, statsRangeOption]);

  const filteredInvoices = invoices.filter(inv => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = inv.buyerName.toLowerCase().includes(query) || inv.invoiceNumber.toLowerCase().includes(query);
    const matchesStatus = statusFilter === 'ALL' || inv.status === statusFilter;
    const matchesType = typeFilter === 'ALL' || inv.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const handleLogout = () => {
      localStorage.removeItem('isAuthenticated');
      navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Premium Navbar */}
      <nav className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl indigo-gradient shadow-lg shadow-indigo-200">
                <WalletIcon className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-extrabold tracking-tight text-slate-900">PayLink</span>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-4">
              <button onClick={() => navigate('/settings')} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 transition-colors">
                <Cog6ToothIcon className="h-6 w-6" />
              </button>
              <button 
                onClick={() => navigate('/create')} 
                className="hidden sm:flex items-center gap-2 rounded-xl indigo-gradient px-4 py-2.5 text-sm font-bold text-white shadow-xl shadow-indigo-100 hover:scale-[1.02] transition-all active:scale-95"
              >
                <PlusIcon className="h-5 w-5" /> New Invoice
              </button>
              <button onClick={handleLogout} className="rounded-lg p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all">
                <ArrowRightOnRectangleIcon className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
                Welcome back, {user?.name?.split(' ')[0] || 'Admin'}
            </h1>
            <p className="mt-1 text-slate-500 font-medium">Here's what's happening with your business today.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
                <select 
                    value={statsRangeOption}
                    onChange={(e) => setStatsRangeOption(e.target.value)}
                    className="appearance-none rounded-xl border border-slate-200 bg-white px-10 py-2.5 text-sm font-bold text-slate-700 shadow-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none cursor-pointer"
                >
                    <option value="today">Today</option>
                    <option value="last_7">Past Week</option>
                    <option value="this_month">This Month</option>
                    <option value="last_30">Past 30 Days</option>
                </select>
                <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="mb-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div className="group relative overflow-hidden rounded-3xl bg-white p-8 premium-shadow border border-slate-100 transition-all hover:border-indigo-100">
            <div className="flex justify-between">
              <div>
                <p className="text-sm font-bold uppercase tracking-wider text-slate-400">Total Revenue</p>
                <h3 className="mt-2 text-3xl font-black text-slate-900">
                    {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(statsData.revenue)}
                </h3>
              </div>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 transition-colors group-hover:bg-emerald-100">
                <ArrowTrendingUpIcon className="h-8 w-8" />
              </div>
            </div>
            <div className="mt-6 flex items-center gap-2">
                <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">
                    <PlusIcon className="h-3 w-3" /> Growth
                </span>
                <span className="text-xs font-medium text-slate-400">vs previous {statsData.label.toLowerCase()}</span>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-3xl bg-white p-8 premium-shadow border border-slate-100 transition-all hover:border-amber-100">
            <div className="flex justify-between">
              <div>
                <p className="text-sm font-bold uppercase tracking-wider text-slate-400">Outstanding</p>
                <h3 className="mt-2 text-3xl font-black text-slate-900">
                    {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(statsData.pending)}
                </h3>
              </div>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 transition-colors group-hover:bg-amber-100">
                <ClockIcon className="h-8 w-8" />
              </div>
            </div>
            <div className="mt-6 text-xs font-medium text-slate-400">
                Total from {statsData.count} documents
            </div>
          </div>

          <div className="group hidden lg:block relative overflow-hidden rounded-3xl bg-slate-900 p-8 shadow-2xl transition-all hover:scale-[1.01]">
            <div className="relative z-10">
                <h4 className="text-lg font-bold text-white">Create Faster</h4>
                <p className="mt-2 text-slate-400 text-sm">Save your frequent items and customers to generate invoices in seconds.</p>
                <div className="mt-6 flex gap-2">
                    <button onClick={() => navigate('/customers')} className="rounded-xl bg-white/10 px-4 py-2 text-xs font-bold text-white backdrop-blur-md hover:bg-white/20 transition-all">Customers</button>
                    <button onClick={() => navigate('/products')} className="rounded-xl bg-white/10 px-4 py-2 text-xs font-bold text-white backdrop-blur-md hover:bg-white/20 transition-all">Inventory</button>
                </div>
            </div>
            <div className="absolute -bottom-6 -right-6 h-32 w-32 rounded-full bg-indigo-500/20 blur-3xl"></div>
          </div>
        </div>

        {/* Content Section */}
        <div className="rounded-3xl bg-white premium-shadow border border-slate-100 overflow-hidden">
          <div className="border-b border-slate-100 bg-slate-50/50 p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-xl font-extrabold text-slate-900">Recent Transactions</h2>
                <div className="flex flex-wrap gap-2">
                    <div className="relative">
                        <input 
                            type="text" placeholder="Search..."
                            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-4 text-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                            value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    </div>
                    <select 
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 outline-none"
                        value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="ALL">All Status</option>
                        <option value="PAID">Paid</option>
                        <option value="PENDING">Pending</option>
                    </select>
                </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead className="bg-slate-50 text-[11px] font-black uppercase tracking-widest text-slate-400">
                    <tr>
                        <th className="px-6 py-4">Document</th>
                        <th className="px-6 py-4">Customer</th>
                        <th className="px-6 py-4">Date</th>
                        <th className="px-6 py-4 text-right">Amount</th>
                        <th className="px-6 py-4 text-center">Status</th>
                        <th className="px-6 py-4"></th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                    {isLoading ? (
                        <tr><td colSpan={6} className="py-20 text-center text-slate-400 font-medium animate-pulse">Fetching records...</td></tr>
                    ) : filteredInvoices.length === 0 ? (
                        <tr>
                            <td colSpan={6} className="py-20 text-center">
                                <div className="flex flex-col items-center">
                                    <DocumentTextIcon className="h-12 w-12 text-slate-200 mb-3" />
                                    <p className="font-bold text-slate-400 text-lg">No documents found</p>
                                    <button onClick={() => navigate('/create')} className="mt-4 text-sm font-bold text-indigo-600 hover:underline">Create your first invoice</button>
                                </div>
                            </td>
                        </tr>
                    ) : filteredInvoices.map((inv) => (
                        <tr key={inv.id} onClick={() => navigate(`/view/${inv.id}`)} className="group cursor-pointer transition-colors hover:bg-slate-50">
                            <td className="px-6 py-4">
                                <span className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">#{inv.invoiceNumber}</span>
                                <div className="mt-1 text-[10px] font-black uppercase tracking-wider text-slate-400">{inv.type}</div>
                            </td>
                            <td className="px-6 py-4">
                                <div className="font-bold text-slate-800">{inv.buyerName}</div>
                                <div className="text-xs text-slate-400">{inv.buyerEmail}</div>
                            </td>
                            <td className="px-6 py-4 text-slate-500 whitespace-nowrap">{formatDateToIST(inv.date)}</td>
                            <td className="px-6 py-4 text-right font-black text-slate-900">
                                {new Intl.NumberFormat('en-IN', { style: 'currency', currency: inv.currency }).format(inv.total)}
                            </td>
                            <td className="px-6 py-4 text-center">
                                <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-wider border ${
                                    inv.status === PaymentStatus.PAID ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                    inv.status === PaymentStatus.PENDING ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                    'bg-slate-50 text-slate-500 border-slate-100'
                                }`}>
                                    {inv.status}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                                <button className="rounded-lg p-2 text-slate-300 transition-colors group-hover:text-indigo-500 hover:bg-indigo-50">
                                    <PencilIcon className="h-5 w-5" />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;