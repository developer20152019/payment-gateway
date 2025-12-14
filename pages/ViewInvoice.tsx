import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { InvoiceData, PaymentStatus } from '../types';
import { InvoicePreview } from '../components/InvoicePreview';
import { ShieldCheckIcon, ShareIcon, PrinterIcon, ArrowDownTrayIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { InvoiceService } from '../services/invoiceService';

const ViewInvoice: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'info' | 'error'} | null>(null);

  // Fetch Invoice Data
  const fetchInvoice = useCallback(async () => {
    if (id) {
      try {
         // Add timestamp to avoid caching old status
         const data = await InvoiceService.getInvoiceById(id);
         if (data) {
           setInvoice(data);
         } else {
           alert("Document not found");
           navigate('/');
         }
      } catch(e) {
         console.error(e);
         alert("Error loading document");
      }
    }
  }, [id, navigate]);

  // Initial Load
  useEffect(() => {
    fetchInvoice();
  }, [fetchInvoice]);

  // --- LISTEN FOR POPUP MESSAGES (CCAvenue) ---
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (typeof event.data !== 'string') return;

      console.log("Payment Event Received:", event.data);

      if (event.data === 'PAYMENT_SUCCESS') {
        handlePaymentSuccess();
      } else if (event.data === 'PAYMENT_CANCEL') {
        handlePaymentCancel();
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [invoice]); 

  // --- LOAD RAZORPAY SCRIPT DYNAMICALLY ---
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => { resolve(true); };
      script.onerror = () => { resolve(false); };
      document.body.appendChild(script);
    });
  };

  const showNotification = (msg: string, type: 'success' | 'info' | 'error' = 'info') => {
    setNotification({ message: msg, type });
    setTimeout(() => setNotification(null), 5000);
  };

  // --- RAZORPAY HANDLER ---
  const handleRazorpayPayment = async () => {
    if (!invoice) return;
    setIsLoading(true);

    const res = await loadRazorpayScript();
    if (!res) {
      showNotification("Razorpay SDK failed to load. Check connection.", 'error');
      setIsLoading(false);
      return;
    }

    try {
      // 1. Create Order on Backend
      const order = await InvoiceService.createRazorpayOrder(invoice);

      const options = {
        key: order.key_id,
        amount: order.amount,
        currency: order.currency,
        name: invoice.businessName,
        description: `Invoice #${invoice.invoiceNumber}`,
        image: invoice.logoUrl, // Use invoice logo if available
        order_id: order.id,
        handler: async function (response: any) {
          // 2. Verify Payment on Backend
          showNotification("Verifying payment...", 'info');
          const success = await InvoiceService.verifyRazorpayPayment(response, invoice.id);
          if (success) {
             handlePaymentSuccess();
          } else {
             handlePaymentCancel();
          }
        },
        prefill: {
          name: invoice.buyerName,
          email: invoice.buyerEmail,
          contact: invoice.buyerPhone
        },
        theme: {
          color: invoice.brandColor
        }
      };

      const paymentObject = new (window as any).Razorpay(options);
      paymentObject.open();
      paymentObject.on('payment.failed', function (response: any){
          console.error(response.error);
          handlePaymentCancel();
      });

    } catch (error) {
      console.error("Razorpay Error:", error);
      showNotification("Failed to start payment. Please check backend config.", 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // --- CCAVENUE HANDLER ---
  const handleCCAvenuePayment = async () => {
    if (!invoice) return;
    setIsLoading(true);

    try {
      // 1. Get Payment Form HTML from Backend
      const response = await InvoiceService.initiatePaymentSequence(invoice);
      
      // 2. Open Popup Window
      const width = 500;
      const height = 600;
      const left = (window.innerWidth - width) / 2;
      const top = (window.innerHeight - height) / 2;
      
      const paymentWindow = window.open(
        '', 
        'CCAvenuePayment', 
        `width=${width},height=${height},top=${top},left=${left},scrollbars=yes,resizable=yes`
      );

      if (paymentWindow) {
        // Write the form to the popup and let it auto-submit
        paymentWindow.document.write(response.paymentHtml);
        paymentWindow.document.close();
        paymentWindow.focus();
      } else {
        showNotification("Popup blocked. Please allow popups for payment.", 'error');
      }

    } catch (error) {
      console.error("Payment init failed", error);
      showNotification("Could not initiate payment.", 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePayNow = () => {
      if(!invoice) return;
      
      if(invoice.paymentGateway === 'Razorpay') {
          handleRazorpayPayment();
      } else {
          // Default to CCAvenue
          handleCCAvenuePayment();
      }
  };

  // --- SUCCESS HANDLER ---
  const handlePaymentSuccess = async () => {
    if (!invoice) return;
    
    showNotification("Payment Confirmed! Invoice marked as Paid.", 'success');

    // 1. IMMEDIATE UI UPDATE (Hide Button, Show Badge)
    const updatedInvoice = { ...invoice, status: PaymentStatus.PAID };
    setInvoice(updatedInvoice);

    // 2. Persist to Backend (or LocalStorage if offline)
    // Note: Razorpay backend verify already updates DB, but this ensures LocalStorage sync
    await InvoiceService.updateStatus(invoice.id, PaymentStatus.PAID);

    // 3. Send Email Notification with updated link
    InvoiceService.sendEmailNotification(updatedInvoice, 'PAID');

    // 4. Background Sync
    setTimeout(() => fetchInvoice(), 1000);
  };

  // --- CANCEL HANDLER ---
  const handlePaymentCancel = () => {
    showNotification("Payment failed or was cancelled.", 'error');
    if (invoice) {
        const updatedInvoice = { ...invoice, status: PaymentStatus.FAILED };
        setInvoice(updatedInvoice);
        InvoiceService.updateStatus(invoice.id, PaymentStatus.FAILED);
    }
  };

  const handleDownloadPdf = async () => {
    if(!invoice) return;
    setIsDownloading(true);
    const element = document.getElementById('invoice-content');
    
    if (typeof (window as any).html2pdf === 'undefined') {
      alert("PDF library loading. Please try again.");
      setIsDownloading(false);
      return;
    }

    const opt = {
      margin: 5,
      filename: `${invoice.invoiceNumber}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    try {
      await (window as any).html2pdf().from(element).set(opt).save();
      showNotification("PDF Downloaded", 'success');
    } catch (error) {
      console.error(error);
      showNotification("PDF generation failed", 'error');
    } finally {
      setIsDownloading(false);
    }
  };

  if (!invoice) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
       <div className="text-center text-gray-500 font-medium">Loading Document...</div>
    </div>
  );

  // Helper boolean for UI logic
  const isPaid = invoice.status === PaymentStatus.PAID;
  const isQuotation = invoice.type === 'QUOTATION';

  return (
    <div className="min-h-screen pb-24 md:pb-20 bg-gray-50">
      
      {/* Toast Notification */}
      {notification && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[999] px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-bounce-in ${
          notification.type === 'success' ? 'bg-green-600 text-white' : 
          notification.type === 'error' ? 'bg-red-600 text-white' : 'bg-gray-800 text-white'
        }`}>
           {notification.type === 'success' && <CheckCircleIcon className="w-6 h-6"/>}
           {notification.type === 'error' && <XCircleIcon className="w-6 h-6"/>}
           <span className="font-medium">{notification.message}</span>
        </div>
      )}

      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-30 no-print">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div className="font-bold text-xl text-gray-800 cursor-pointer flex items-center gap-2" onClick={() => navigate('/')}>
             <span className="bg-indigo-600 text-white w-8 h-8 flex items-center justify-center rounded-lg">P</span>
             PayLink
          </div>
          <div className="flex gap-2 items-center">
             <button 
              onClick={handleDownloadPdf} 
              disabled={isDownloading}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              title="Download PDF"
            >
               {isDownloading ? (
                 <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
               ) : (
                 <ArrowDownTrayIcon className="w-6 h-6" />
               )}
            </button>
            <button onClick={() => window.print()} className="p-2 text-gray-600 hover:bg-gray-100 rounded-full hidden md:block" title="Print">
               <PrinterIcon className="w-6 h-6" />
            </button>
            <button onClick={() => navigator.clipboard.writeText(window.location.href)} className="p-2 text-gray-600 hover:bg-gray-100 rounded-full" title="Copy Link">
               <ShareIcon className="w-6 h-6" />
            </button>
          </div>
        </div>
      </nav>

      {/* Content Layout */}
      <div className="max-w-5xl mx-auto pt-8 px-4 flex flex-col md:flex-row gap-8">
          
          {/* Left: Invoice Preview */}
          <div id="invoice-content" className="flex-1 bg-white rounded-lg shadow-sm overflow-hidden">
             <InvoicePreview invoice={invoice} />
          </div>

          {/* Right: Payment Sidebar (Desktop) */}
          {/* ONLY SHOW IF INVOICE (Not Quotation) */}
          {!isQuotation && (
            <div className="hidden md:block w-80 shrink-0 space-y-6 no-print">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 sticky top-24">
                    <h3 className="font-bold text-gray-900 mb-6 text-lg">Payment Status</h3>
                    
                    <div className="flex justify-between items-center mb-6 pb-6 border-b border-gray-100">
                    <span className="text-gray-500 font-medium">Total Amount</span>
                    <span className="text-3xl font-bold text-gray-900 tracking-tight">
                        {new Intl.NumberFormat('en-IN', { style: 'currency', currency: invoice.currency }).format(invoice.total)}
                    </span>
                    </div>

                    {/* --- UI LOGIC: HIDE BUTTON IF PAID --- */}
                    {isPaid ? (
                    <div className="w-full bg-green-50 text-green-700 py-6 rounded-xl border border-green-200 flex flex-col items-center justify-center gap-2 animate-fade-in">
                        <div className="p-3 bg-green-100 rounded-full">
                            <CheckCircleIcon className="w-8 h-8 text-green-600" />
                        </div>
                        <span className="font-bold text-lg">Payment Complete</span>
                        <span className="text-xs text-green-600 opacity-80">Transaction verified</span>
                    </div>
                    ) : (
                    <>
                        <button 
                        onClick={handlePayNow}
                        disabled={isLoading}
                        className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-xl ${
                            invoice.status === PaymentStatus.FAILED 
                            ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-200'
                            : invoice.paymentGateway === 'Razorpay' 
                                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200' 
                                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200'
                        }`}
                        >
                        {isLoading ? (
                            <>
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            <span>Processing...</span>
                            </>
                        ) : (
                            <>
                            <ShieldCheckIcon className="w-5 h-5" />
                            <span>{invoice.status === PaymentStatus.FAILED ? 'Retry Payment' : 'Pay Now'}</span>
                            </>
                        )}
                        </button>

                        {invoice.status === PaymentStatus.FAILED && (
                            <div className="bg-red-50 text-red-600 text-xs p-3 rounded-lg text-center border border-red-100 mt-2">
                            Previous transaction failed. Please try again.
                            </div>
                        )}
                    </>
                    )}

                    <div className="mt-6 flex items-center justify-center gap-2 text-[10px] uppercase tracking-wider text-gray-400 font-semibold">
                    <ShieldCheckIcon className="w-3 h-3" />
                    Secured by {invoice.paymentGateway}
                    </div>
                </div>
            </div>
          )}
      </div>

      {/* Mobile Sticky Footer */}
      {!isQuotation && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-40 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] flex items-center justify-between no-print">
            <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total Due</p>
                <p className="text-xl font-bold text-gray-900 leading-none mt-1">
                {new Intl.NumberFormat('en-IN', { style: 'currency', currency: invoice.currency }).format(invoice.total)}
                </p>
            </div>
            
            {isPaid ? (
                <div className="bg-green-100 text-green-800 px-5 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2 border border-green-200">
                <CheckCircleIcon className="w-5 h-5"/> Paid
                </div>
            ) : (
                <div className="flex gap-2">
                    <button 
                    onClick={handlePayNow}
                    className={`px-6 py-3 rounded-lg font-bold text-sm shadow-md flex items-center gap-2 text-white ${
                        invoice.status === PaymentStatus.FAILED 
                        ? 'bg-red-600' 
                        : invoice.paymentGateway === 'Razorpay' 
                            ? 'bg-blue-600' 
                            : 'bg-indigo-600'
                    }`}
                    >
                    {invoice.status === PaymentStatus.FAILED ? 'Retry' : 'Pay Now'} <ShieldCheckIcon className="w-4 h-4" />
                    </button>
                </div>
            )}
        </div>
      )}
    </div>
  );
};

export default ViewInvoice;