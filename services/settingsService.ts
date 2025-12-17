import { SellerProfile } from '../types';

const API_BASE = '/api/settings';
const LOCAL_STORAGE_KEY = 'paylink_seller_profile';

const LocalStorageSettingsService = {
  getSellerProfile: (): SellerProfile | null => {
    try {
      const data = localStorage.getItem(LOCAL_STORAGE_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },
  saveSellerProfile: (profile: SellerProfile) => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(profile));
  }
};

export const SettingsService = {
  getSellerProfile: async (): Promise<SellerProfile | null> => {
    try {
      const response = await fetch(`${API_BASE}/seller?_t=${Date.now()}`);
      if (!response.ok) throw new Error("Failed to load settings");
      const data = await response.json();
      
      // Check if object is empty (no record found)
      if (Object.keys(data).length === 0) return null;

      // Normalize keys
      return {
        sellerName: data.sellerName || data.SellerName,
        businessName: data.businessName || data.BusinessName,
        sellerAddress: data.sellerAddress || data.SellerAddress,
        sellerGstin: data.sellerGstin || data.SellerGstin,
        sellerEmail: data.sellerEmail || data.SellerEmail,
        sellerPhone: data.sellerPhone || data.SellerPhone,
        logoUrl: data.logoUrl || data.LogoUrl,
        brandColor: data.brandColor || data.BrandColor || '#4f46e5'
      };

    } catch (e) {
      console.warn("⚠️ Backend unavailable. Loading Settings from LocalStorage.", e);
      return LocalStorageSettingsService.getSellerProfile();
    }
  },

  saveSellerProfile: async (profile: SellerProfile): Promise<void> => {
    try {
      const response = await fetch(`${API_BASE}/seller`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile)
      });
      if (!response.ok) throw new Error("Backend Error");
    } catch (e) {
      console.warn("⚠️ Backend unavailable. Saving Settings to LocalStorage.", e);
      LocalStorageSettingsService.saveSellerProfile(profile);
    }
  }
};