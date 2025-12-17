import { InvoiceData } from '../types';

export const AIService = {
  generateInvoiceSummary: async (invoice: InvoiceData): Promise<string> => {
    try {
      const response = await fetch('/api/ai/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceData: invoice })
      });

      if (!response.ok) throw new Error('AI request failed');
      const data = await response.json();
      return data.text || '';
    } catch (error) {
      console.error('AI Service Error:', error);
      return 'Thank you for your business. We look forward to working with you again.';
    }
  }
};