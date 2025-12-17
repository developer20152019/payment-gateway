import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { InvoiceData, PaymentStatus } from '../types';
import { InvoicePreview } from '../components/InvoicePreview';
import { CCAvenueModal } from '../components/CCAvenueModal';
import { PaymentSimulationModal } from '../components/PaymentSimulationModal';
import { 
  ShieldCheckIcon, 
  ShareIcon, 
  ArrowDownTrayIcon, 
  ChatBubbleLeftRightIcon, 
  EnvelopeIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { InvoiceService } from '../services/invoiceService';

const ViewInvoice: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [isNotifying, setIsNotifying] = useState(false);
  
  // Payment States
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentHtml, setPaymentHtml] = useState('');
  const [isPaymentLoading, setIsPaymentLoading] = useState(false);
  const [isSimulationOpen, setIsSimulationOpen] = useState(false);

  const fetchInvoice = useCallback(async () => {
    if (id) {
      const data = await InvoiceService.getInvoiceById(id);
      if (data) {
        setInvoice(data);
      } else {
        navigate('/');
      }
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchInvoice();
  }, [fetchInvoice]);

  // Trigger notifications automatically if arriving from "Create"
  useEffect(() => {
    if (invoice && location.state?.autoSendEmail && !isNotifying) {
        handleSendNotifications('CREATED');
        // Clear the state so it doesn't resend on page refresh
        window.history.replaceState({}, document.title);
    }
  }, [invoice, location.state]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleSendNotifications = async (trigger: 'CREATED' | 'PAID') => {
    if (!invoice) return;
    setIsNotifying(true);
    try {
        await Promise.all([
            InvoiceService.sendEmailNotification(invoice, trigger),
            InvoiceService.sendWhatsAppNotification(invoice, trigger)
        ]);
        showToast(`Notifications (${trigger}) sent to client!`);
    } catch (e) {
        console.error("Notification Error:", e);
        showToast("Failed to send some notifications", "error");
    } finally {
        setIsNotifying(false);
    }
  };

  const handlePaymentSuccess = async () => {
    if (!invoice) return;
    setIsPaymentModalOpen(false);
    setIsSimulationOpen(false);
    
    try {
        // 1. Update Database
        await InvoiceService.updateStatus(invoice.id, PaymentStatus.PAID, 'CCAvenue');
        
        // 2. Refresh Local Data
        await fetchInvoice();
        
        // 3. Send PAID Notifications
        await handleSendNotifications('PAID');
        
        showToast("Payment successful! Invoice updated and client notified.");
    } catch (error) {
        showToast("Payment recorded but notification failed.", "error");
    }
  };

  const handleInitiatePayment = async () => {
    if (!invoice) return;
    setIsPaymentLoading(true);
    setIsPaymentModalOpen(true);

    try {
      const { paymentHtml } = await InvoiceService.initiatePaymentSequence(invoice);
      setPaymentHtml(paymentHtml);
    } catch (error) {
      console.error("Payment Initiation Failed:", error);
      setIsSimulationOpen(true);
    } finally {
      setIsPaymentLoading(false);
    }
  };

  // Listen for iframe messages from CCAvenue/Mock Gateway
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data === 'PAYMENT_SUCCESS') {
        handlePaymentSuccess();
      } else if (event.data === 'PAYMENT_CANCEL') {
        setIsPaymentModalOpen(false);
        setIsSimulationOpen(false);
        showToast("Payment cancelled by user", "error");
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [invoice]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    showToast("Shareable link copied!");
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
    try {
        await (window as any).html2pdf().from(element).set(opt).save();
    } catch (e) {
        showToast("PDF generation failed", "error");
    } finally {
        setIsDownloading(false);
    }
  };

  if (!invoice) return <div className="p-8 text-center text-gray-500">Loading document...</div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {notification && (
        <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-full shadow-2xl animate-bounce-in text-white ${notification.type === 'error' ? 'bg-red-600' : 'bg-gray-900'}`}>
          <div className="flex items-center gap-2 font-medium">
            {notification.type === 'success' && <CheckCircleIcon className="w-5 h-5 text-green-400" />}
            {notification.message}
          </div>
        </div>
      )}

      <nav className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-30 no-print">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div className="font-bold text-xl text-indigo-600 flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
             <div className="w-8 h-8 bg-indigo-600 text-white rounded flex items-center justify-center">W</div>
             Wappie Finance
          </div>
          <div className="flex gap-2">
            <button onClick={handleDownloadPdf} disabled={isDownloading} className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-all" title="Download PDF">
               <ArrowDownTrayIcon className={`w-6 h-6 ${isDownloading ? 'animate-pulse text-indigo-500' : ''}`} />
            </button>
            <button onClick={handleCopyLink} className="p-2 text-gray-600 hover:bg-gray-100 rounded-full" title="Copy Share Link">
               <ShareIcon className="w-6 h-6" />
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto pt-8 px-4 flex flex-col md:flex-row gap-8">
          <div className="flex-1 space-y-6">
             <div id="invoice-content" className="bg-white rounded-xl shadow-sm overflow-hidden">
                <InvoicePreview invoice={invoice} />
             </div>
          </div>

          <div className="w-full md:w-80 shrink-0 no-print">
             <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm sticky top-24 space-y-6">
                <div>
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
                    
                    {invoice.status !== PaymentStatus.PAID && invoice.type === 'INVOICE' && (
                        <button 
                            onClick={handleInitiatePayment} 
                            className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-2"
                        >
                            <ShieldCheckIcon className="w-6 h-6" /> Pay Securely
                        </button>
                    )}
                    </div>
                </div>

                <div className="pt-6 border-t border-gray-100">
                    <h4 className="text-xs font-bold text-gray-400 uppercase mb-4 tracking-widest">Client Engagement</h4>
                    <div className="grid grid-cols-1 gap-3">
                        <button 
                            onClick={() => handleSendNotifications('CREATED')} 
                            disabled={isNotifying}
                            className="flex items-center gap-3 w-full p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700 disabled:opacity-50"
                        >
                            <EnvelopeIcon className="w-5 h-5 text-indigo-500" />
                            Send Reminders
                        </button>
                        <button 
                            onClick={() => window.open(`https://wa.me/${invoice.buyerPhone?.replace(/\D/g, '')}?text=Hello ${invoice.buyerName}, your ${invoice.type.toLowerCase()} ${invoice.invoiceNumber} is ready for review: ${window.location.href}`, '_blank')}
                            className="flex items-center gap-3 w-full p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
                        >
                            <ChatBubbleLeftRightIcon className="w-5 h-5 text-green-500" />
                            Message via WhatsApp
                        </button>
                    </div>
                </div>
             </div>
          </div>
      </div>

      <CCAvenueModal 
        isOpen={isPaymentModalOpen} 
        onClose={() => setIsPaymentModalOpen(false)} 
        paymentHtml={paymentHtml} 
        isLoading={isPaymentLoading} 
      />

      <PaymentSimulationModal 
        isOpen={isSimulationOpen}
        onClose={() => setIsSimulationOpen(false)}
        onSuccess={handlePaymentSuccess}
        onFailure={() => { setIsSimulationOpen(false); showToast("Payment failed simulation", "error"); }}
        amount={invoice.total}
        currency={invoice.currency}
        gatewayName="CCAvenue"
      />
    </div>
  );
};

export default ViewInvoice;