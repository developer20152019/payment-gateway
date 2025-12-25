import { InvoiceData, PaymentStatus, PaymentGateway } from '@types';


// Use relative path to allow Vite proxy to handle the request destination.
// This fixes "Failed to fetch" when accessing via network IP (e.g. mobile testing) 
// or when CORS preflight fails on localhost mismatch.
const API_BASE = '/api'; 
const LOCAL_STORAGE_KEY = 'u840660637_invoice_db';

// --- Helper to normalize DB response (TitleCase) to Frontend (camelCase) ---
const mapInvoiceFromBackend = (data: any): InvoiceData => {
  const items = Array.isArray(data.items) ? data.items : (Array.isArray(data.Items) ? data.Items : []);
  
  // Helper to ensure we get a valid ISO string or fallback to now
  const toISO = (dateVal: any) => {
      try {
          return new Date(dateVal).toISOString();
      } catch (e) {
          return new Date().toISOString();
      }
  };

  return {
    id: data.id || data.ID,
    invoiceNumber: data.invoiceNumber || data.InvoiceNumber,
    paidInvoiceNumber: data.paidInvoiceNumber || data.PaidInvoiceNumber,
    type: data.type || data.Type || 'INVOICE',
    date: toISO(data.date || data.Date),
    dueDate: toISO(data.dueDate || data.DueDate),
    template: data.template || data.Template || 'modern',
    brandColor: data.brandColor || data.BrandColor || '#4f46e5',
    logoUrl: data.logoUrl || data.LogoUrl,
    sellerName: data.sellerName || data.SellerName,
    businessName: data.businessName || data.BusinessName,
    sellerAddress: data.sellerAddress || data.SellerAddress,
    sellerGstin: data.sellerGstin || data.SellerGstin,
    sellerEmail: data.sellerEmail || data.SellerEmail,
    sellerPhone: data.sellerPhone || data.SellerPhone,
    buyerName: data.buyerName || data.BuyerName,
    buyerContactPerson: data.buyerContactPerson || data.BuyerContactPerson,
    buyerEmail: data.buyerEmail || data.BuyerEmail,
    buyerPhone: data.buyerPhone || data.BuyerPhone,
    buyerAddress: data.buyerAddress || data.BuyerAddress,
    buyerShippingAddress: data.buyerShippingAddress || data.BuyerShippingAddress,
    placeOfSupply: data.placeOfSupply || data.PlaceOfSupply,
    buyerPinCode: data.buyerPinCode || data.BuyerPinCode,
    resourceSection: data.resourceSection || data.ResourceSection,
    resourceName: data.resourceName || data.ResourceName,
    subtotal: Number(data.subtotal || data.Subtotal || 0),
    taxRate: Number(data.taxRate || data.TaxRate || 0),
    taxAmount: Number(data.taxAmount || data.TaxAmount || 0),
    total: Number(data.total || data.Total || 0),
    currency: data.currency || data.Currency || 'INR',
    status: data.status || data.Status || 'PENDING',
    paymentGateway: data.paymentGateway || data.PaymentGateway,
    notes: data.notes || data.Notes,
    // Map Items if they exist
    items: items.map((item: any) => ({
        id: item.id || item.ID,
        name: item.name || item.ItemName || '', // DB column is ItemName
        description: item.description || item.Description || '',
        quantity: Number(item.quantity || item.Quantity || 0),
        rate: Number(item.rate || item.Rate || 0),
        amount: Number(item.amount || item.Amount || 0)
    }))
  };
};

// --- LocalStorage Fallback Implementation ---
const LocalStorageService = {
  getAll: (): InvoiceData[] => {
    try {
      const data = localStorage.getItem(LOCAL_STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },
  save: (invoices: InvoiceData[]) => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(invoices));
  },
  saveInvoice: async (invoice: InvoiceData): Promise<void> => {
    const invoices = LocalStorageService.getAll();
    const index = invoices.findIndex(i => i.id === invoice.id);
    if (index >= 0) {
      invoices[index] = invoice;
    } else {
      invoices.unshift(invoice); // Add to top
    }
    LocalStorageService.save(invoices);
  },
  getInvoiceById: async (id: string): Promise<InvoiceData | undefined> => {
    const invoices = LocalStorageService.getAll();
    return invoices.find(i => i.id === id);
  },
  getAllInvoices: async (): Promise<InvoiceData[]> => {
    return LocalStorageService.getAll();
  },
  deleteInvoice: async (id: string): Promise<void> => {
    const invoices = LocalStorageService.getAll().filter(i => i.id !== id);
    LocalStorageService.save(invoices);
  }
};

