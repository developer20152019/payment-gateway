import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeftIcon, PhotoIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { SellerProfile } from '../types';
import { SettingsService } from '../services/settingsService';

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
    const load = async () => {
        const data = await SettingsService.getSellerProfile();
        if (data) {
            setProfile(data);
        }
        setLoading(false);
    };
    load();
  }, []);

  const handleChange = (field: keyof SellerProfile, value: string) => {
      setProfile(prev => ({ ...prev, [field]: value }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        handleChange('logoUrl', reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
      e.preventDefault();
      setSaving(true);
      await SettingsService.saveSellerProfile(profile);
      setSaving(false);
      alert("Settings saved successfully!");
  };

  if (loading) {
      return <div className="p-8 text-center text-gray-500">Loading settings...</div>;
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
                            <div className="h-20 w-20 bg-gray-50 rounded border border-gray-200 flex items-center justify-center overflow-hidden">
                                {profile.logoUrl ? (
                                    <img src={profile.logoUrl} alt="Logo" className="h-full w-full object-contain" />
                                ) : (
                                    <PhotoIcon className="h-8 w-8 text-gray-400" />
                                )}
                            </div>
                            <label className="cursor-pointer bg-white py-2 px-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50">
                                Upload
                                <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                            </label>
                            {profile.logoUrl && (
                                <button type="button" onClick={() => handleChange('logoUrl', '')} className="text-red-600 text-sm hover:underline">Remove</button>
                            )}
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Brand Color</label>
                        <div className="flex items-center gap-2">
                            <input 
                                type="color" 
                                className="h-10 w-20 border border-gray-300 rounded cursor-pointer"
                                value={profile.brandColor}
                                onChange={(e) => handleChange('brandColor', e.target.value)}
                            />
                            <span className="text-sm text-gray-500 uppercase">{profile.brandColor}</span>
                        </div>
                    </div>
                </div>

                {/* Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="col-span-1 md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
                        <input 
                            type="text" 
                            className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                            value={profile.businessName}
                            onChange={(e) => handleChange('businessName', e.target.value)}
                            placeholder="e.g. Acme Studio"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
                        <input 
                            type="text" 
                            className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                            value={profile.sellerName}
                            onChange={(e) => handleChange('sellerName', e.target.value)}
                            placeholder="e.g. John Doe"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">GSTIN</label>
                        <input 
                            type="text" 
                            className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                            value={profile.sellerGstin}
                            onChange={(e) => handleChange('sellerGstin', e.target.value)}
                            placeholder="e.g. 29ABCDE1234F1Z5"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input 
                            type="email" 
                            className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                            value={profile.sellerEmail}
                            onChange={(e) => handleChange('sellerEmail', e.target.value)}
                            placeholder="accounts@acme.com"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                        <input 
                            type="tel" 
                            className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                            value={profile.sellerPhone}
                            onChange={(e) => handleChange('sellerPhone', e.target.value)}
                            placeholder="+91..."
                        />
                    </div>
                    <div className="col-span-1 md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                        <textarea 
                            rows={3}
                            className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                            value={profile.sellerAddress}
                            onChange={(e) => handleChange('sellerAddress', e.target.value)}
                            placeholder="Full Business Address"
                        />
                    </div>
                </div>
            </div>

            <div className="flex justify-end pt-4">
                <button 
                    type="submit" 
                    disabled={saving}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-6 rounded-lg transition-colors disabled:opacity-50"
                >
                    {saving ? 'Saving...' : <><CheckCircleIcon className="w-5 h-5" /> Save Settings</>}
                </button>
            </div>
        </form>
      </div>
    </div>
  );
};

export default Settings;