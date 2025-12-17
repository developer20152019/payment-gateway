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
      
      // If object is empty (MySQL returns no rows)
      if (!data || Object.keys(data).length === 0) return null;

      // Normalize keys from MySQL (TitleCase) to Frontend (camelCase)
      return {
        sellerName: data.SellerName !== undefined ? data.SellerName : (data.sellerName || ''),
        businessName: data.BusinessName !== undefined ? data.BusinessName : (data.businessName || ''),
        sellerAddress: data.SellerAddress !== undefined ? data.SellerAddress : (data.sellerAddress || ''),
        sellerGstin: data.SellerGstin !== undefined ? data.SellerGstin : (data.sellerGstin || ''),
        sellerEmail: data.SellerEmail !== undefined ? data.SellerEmail : (data.sellerEmail || ''),
        sellerPhone: data.SellerPhone !== undefined ? data.SellerPhone : (data.sellerPhone || ''),
        logoUrl: data.LogoUrl !== undefined ? data.LogoUrl : (data.logoUrl || ''),
        brandColor: data.BrandColor !== undefined ? data.BrandColor : (data.brandColor || '#4f46e5')
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
      // Sync local storage on success
      LocalStorageSettingsService.saveSellerProfile(profile);
    } catch (e) {
      console.warn("⚠️ Backend unavailable. Saving Settings to LocalStorage only.", e);
      LocalStorageSettingsService.saveSellerProfile(profile);
    }
  }
};