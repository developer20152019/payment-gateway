import { InvoiceData, PaymentStatus, PaymentGateway } from '../types';

const API_BASE = '/api'; 
const LOCAL_STORAGE_KEY = 'paylink_invoices';

const mapInvoiceFromBackend = (data: any): InvoiceData => {
  const items = Array.isArray(data.items) ? data.items : (Array.isArray(data.Items) ? data.Items : []);
  const toISO = (dateVal: any) => {
      try { return new Date(dateVal).toISOString(); } catch (e) { return new Date().toISOString(); }
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
    items: items.map((item: any) => ({
        id: item.id || item.ID,
        name: item.name || item.ItemName || '', 
        description: item.description || item.Description || '',
        quantity: Number(item.quantity || item.Quantity || 0),
        rate: Number(item.rate || item.Rate || 0),
        amount: Number(item.amount || item.Amount || 0)
    }))
  };
};

const LocalStorageService = {
  getAll: (): InvoiceData[] => {
    try {
      const data = localStorage.getItem(LOCAL_STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch { return []; }
  },
  save: (invoices: InvoiceData[]) => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(invoices));
  },
  saveInvoice: async (invoice: InvoiceData): Promise<void> => {
    const invoices = LocalStorageService.getAll();
    const index = invoices.findIndex(i => i.id === invoice.id);
    if (index >= 0) invoices[index] = invoice;
    else invoices.unshift(invoice);
    LocalStorageService.save(invoices);
  },
  getInvoiceById: async (id: string): Promise<InvoiceData | undefined> => {
    return LocalStorageService.getAll().find(i => i.id === id);
  },
  deleteInvoice: async (id: string): Promise<void> => {
    LocalStorageService.save(LocalStorageService.getAll().filter(i => i.id !== id));
  }
};

export const InvoiceService = {
  saveInvoice: async (invoice: InvoiceData): Promise<void> => {
    try {
      const response = await fetch(`${API_BASE}/invoices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoice)
      });
      if (!response.ok) throw new Error("Backend Error");
    } catch (e) {
      console.warn("⚠️ Backend unavailable. Using LocalStorage.", e);
      return LocalStorageService.saveInvoice(invoice);
    }
  },

  getInvoiceById: async (id: string): Promise<InvoiceData | undefined> => {
    try {
      const response = await fetch(`${API_BASE}/invoices/${id}?_t=${Date.now()}`);
      if (!response.ok) throw new Error("Fetch failed");
      const data = await response.json();
      return mapInvoiceFromBackend(data);
    } catch (e) {
      return LocalStorageService.getInvoiceById(id);
    }
  },

  getAllInvoices: async (): Promise<InvoiceData[]> => {
    try {
      const response = await fetch(`${API_BASE}/invoices?_t=${Date.now()}`);
      if (!response.ok) throw new Error("Load failed");
      const data = await response.json();
      return Array.isArray(data) ? data.map(mapInvoiceFromBackend) : [];
    } catch (e) {
      return LocalStorageService.getAll();
    }
  },

  deleteInvoice: async (id: string): Promise<void> => {
    try {
      await fetch(`${API_BASE}/invoices/${id}`, { method: 'DELETE' });
    } catch (e) {
      return LocalStorageService.deleteInvoice(id);
    }
  },

  updateStatus: async (id: string, status: PaymentStatus, gateway?: PaymentGateway): Promise<void> => {
    try {
      const response = await fetch(`${API_BASE}/invoices/${id}?_t=${Date.now()}`);
      if (response.ok) {
        const rawData = await response.json();
        const invoice = mapInvoiceFromBackend(rawData);
        invoice.status = status;
        if (gateway) invoice.paymentGateway = gateway;
        
        await fetch(`${API_BASE}/invoices`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(invoice)
        });
        return;
      }
    } catch (e) {
        console.error("Status Update Failed", e);
    }
  },

  sendEmailNotification: async (invoice: InvoiceData, type: 'CREATED' | 'PAID') => {
    try {
        const link = `${window.location.origin}${window.location.pathname}#/view/${invoice.id}`;
        await fetch(`${API_BASE}/notify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                to: invoice.buyerEmail,
                subject: `${invoice.type} ${invoice.invoiceNumber} - ${invoice.businessName}`,
                invoiceNumber: invoice.invoiceNumber,
                buyerName: invoice.buyerName,
                total: invoice.total,
                currency: invoice.currency,
                link: link,
                type: type
            })
        });
    } catch (e) {
        console.warn("Failed to send email", e);
    }
  },

  sendWhatsAppNotification: async (invoice: InvoiceData, type: 'CREATED' | 'PAID') => {
    try {
        const link = `${window.location.origin}${window.location.pathname}#/view/${invoice.id}`;
        await fetch(`${API_BASE}/whatsapp/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                to: invoice.buyerPhone,
                buyerName: invoice.buyerName,
                invoiceNumber: invoice.invoiceNumber,
                amount: invoice.total,
                link: link,
                type: type
            })
        });
    } catch (e) {
        console.warn("Failed to send WhatsApp", e);
    }
  },

  initiatePaymentSequence: async (invoice: InvoiceData): Promise<{ paymentHtml: string }> => {
    const response = await fetch(`${API_BASE}/payment/initiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: invoice.id,
          amount: invoice.total.toString(),
          currency: invoice.currency,
          billing_name: invoice.buyerName,
          email: invoice.buyerEmail,
          billing_tel: invoice.buyerPhone
        })
      });
      if (!response.ok) throw new Error('Gateway unavailable');
      const htmlContent = await response.text();
      return { paymentHtml: htmlContent };
  }
};