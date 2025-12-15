import { Customer } from '../types';

const API_BASE = '/api';
const LOCAL_STORAGE_KEY = 'paylink_customers';

const LocalStorageCustomerService = {
  getAll: (): Customer[] => {
    try {
      const data = localStorage.getItem(LOCAL_STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },
  save: (customers: Customer[]) => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(customers));
  },
  saveCustomer: async (customer: Customer): Promise<void> => {
    const customers = LocalStorageCustomerService.getAll();
    const index = customers.findIndex(c => c.id === customer.id);
    if (index >= 0) {
      customers[index] = customer; 
    } else {
      customers.push(customer); 
    }
    LocalStorageCustomerService.save(customers);
  },
  deleteCustomer: async (id: string): Promise<void> => {
    const customers = LocalStorageCustomerService.getAll().filter(c => c.id !== id);
    LocalStorageCustomerService.save(customers);
  }
};

export const CustomerService = {
  getAllCustomers: async (): Promise<Customer[]> => {
    try {
      const response = await fetch(`${API_BASE}/customers?_t=${Date.now()}`);
      if (!response.ok) throw new Error("Failed to load customers");
      return await response.json();
    } catch (e) {
      console.warn("⚠️ Backend unavailable. Loading Customers from LocalStorage.", e);
      return LocalStorageCustomerService.getAll();
    }
  },

  saveCustomer: async (customer: Customer): Promise<void> => {
    try {
      const response = await fetch(`${API_BASE}/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customer)
      });
      if (!response.ok) throw new Error("Backend Error");
    } catch (e) {
      console.warn("⚠️ Backend unavailable. Saving Customer to LocalStorage.", e);
      return LocalStorageCustomerService.saveCustomer(customer);
    }
  },

  deleteCustomer: async (id: string): Promise<void> => {
    try {
      const response = await fetch(`${API_BASE}/customers/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error("Failed to delete customer");
    } catch (e) {
      console.warn("⚠️ Backend unavailable. Deleting Customer from LocalStorage.", e);
      return LocalStorageCustomerService.deleteCustomer(id);
    }
  }
};