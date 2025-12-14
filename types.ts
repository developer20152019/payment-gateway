export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  FAILED = 'FAILED',
  OVERDUE = 'OVERDUE'
}

export type InvoiceTemplate = 'modern' | 'classic' | 'minimal';
export type PaymentGateway = 'CCAvenue' | 'Razorpay';

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

export interface InvoiceData {
  id: string;
  invoiceNumber: string;
  date: string;
  dueDate: string;
  
  // Branding
  template: InvoiceTemplate;
  brandColor: string;
  logoUrl?: string;

  // Seller Info
  sellerName: string;
  businessName: string;
  sellerAddress: string;
  sellerGstin?: string;
  sellerEmail: string;
  sellerPhone: string;

  // Buyer Info
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  buyerAddress: string;

  // Financials
  items: LineItem[];
  subtotal: number;
  taxRate: number; // Percentage
  taxAmount: number;
  total: number;
  currency: string;

  status: PaymentStatus;
  paymentGateway: PaymentGateway; // New Field
  notes?: string;
}

// CCAvenue Kit Parameters
export interface CCAvenueRequest {
  merchant_id: string;
  order_id: string;
  currency: string;
  amount: string;
  redirect_url: string;
  cancel_url: string;
  language: string;
  billing_name: string;
  billing_address: string;
  billing_city?: string;
  billing_state?: string;
  billing_zip?: string;
  billing_country?: string;
  billing_tel: string;
  billing_email: string;
  merchant_param1?: string;
}

// For the backend interaction
export interface PaymentRequestPayload {
  order_id: string;
  currency: string;
  amount: string;
  customer_id?: string;
  email: string;
  billing_name: string;
  billing_address: string;
  billing_tel: string;
  merchant_param1?: string; 
}