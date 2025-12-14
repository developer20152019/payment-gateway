import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { InvoiceData, PaymentStatus } from '../types';
import { InvoiceService } from '../services/invoiceService';
import { PlusIcon, DocumentTextIcon, TrashIcon, EyeIcon } from '@heroicons/react/24/outline';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    setIsLoading(true);
    const data = await InvoiceService.getAllInvoices();
    setInvoices(data);
    setIsLoading(false);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this invoice?")) {
      await InvoiceService.deleteInvoice(id);
      loadInvoices();
    }
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

  const totalRevenue = invoices
    .filter(i => i.status === PaymentStatus.PAID)
    .reduce((sum, i) => sum + i.total, 0);

  const pendingAmount = invoices
    .filter(i => i.status === PaymentStatus.PENDING)
    .reduce((sum, i) => sum + i.total, 0);

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 px-4 md:px-6 py-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="font-bold text-xl text-indigo-600 flex items-center gap-2">
            <DocumentTextIcon className="w-6 h-6" /> PayLink
          </div>
          <button
            onClick={() => navigate('/create')}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 hover:bg-indigo-700 transition-colors"
          >
            <PlusIcon className="w-4 h-4" /> New Invoice
          </button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 mt-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
             <p className="text-sm text-gray-500 font-medium">Total Revenue</p>
             <p className="text-2xl font-bold text-gray-900 mt-1">
               {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(totalRevenue)}
             </p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
             <p className="text-sm text-gray-500 font-medium">Pending Payments</p>
             <p className="text-2xl font-bold text-amber-600 mt-1">
               {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(pendingAmount)}
             </p>
          </div>
        </div>

        {/* Invoice List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
             <h2 className="font-bold text-gray-800">Recent Invoices</h2>
             <span className="text-sm text-gray-500">{invoices.length} invoices found</span>
          </div>

          {isLoading ? (
            <div className="p-12 text-center">
               <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
               <p className="text-gray-500">Loading your invoices...</p>
            </div>
          ) : invoices.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center">
               <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <DocumentTextIcon className="w-8 h-8 text-gray-400" />
               </div>
               <h3 className="text-lg font-medium text-gray-900 mb-2">No invoices yet</h3>
               <p className="text-gray-500 mb-6 max-w-sm">Create your first invoice to start tracking payments and managing your business.</p>
               <button
                  onClick={() => navigate('/create')}
                  className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
                >
                  Create Invoice
                </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600">
                <thead className="bg-gray-50 text-xs uppercase font-medium text-gray-500">
                  <tr>
                    <th className="px-6 py-3">Invoice</th>
                    <th className="px-6 py-3">Client</th>
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3 text-right">Amount</th>
                    <th className="px-6 py-3 text-center">Status</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {invoices.map((invoice) => (
                    <tr 
                      key={invoice.id} 
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/view/${invoice.id}`)}
                    >
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {invoice.invoiceNumber}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{invoice.buyerName}</div>
                        <div className="text-xs text-gray-400">{invoice.buyerEmail}</div>
                      </td>
                      <td className="px-6 py-4">{invoice.date}</td>
                      <td className="px-6 py-4 text-right font-medium text-gray-900">
                        {new Intl.NumberFormat('en-IN', { style: 'currency', currency: invoice.currency }).format(invoice.total)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {getStatusBadge(invoice.status)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button 
                             onClick={(e) => { e.stopPropagation(); navigate(`/view/${invoice.id}`); }}
                             className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                             title="View"
                          >
                            <EyeIcon className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={(e) => handleDelete(e, invoice.id)}
                            className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
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
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;