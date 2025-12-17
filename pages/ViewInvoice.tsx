import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { InvoiceData, PaymentStatus } from '../types';
import { InvoicePreview } from '../components/InvoicePreview';
import { ShieldCheckIcon, ShareIcon, PrinterIcon, ArrowDownTrayIcon, CheckCircleIcon, XCircleIcon, SparklesIcon, ClipboardIcon } from '@heroicons/react/24/outline';
import { InvoiceService } from '../services/invoiceService';
import { AIService } from '../services/aiService';

const ViewInvoice: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [notification, setNotification] = useState<{message: string, type: string} | null>(null);

  const fetchInvoice = useCallback(async () => {
    if (id) {
      const data = await InvoiceService.getInvoiceById(id);
      if (data) setInvoice(data);
      else navigate('/');
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchInvoice();
  }, [fetchInvoice]);

  const handleGenerateAISummary = async () => {
    if (!invoice) return;
    setIsGeneratingAI(true);
    const summary = await AIService.generateInvoiceSummary(invoice);
    setAiSummary(summary);
    setIsGeneratingAI(false);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setNotification({ message: 'Link copied!', type: 'success' });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleDownloadPdf = async () => {
    if(!invoice) return;
    setIsDownloading(true);
    const element = document.getElementById('invoice-content');
    const opt = {
      margin: 5,
      filename: `${invoice.paidInvoiceNumber || invoice.invoiceNumber}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    await (window as any).html2pdf().from(element).set(opt).save();
    setIsDownloading(false);
  };

  if (!invoice) return <div className="p-8 text-center text-gray-500">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {notification && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[100] bg-gray-900 text-white px-6 py-3 rounded-full shadow-2xl animate-bounce-in">
          {notification.message}
        </div>
      )}

      <nav className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-30 no-print">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div className="font-bold text-xl text-indigo-600 flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
             <div className="w-8 h-8 bg-indigo-600 text-white rounded flex items-center justify-center">W</div>
             Wappie Finance
          </div>
          <div className="flex gap-2">
            <button onClick={handleGenerateAISummary} disabled={isGeneratingAI} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-full transition-all group relative">
               <SparklesIcon className={`w-6 h-6 ${isGeneratingAI ? 'animate-spin' : ''}`} />
               <span className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">AI Summary</span>
            </button>
            <button onClick={handleDownloadPdf} className="p-2 text-gray-600 hover:bg-gray-100 rounded-full">
               <ArrowDownTrayIcon className="w-6 h-6" />
            </button>
            <button onClick={handleCopyLink} className="p-2 text-gray-600 hover:bg-gray-100 rounded-full">
               <ShareIcon className="w-6 h-6" />
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto pt-8 px-4 flex flex-col md:flex-row gap-8">
          <div className="flex-1 space-y-6">
             {aiSummary && (
               <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-[1px] rounded-2xl shadow-lg animate-fade-in">
                  <div className="bg-white p-6 rounded-[15px]">
                     <div className="flex items-center gap-2 mb-2 text-indigo-600 font-bold text-sm">
                        <SparklesIcon className="w-4 h-4" /> AI Personalized Note
                     </div>
                     <p className="text-gray-700 italic">"{aiSummary}"</p>
                  </div>
               </div>
             )}
             <div id="invoice-content" className="bg-white rounded-xl shadow-sm overflow-hidden">
                <InvoicePreview invoice={invoice} />
             </div>
          </div>

          <div className="w-full md:w-80 shrink-0 no-print">
             <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm sticky top-24">
                <h3 className="font-bold text-gray-900 mb-4">Document Details</h3>
                <div className="space-y-4 text-sm">
                   <div className="flex justify-between">
                      <span className="text-gray-500">Status</span>
                      <span className={`font-bold ${invoice.status === PaymentStatus.PAID ? 'text-green-600' : 'text-amber-600'}`}>{invoice.status}</span>
                   </div>
                   <div className="flex justify-between">
                      <span className="text-gray-500">Type</span>
                      <span className="font-medium text-gray-900">{invoice.type}</span>
                   </div>
                   <div className="pt-4 border-t border-gray-100">
                      <p className="text-xs text-gray-400 mb-1 uppercase font-bold tracking-wider">Payable Amount</p>
                      <p className="text-3xl font-black text-gray-900">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: invoice.currency }).format(invoice.total)}</p>
                   </div>
                   {invoice.status !== PaymentStatus.PAID && (
                      <button onClick={() => alert('Payment sequence started')} className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-2">
                         <ShieldCheckIcon className="w-6 h-6" /> Pay Securely
                      </button>
                   )}
                </div>
             </div>
          </div>
      </div>
    </div>
  );
};

export default ViewInvoice;