import { Product } from '../types';

// Use relative path to leverage Vite proxy (fixes mobile/network access)
const API_BASE = '/api';
const LOCAL_STORAGE_KEY = 'paylink_products';

const LocalStorageProductService = {
  getAll: (): Product[] => {
    try {
      const data = localStorage.getItem(LOCAL_STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },
  save: (products: Product[]) => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(products));
  },
  saveProduct: async (product: Product): Promise<void> => {
    const products = LocalStorageProductService.getAll();
    const index = products.findIndex(p => p.id === product.id);
    if (index >= 0) {
      products[index] = product; // Update existing
    } else {
      products.push(product); // Insert new
    }
    LocalStorageProductService.save(products);
  },
  deleteProduct: async (id: string): Promise<void> => {
    const products = LocalStorageProductService.getAll().filter(p => p.id !== id);
    LocalStorageProductService.save(products);
  }
};

export const ProductService = {
  getAllProducts: async (): Promise<Product[]> => {
    try {
      const response = await fetch(`${API_BASE}/products?_t=${Date.now()}`);
      if (!response.ok) throw new Error("Failed to load products");
      const data = await response.json();
      
      // Normalize keys (MySQL returns TitleCase, Frontend expects camelCase)
      return Array.isArray(data) ? data.map((p: any) => ({
        id: p.id || p.ID,
        name: p.name || p.Name,
        description: p.description || p.Description,
        rate: Number(p.rate || p.Rate || 0)
      })) : [];

    } catch (e) {
      console.warn("⚠️ Backend unavailable. Loading Products from LocalStorage.", e);
      return LocalStorageProductService.getAll();
    }
  },

  saveProduct: async (product: Product): Promise<void> => {
    try {
      const response = await fetch(`${API_BASE}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(product)
      });
      if (!response.ok) throw new Error("Backend Error");
    } catch (e) {
      console.warn("⚠️ Backend unavailable. Saving Product to LocalStorage.", e);
      return LocalStorageProductService.saveProduct(product);
    }
  },

  deleteProduct: async (id: string): Promise<void> => {
    try {
      const response = await fetch(`${API_BASE}/products/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error("Failed to delete product");
    } catch (e) {
      console.warn("⚠️ Backend unavailable. Deleting Product from LocalStorage.", e);
      return LocalStorageProductService.deleteProduct(id);
    }
  }
};