import React, { useEffect, useState } from 'react';
// Fix: Use a module-level import to avoid named export type errors in the current environment
import * as ReactRouterDOM from 'react-router-dom';
const { useNavigate } = ReactRouterDOM as any;
import { SellerProfile } from '../types';
import { SettingsService } from '../services/settingsService';
import { ChevronLeftIcon, PhotoIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<SellerProfile>({
    sellerName: '',
    businessName: '',
    sellerAddress: '',
    sellerGstin: '',
    sellerEmail: '',
    sellerPhone: '',
    logoUrl: '',
    brandColor: '#4f46e5'
  });

  useEffect(() => {
    (async () => {
      try {
        const data = await SettingsService.getSellerProfile();
        if (data) {
          setProfile(data);
        }
      } catch (err) {
        console.error("Failed to load settings:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleChange = (field: keyof SellerProfile, value: string) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => handleChange('logoUrl', reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await SettingsService.saveSellerProfile(profile);
      alert("Settings saved successfully!");
    } catch (err) {
      console.error("Failed to save settings:", err);
      alert("Failed to save settings. Please check your connection.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500 font-medium animate-pulse">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <nav className="bg-white border-b border-gray-200 px-4 md:px-6 py-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="text-gray-500 hover:text-gray-800 flex items-center gap-1 text-sm font-medium"
          >
            <ChevronLeftIcon className="w-4 h-4" /> Dashboard
          </button>
          <div className="h-6 w-px bg-gray-300"></div>
          <h1 className="font-bold text-xl text-gray-800">Business Settings</h1>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 mt-8">
        <form onSubmit={handleSave} className="bg-white shadow rounded-lg p-6 space-y-6">
          <div>
            <h2 className="text-lg font-medium text-gray-900 mb-1">Default Seller Profile</h2>
            <p className="text-sm text-gray-500">These details will be automatically used when creating new invoices.</p>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {/* Logo & Color */}
            <div className="flex flex-col sm:flex-row gap-6 items-start">
              <div className="flex-1 w-full">
                <label className="block text-sm font-medium text-gray-700 mb-1">Business Logo</label>
                <div className="flex items-center gap-4">
                  <div className="h-20 w-20 bg-gray-50 rounded border border-gray-200 flex items-center justify-center overflow-hidden text-gray-300">
                    {profile.logoUrl ? (
                      <img src={profile.logoUrl} alt="Logo" className="h-full w-full object-contain" />
                    ) : (
                      <PhotoIcon className="h-8 w-8" />
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="cursor-pointer bg-white py-2 px-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                      Upload Logo
                      <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                    </label>
                    {profile.logoUrl && (
                      <button
                        type="button"
                        onClick={() => handleChange('logoUrl', '')}
                        className="text-red-600 text-xs hover:underline text-left"
                      >
                        Remove logo
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <div className="shrink-0">
                <label className="block text-sm font-medium text-gray-700 mb-1">Brand Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    className="h-10 w-20 border border-gray-300 rounded cursor-pointer bg-white p-1"
                    value={profile.brandColor}
                    onChange={(e) => handleChange('brandColor', e.target.value)}
                  />
                  <span className="text-sm text-gray-500 font-mono uppercase">{profile.brandColor}</span>
                </div>
              </div>
            </div>

            {/* Details Form */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
                <input
                  type="text"
                  required
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  value={profile.businessName}
                  onChange={(e) => handleChange('businessName', e.target.value)}
                  placeholder="e.g. Acme Studio"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
                <input
                  type="text"
                  required
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  value={profile.sellerName}
                  onChange={(e) => handleChange('sellerName', e.target.value)}
                  placeholder="e.g. John Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">GSTIN (Optional)</label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all uppercase"
                  value={profile.sellerGstin}
                  onChange={(e) => handleChange('sellerGstin', e.target.value)}
                  placeholder="e.g. 29ABCDE1234F1Z5"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Business Email</label>
                <input
                  type="email"
                  required
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  value={profile.sellerEmail}
                  onChange={(e) => handleChange('sellerEmail', e.target.value)}
                  placeholder="accounts@acme.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  required
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  value={profile.sellerPhone}
                  onChange={(e) => handleChange('sellerPhone', e.target.value)}
                  placeholder="+91..."
                />
              </div>
              <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Address</label>
                <textarea
                  rows={3}
                  required
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all resize-none"
                  value={profile.sellerAddress}
                  onChange={(e) => handleChange('sellerAddress', e.target.value)}
                  placeholder="Full Business Address for Invoices"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-gray-100">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-8 rounded-lg transition-all disabled:opacity-50 shadow-md shadow-indigo-100 active:scale-[0.98]"
            >
              {saving ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <CheckCircleIcon className="w-5 h-5" />
                  Save Profile
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Settings;
