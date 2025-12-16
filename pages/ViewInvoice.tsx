import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { InvoiceData, PaymentStatus } from '../types';
import { InvoicePreview } from '../components/InvoicePreview';
import { ShieldCheckIcon, ShareIcon, PrinterIcon, ArrowDownTrayIcon, CheckCircleIcon, XCircleIcon, EnvelopeIcon, ChatBubbleLeftRightIcon, ClipboardIcon } from '@heroicons/react/24/outline';
import { InvoiceService } from '../services/invoiceService';

interface NotificationState {
  message: string;
  type: 'success' | 'info' | 'error' | 'warning';
}

const ViewInvoice: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [notification, setNotification] = useState<NotificationState | null>(null);
  
  // Post-Generation Share Modal State
  const [showShareModal, setShowShareModal] = useState(false);

  // Helper to show notifications
  const showNotification = (msg: string, type: 'success' | 'info' | 'error' | 'warning' = 'info') => {
    setNotification({ message: msg, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleCopyLink = () => {
      const url = window.location.href;
      
      const fallbackCopy = () => {
          try {
              const textArea = document.createElement("textarea");
              textArea.value = url;
              textArea.style.position = "fixed";
              textArea.style.left = "-9999px";
              document.body.appendChild(textArea);
              textArea.focus();
              textArea.select();
              const successful = document.execCommand('copy');
              document.body.removeChild(textArea);
              if (successful) {
                  showNotification("Link copied to clipboard", 'success');
              } else {
                  window.prompt("Copy this link:", url);
              }
          } catch (e) {
              window.prompt("Copy this link:", url);
          }
      };

      if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(url).then(() => {
              showNotification("Link copied to clipboard", 'success');
          }).catch(() => {
              fallbackCopy();
          });
      } else {
          fallbackCopy();
      }
  };

  // Reusable PDF E-mailing Function
  const generateAndSendPDF = useCallback(async (currentInvoice: InvoiceData, triggerType: 'CREATED' | 'PAID') => {
    if (!currentInvoice.buyerEmail) {
        showNotification("No client email found. Notification skipped.", 'warning');
        return;
    }

    setIsSendingEmail(true);
    showNotification(triggerType === 'PAID' ? "Processing Payment Receipt..." : "Sending Document...", 'info');
    
    // Slight delay to allow DOM to update (e.g. show PAID badge)
    await new Promise(resolve => setTimeout(resolve, 1000));

    const element = document.getElementById('invoice-content');
    if (!element || typeof (window as any).html2pdf === 'undefined') {
        console.error("PDF generation failed: Library missing or element not found");
        showNotification("PDF Library missing. Please refresh.", 'error');
        setIsSendingEmail(false);
        return;
    }

    const opt = {
        margin: 5,
        filename: `${currentInvoice.paidInvoiceNumber || currentInvoice.invoiceNumber}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    try {
        const pdfBase64 = await (window as any).html2pdf().from(element).set(opt).outputPdf('datauristring');
        
        let emailSuccess = false;

        // 1. Attempt Email
        try {
            await InvoiceService.sendPdfByEmail(currentInvoice, pdfBase64);
            emailSuccess = true;
        } catch (emailError: any) {
            console.error("Email Failed:", emailError);
            showNotification("Email failed. Trying WhatsApp fallback...", 'warning');
        }
        
        // 2. Attempt WhatsApp (Runs if Email succeeds OR fails)
        try {
            if (emailSuccess) {
                 showNotification("Email sent. Sending WhatsApp...", 'info');
            }
            
            // Pass triggerType so backend selects the correct template (inv_quote_status vs payment_rcv_inv)
            await InvoiceService.sendWhatsAppNotification(currentInvoice, triggerType);
            
            if (emailSuccess) {
                showNotification("Email and WhatsApp sent successfully!", 'success');
            } else {
                showNotification("Email failed, but WhatsApp sent!", 'success');
            }
        } catch (waError) {
            console.error("WhatsApp Send Failed:", waError);
            if (emailSuccess) {
                showNotification("Email sent, but WhatsApp failed.", 'warning');
            } else {
                showNotification("Failed to send notifications (Email & WhatsApp).", 'error');
            }
        }
        
        // Show share modal after attempts
        setShowShareModal(true);

    } catch (error: any) {
        console.error("PDF Generation Error:", error);
        showNotification("Failed to generate PDF for sending.", 'error');
        setShowShareModal(true);
    } finally {
        setIsSendingEmail(false);
    }
  }, []);

  // Fetch Invoice Data
  const fetchInvoice = useCallback(async () => {
    if (id) {
      try {
         const data = await InvoiceService.getInvoiceById(id);
         if (data) {
           setInvoice(data);
           return data;
         } else {
           alert("Document not found");
           navigate('/');
         }
      } catch(e) {
         console.error(e);
         alert("Error loading document");
      }
    }
    return null;
  }, [id, navigate]);

  // Initial Load & Auto-Trigger
  useEffect(() => {
    let mounted = true;
    
    const loadAndCheckAutoSend = async () => {
        const data = await fetchInvoice();
        
        if (data && mounted) {
            // Check if we navigated here with a request to auto-send email
            // In v6, state is unknown by default, check prop existence
            const state = location.state as any;
            if (state?.autoSendEmail) {
                setTimeout(() => generateAndSendPDF(data, state.emailType || 'CREATED'), 500);
            }
            
            // Check if we should open share modal immediately (e.g. from creation)
            if (state?.openShare) {
               setTimeout(() => setShowShareModal(true), 800);
            }

            // Clear state so it doesn't fire on refresh
            if (state?.autoSendEmail || state?.openShare) {
                window.history.replaceState({}, document.title);
            }
        }
    };

    loadAndCheckAutoSend();

    return () => { mounted = false; };
  }, [fetchInvoice, location.state, generateAndSendPDF]);

  // --- LISTEN FOR POPUP MESSAGES (CCAvenue) ---
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (typeof event.data !== 'string') return;
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
      const order = await InvoiceService.createRazorpayOrder(invoice);
      const options = {
        key: order.key_id,
        amount: order.amount,
        currency: order.currency,
        name: invoice.businessName,
        description: `Invoice #${invoice.invoiceNumber}`,
        image: invoice.logoUrl,
        order_id: order.id,
        handler: async function (response: any) {
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
      const response = await InvoiceService.initiatePaymentSequence(invoice);
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
          handleCCAvenuePayment();
      }
  };

  // --- SUCCESS HANDLER ---
  const handlePaymentSuccess = async () => {
    if (!invoice) return;
    
    showNotification("Payment Confirmed! Generating Receipt...", 'success');

    // Wait a moment for the backend webhook/handler to finish writing to DB
    // The backend generates the PaidInvoiceNumber
    await new Promise(resolve => setTimeout(resolve, 1500));

    try {
        // Fetch the updated invoice from backend to get the generated PaidInvoiceNumber
        // We do NOT call updateStatus() because the payment gateway handler on backend already did it.
        const freshInvoice = await InvoiceService.getInvoiceById(invoice.id);
        
        if (freshInvoice) {
            setInvoice(freshInvoice);
            // Send email with the fresh data (containing the new ID)
            generateAndSendPDF(freshInvoice, 'PAID');
        } else {
            // Fallback (e.g. backend fetch failed, use local update without new number)
            const updatedInvoice = { ...invoice, status: PaymentStatus.PAID };
            setInvoice(updatedInvoice);
            generateAndSendPDF(updatedInvoice, 'PAID');
        }
    } catch (e) {
        console.error("Error fetching updated invoice:", e);
        // Fallback
        const updatedInvoice = { ...invoice, status: PaymentStatus.PAID };
        setInvoice(updatedInvoice);
        generateAndSendPDF(updatedInvoice, 'PAID');
    }
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
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[999] px-6 py-4 rounded-xl shadow-2xl flex flex-col md:flex-row items-center gap-4 animate-bounce-in ${
          notification.type === 'success' ? 'bg-green-600 text-white' : 
          notification.type === 'error' ? 'bg-red-600 text-white' : 
          notification.type === 'warning' ? 'bg-yellow-500 text-white' : 'bg-gray-800 text-white'
        }`}>
           <div className="flex items-center gap-3">
             {notification.type === 'success' && <CheckCircleIcon className="w-6 h-6"/>}
             {notification.type === 'error' && <XCircleIcon className="w-6 h-6"/>}
             {notification.type === 'warning' && <ShieldCheckIcon className="w-6 h-6"/>}
             <span className="font-medium">{notification.message}</span>
           </div>
           
           <button onClick={() => setNotification(null)} className="ml-2 opacity-60 hover:opacity-100">
             <XCircleIcon className="w-5 h-5" />
           </button>
        </div>
      )}

      {/* SHARE MODAL */}
      {showShareModal && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setShowShareModal(false)}></div>
           <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-fade-in-up">
              <div className="p-6 text-center">
                 <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircleIcon className="w-10 h-10 text-green-600" />
                 </div>
                 <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {invoice.type === 'QUOTATION' ? 'Quotation Sent!' : 'Invoice Sent!'}
                 </h3>
                 <p className="text-sm text-gray-600 mb-6">
                    A copy has been emailed to <strong>{invoice.buyerEmail}</strong>.<br/>
                    WhatsApp notification was also attempted.
                 </p>
                 
                 <div className="space-y-3">
                    <button 
                        onClick={handleCopyLink}
                        className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl flex items-center justify-center gap-2 transition-colors"
                    >
                        <ClipboardIcon className="w-5 h-5" />
                        Copy Link
                    </button>
                 </div>
              </div>
              <div className="bg-gray-50 px-6 py-3 border-t border-gray-100 flex justify-center">
                 <button onClick={() => setShowShareModal(false)} className="text-sm text-gray-500 hover:text-gray-700">
                    Close
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Sending Overlay */}
      {isSendingEmail && (
          <div className="fixed inset-0 z-[1000] bg-black/20 backdrop-blur-[1px] flex items-end sm:items-top justify-center pt-20">
              <div className="bg-white rounded-full px-6 py-3 shadow-2xl flex items-center gap-3 animate-pulse">
                  <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                  <span className="font-medium text-indigo-900 text-sm">Processing Notifications...</span>
              </div>
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
            <button onClick={handleCopyLink} className="p-2 text-gray-600 hover:bg-gray-100 rounded-full" title="Copy Link">
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