// src/types/index.ts

export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  FAILED = 'FAILED',
  OVERDUE = 'OVERDUE'
}

export type InvoiceTemplate = 'modern' | 'classic' | 'minimal';
export type PaymentGateway = 'CCAvenue' | 'Razorpay' | 'CASH' | '';
export type DocumentType = 'INVOICE' | 'QUOTATION';

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
  paidInvoiceNumber?: string;
  type: DocumentType;
  date: string;
  dueDate: string;

  template: InvoiceTemplate;
  brandColor: string;
  logoUrl?: string;

  sellerName: string;
  businessName: string;
  sellerAddress: string;
  sellerGstin?: string;
  sellerEmail: string;
  sellerPhone: string;

  buyerName: string;
  buyerContactPerson?: string;
  buyerEmail: string;
  buyerPhone: string;
  buyerAddress: string;
  buyerShippingAddress?: string;
  placeOfSupply?: string;
  buyerPinCode?: string;

  resourceSection?: string;
  resourceName?: string;

  items: LineItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  currency: string;

  status: PaymentStatus;
  paymentGateway: PaymentGateway;
  notes?: string;
}