// Helper: Format Date DD/MM/YYYY
const formatDateDDMMYYYY = (isoDate: string) => {
    try {
        const d = new Date(isoDate);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
    } catch {
        return '';
    }
};

// Helper: Generate Email Body based on Type
const generateEmailContent = (invoice: InvoiceData, link: string, type: 'CREATED' | 'PAID') => {
    const isQuote = invoice.type === 'QUOTATION';
    const docType = isQuote ? 'Estimate' : 'Invoice';
    const docTypeCaps = docType.toUpperCase();
    // Use PaidInvoiceNumber for the final invoice ref if paid, otherwise the current number
    const finalNumber = invoice.paidInvoiceNumber || invoice.invoiceNumber;
    const refNumber = invoice.invoiceNumber; 
    
    if (type === 'PAID') {
        // --- PAYMENT RECEIPT TEMPLATE (Plain Text style) ---
        const subject = `Invoice ${finalNumber} for ${docType} ${refNumber}`;
        const body = `
            <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
                 <p>Dear <strong>${invoice.buyerName}</strong>,</p>
                <p>Greetings from ${invoice.businessName}.</p>
                <p>Please find attached the Invoice <strong>${finalNumber}</strong> issued against ${docType} ${refNumber} for your reference.</p>
                <p>We kindly request you to review the invoice and acknowledge receipt.</p>
                <br/>
                <p>Thank you for your continued association with us.</p>
                <p><strong>Happy Messaging</strong></p>
                <p>Warm regards,<br/>
                ${invoice.businessName}<br/>
                📧 support@wappie.in<br/>
                🌐 www.wappie.in
                </p>
            </div>
        `;
        return { subject, body };
    } else {
        // --- CREATION TEMPLATE (Card Layout) ---
        const subject = `${docType} #${refNumber} from ${invoice.businessName}`;
        const amountFormatted = new Intl.NumberFormat('en-IN', { style: 'currency', currency: invoice.currency }).format(invoice.total);
        const dateFormatted = formatDateDDMMYYYY(invoice.date);

        const body = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; color: #333;">
                <p>Dear <strong>${invoice.buyerName}</strong>,</p>
                <p>Thank you for contacting us. Your ${docType.toLowerCase()} can be paid, viewed, printed and downloaded as PDF from the link below.</p>
                
                <!-- CARD TEMPLATE -->
                <div style="border: 1px solid #e5e7eb; background-color: #fffffbf0; padding: 30px; margin: 20px 0; text-align: center; border-radius: 8px;">
                    <div style="font-size: 12px; font-weight: bold; color: #6b7280; text-transform: uppercase; margin-bottom: 5px; letter-spacing: 1px;">${docTypeCaps} AMOUNT</div>
                    <div style="font-size: 28px; font-weight: bold; color: #dc2626; margin-bottom: 20px;">
                        ${amountFormatted}
                    </div>
                    
                    <div style="border-top: 1px solid #e5e7eb; margin: 20px 0;"></div>
                    
                    <table align="center" style="margin: 0 auto; text-align: left; font-size: 14px; border-spacing: 0;">
                        <tr>
                            <td style="color: #6b7280; padding: 5px 15px; font-weight: bold;">${docType} No</td>
                            <td style="font-weight: bold; color: #111827;">${invoice.invoiceNumber}</td>
                        </tr>
                        <tr>
                            <td style="color: #6b7280; padding: 5px 15px; font-weight: bold;">${docType} Date</td>
                            <td style="font-weight: bold; color: #111827;">${dateFormatted}</td>
                        </tr>
                    </table>
                    
                    <div style="margin-top: 30px;">
                        <a href="${link}" style="background-color: #22c55e; color: white; padding: 14px 30px; text-decoration: none; font-weight: bold; border-radius: 4px; font-size: 14px; display: inline-block; text-transform: uppercase;">VIEW ${docTypeCaps}</a>
                    </div>
                </div>
                <!-- END CARD TEMPLATE -->

                <p style="font-size: 13px; color: #888; border-top: 1px solid #eee; padding-top: 20px;">
                    Regards,<br/>
                    ${invoice.businessName}<br/>
                    <p>📧 support@wappie.in</p>
                    <p>🌐 www.wappie.in</p>
                </p>
            </div>
        `;
        return { subject, body };
    }
};

// --- Hybrid Service (API First -> Fallback to LS) ---
export const InvoiceService = {
  
  saveInvoice: async (invoice: InvoiceData): Promise<void> => {
    try {
      const response = await fetch(`${API_BASE}/invoices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoice)
      });
      // If server returns 503 (DB down) or other error, throw to trigger catch
      if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Backend Error: ${response.status} ${errText}`);
      }
    } catch (e) {
      console.warn("⚠️ Backend unavailable. Saving to LocalStorage instead.", e);
      return LocalStorageService.saveInvoice(invoice);
    }
  },

  getInvoiceById: async (id: string): Promise<InvoiceData | undefined> => {
    try {
      // Added timestamp to prevent browser caching of old status
      const response = await fetch(`${API_BASE}/invoices/${id}?_t=${Date.now()}`);
      if (response.status === 404) return undefined;
      if (!response.ok) throw new Error("Failed to fetch invoice");
      const data = await response.json();
      return mapInvoiceFromBackend(data);
    } catch (e) {
      console.warn("⚠️ Backend unavailable. Fetching from LocalStorage.", e);
      return LocalStorageService.getInvoiceById(id);
    }
  },

  getAllInvoices: async (): Promise<InvoiceData[]> => {
    try {
      const response = await fetch(`${API_BASE}/invoices?_t=${Date.now()}`);
      if (!response.ok) throw new Error("Failed to load invoices");
      const data = await response.json();
      return Array.isArray(data) ? data.map(mapInvoiceFromBackend) : [];
    } catch (e) {
      console.warn("⚠️ Backend unavailable. Loading from LocalStorage.", e);
      return LocalStorageService.getAllInvoices();
    }
  },

  deleteInvoice: async (id: string): Promise<void> => {
    try {
      const response = await fetch(`${API_BASE}/invoices/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error("Failed to delete invoice");
    } catch (e) {
      console.warn("⚠️ Backend unavailable. Deleting from LocalStorage.", e);
      return LocalStorageService.deleteInvoice(id);
    }
  },

  updateStatus: async (id: string, status: PaymentStatus, gateway?: PaymentGateway): Promise<void> => {
    try {
      // 1. Try to fetch current state from backend (Force fresh fetch with timestamp)
      const response = await fetch(`${API_BASE}/invoices/${id}?_t=${Date.now()}`);
      if (response.ok) {
        const rawData = await response.json();
        const invoice = mapInvoiceFromBackend(rawData);
        
        invoice.status = status;
        if (gateway) {
            invoice.paymentGateway = gateway;
        }
        
        // 2. Update backend
        const saveResponse = await fetch(`${API_BASE}/invoices`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(invoice)
        });

        if (!saveResponse.ok) {
            const errText = await saveResponse.text();
            throw new Error(`Backend save failed: ${saveResponse.status} ${errText}`);
        }
        return;
      }
      throw new Error("Backend fetch failed");
    } catch (e) {
      // 3. Fallback: Update LocalStorage
      console.warn("⚠️ Backend unavailable. Updating status locally.", e);
      const invoices = LocalStorageService.getAll();
      const index = invoices.findIndex(i => i.id === id);
      if (index >= 0) {
        invoices[index].status = status;
        if (gateway) {
            invoices[index].paymentGateway = gateway;
        }
        LocalStorageService.save(invoices);
      }
    }
    },
    // services/invoiceService.ts
    savePaidInvoicePdf: async (
        invoiceId: string,
        pdfBase64: string
    ) => {
        console.log('📤 Sending PDF to backend for invoice:', invoiceId);
        console.log('📋 Base64 length:', pdfBase64.length);

        const res = await fetch(
            `/api/invoices/${invoiceId}/save-pdf`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pdfBase64 })
            }
        );

        if (!res.ok) {
            const text = await res.text();
            console.error('❌ Backend error:', text);
            throw new Error('Failed to save PDF');
        }

        return res.json();
    },



  // --- Notification ---
  sendEmailNotification: async (invoice: InvoiceData, type: 'CREATED' | 'PAID') => {
    try {
        const link = `${window.location.origin}${window.location.pathname}#/view/${invoice.id}`;
        const { subject, body } = generateEmailContent(invoice, link, type);

        await fetch(`${API_BASE}/notify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                to: invoice.buyerEmail,
                subject: subject,
                body: body, 
                link: link,
                type: type
            })
        });
        console.log("Email request sent to backend");
    } catch (e) {
        console.warn("Failed to send email notification", e);
    }
  },

  sendPdfByEmail: async (invoice: InvoiceData, pdfBase64: string, type: 'CREATED' | 'PAID' = 'CREATED'): Promise<void> => {
    const link = `${window.location.origin}${window.location.pathname}#/view/${invoice.id}`;
    // Strip data URI prefix if present (e.g. "data:application/pdf;base64,")
    const base64Content = pdfBase64.includes(',') ? pdfBase64.split(',')[1] : pdfBase64;
      if (type === 'PAID') {
          try {
              await InvoiceService.savePaidInvoicePdf(invoice.paidInvoiceNumber, base64Content);
              console.log('✅ Paid invoice PDF saved successfully');
          } catch (err) {
              console.error('❌ Failed to save PDF:', err);
          }
      }
    const { subject, body } = generateEmailContent(invoice, link, type);

    const response = await fetch(`${API_BASE}/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            to: invoice.buyerEmail,
            subject: subject,
            body: body, // Using the custom HTML template based on Type
            link: link,
            type: 'MANUAL_PDF',
            attachments: [
                {
                    filename: `${invoice.paidInvoiceNumber || invoice.invoiceNumber}.pdf`,
                    content: base64Content,
                    encoding: 'base64'
                }
            ]
        })
    });

    if (!response.ok) {
        throw new Error('Failed to send email');
    }
  },

  sendWhatsAppNotification: async (invoice: InvoiceData, triggerType: 'CREATED' | 'PAID' = 'CREATED'): Promise<void> => {
    const link = `${window.location.origin}${window.location.pathname}#/view/${invoice.id}`;
    const docType = invoice.type === 'QUOTATION' ? 'Estimate' : 'Invoice';
    const number = invoice.paidInvoiceNumber || invoice.invoiceNumber;
    const amount = new Intl.NumberFormat('en-IN', { style: 'currency', currency: invoice.currency }).format(invoice.total);

    const response = await fetch(`${API_BASE}/whatsapp/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            to: invoice.buyerPhone,
            type: docType,
            invoiceNumber: number,
            link: link,
            amount: amount,
            businessName: invoice.businessName,
            buyerName: invoice.buyerName,
            triggerType: triggerType
        })
    });

    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to send WhatsApp message via API');
    }
  },

  // --- CCAvenue Initiation ---
  initiatePaymentSequence: async (invoice: InvoiceData): Promise<{ paymentHtml: string }> => {
    const API_URL = `${API_BASE}/payment/initiate`;

    try {
      // Attempt Real Backend Initiation
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: invoice.id,
          amount: invoice.total.toString(),
          currency: invoice.currency,
          billing_name: invoice.buyerName,
          billing_address: invoice.buyerAddress,
          email: invoice.buyerEmail,
          billing_tel: invoice.buyerPhone
        })
      });

      if (!response.ok) {
        throw new Error('Backend refused connection');
      }

      const htmlContent = await response.text();
      return { paymentHtml: htmlContent };

    } catch (e: any) {
      console.warn("⚠️ Payment Backend Unreachable. Using Simulation Mode.", e.message);
      
      const formattedAmount = new Intl.NumberFormat('en-IN', { style: 'currency', currency: invoice.currency }).format(invoice.total);
      
      // FALLBACK MOCK GATEWAY UI
      const mockGatewayContent = `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <title>Secure Payment</title>
            <style>
              body { font-family: 'Segoe UI', sans-serif; padding: 0; margin: 0; background: #f3f4f6; display: flex; align-items: center; justify-content: center; height: 100vh; }
              .card { background: white; padding: 40px 30px; border-radius: 16px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04); width: 90%; max-width: 400px; text-align: center; }
              .logo { font-size: 24px; font-weight: 800; color: #4f46e5; margin-bottom: 30px; display: block; }
              .amount-label { color: #6b7280; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; }
              .amount { font-size: 42px; font-weight: 800; color: #111827; margin: 5px 0 25px 0; }
              .btn { background: #4f46e5; color: white; padding: 16px; border: none; border-radius: 12px; cursor: pointer; font-size: 16px; width: 100%; font-weight: 600; transition: all 0.2s; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2); }
              .btn:hover { background: #4338ca; transform: translateY(-1px); box-shadow: 0 10px 15px -3px rgba(79, 70, 229, 0.3); }
              .btn:active { transform: translateY(0); }
              .btn-cancel { background: transparent; color: #9ca3af; margin-top: 15px; font-size: 14px; padding: 10px; }
              .btn-cancel:hover { color: #ef4444; }
              .badge { background: #fee2e2; color: #991b1b; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; margin-bottom: 20px; display: inline-block; }
            </style>
          </head>
          <body>
             <div class="card">
                 <span class="logo">PayLink Secure</span>
                 <div class="badge">SIMULATION MODE</div>
                 <br/>
                 <span class="amount-label">Total Payable</span>
                 <div class="amount">${formattedAmount}</div>
                 
                 <p style="font-size: 14px; color: #4b5563; line-height: 1.5; margin-bottom: 30px;">
                    The backend server is unreachable.<br/>
                    This is a mock transaction for demonstration.
                 </p>
                 
                 <button class="btn" onclick="pay()">Simulate Successful Payment</button>
                 <br/>
                 <button class="btn btn-cancel" onclick="cancel()">Cancel Transaction</button>
             </div>
             <script>
                function pay() {
                   if(window.opener) {
                       window.opener.postMessage('PAYMENT_SUCCESS', '*');
                       window.close();
                   } else if(window.parent) {
                       window.parent.postMessage('PAYMENT_SUCCESS', '*');
                   }
                }
                function cancel() {
                   if(window.opener) {
                       window.opener.postMessage('PAYMENT_CANCEL', '*');
                       window.close();
                   } else if(window.parent) {
                       window.parent.postMessage('PAYMENT_CANCEL', '*');
                   }
                }
             </script>
          </body>
        </html>
      `;
      
      return { paymentHtml: mockGatewayContent };
    }
  },

  // --- Razorpay Initiation ---
  createRazorpayOrder: async (invoice: InvoiceData): Promise<{ id: string, amount: number, currency: string, key_id: string }> => {
    try {
      const response = await fetch(`${API_BASE}/payment/razorpay/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: invoice.total,
          currency: invoice.currency,
          receipt: invoice.id
        })
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || "Failed to create Razorpay Order");
      }
      return await response.json();
    } catch (e) {
      console.error("Razorpay Init Failed:", e);
      throw e;
    }
  },

  verifyRazorpayPayment: async (response: any, invoiceId: string): Promise<boolean> => {
    try {
        const verifyResp = await fetch(`${API_BASE}/payment/razorpay/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...response, invoice_id: invoiceId })
        });
        
        if (!verifyResp.ok) return false;
        const data = await verifyResp.json();
        return data.status === 'success';
    } catch (e) {
        console.error(e);
        return false;
    }
  }
};