
export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  FAILED = 'FAILED',
  OVERDUE = 'OVERDUE'
}

export type InvoiceTemplate = 'modern' | 'classic' | 'minimal';
export type PaymentGateway = 'CCAvenue' | 'Razorpay' | 'CASH' | '';
export type DocumentType = 'INVOICE' | 'QUOTATION';

export interface Product {
  id: string;
  name: string;
  description: string;
  rate: number;
}

export interface Customer {
  id: string;
  name: string;
  contactPerson?: string; 
  email: string;
  phone: string;
  address: string;
  shippingAddress?: string; 
  gstin?: string;
  placeOfSupply?: string; 
  pinCode?: string;
}

export interface SellerProfile {
  sellerName: string;
  businessName: string;
  sellerAddress: string;
  sellerGstin: string;
  sellerEmail: string;
  sellerPhone: string;
  logoUrl: string;
  brandColor: string;
}

export interface LineItem {
  id: string;
  name: string; 
  description: string;
  quantity: number | string; 
  rate: number | string;     
  amount: number;
}

export interface InvoiceData {
  id: string;
  invoiceNumber: string;
  type: DocumentType; 
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
  buyerContactPerson?: string; 
  buyerEmail: string;
  buyerPhone: string;
  buyerAddress: string;
  buyerShippingAddress?: string; 
  placeOfSupply?: string; 
  buyerPinCode?: string; // New

  // Internal Resource Info (Not shown on Invoice)
  resourceSection?: string;
  resourceName?: string;

  // Financials
  items: LineItem[];
  subtotal: number;
  taxRate: number; // Percentage
  taxAmount: number;
  total: number;
  currency: string;

  status: PaymentStatus;
  paymentGateway: PaymentGateway; 
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
  delivery_name?: string;
  delivery_address?: string;
  delivery_tel?: string;
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