import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Customer } from '../types';
import { CustomerService } from '../services/customerService';
import { ChevronLeftIcon, PlusIcon, TrashIcon, UsersIcon, PencilIcon, XMarkIcon, CheckIcon } from '@heroicons/react/24/outline';

const Customers: React.FC = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [gstin, setGstin] = useState('');

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    setLoading(true);
    const data = await CustomerService.getAllCustomers();
    setCustomers(data);
    setLoading(false);
  };

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setEmail('');
    setPhone('');
    setAddress('');
    setGstin('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!name.trim()) return;

    const customerToSave: Customer = {
        id: editingId || `cust_${Date.now()}`,
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        address: address.trim(),
        gstin: gstin.trim()
    };

    await CustomerService.saveCustomer(customerToSave);
    
    resetForm();
    loadCustomers();
  };

  const handleEdit = (customer: Customer) => {
      setEditingId(customer.id);
      setName(customer.name);
      setEmail(customer.email);
      setPhone(customer.phone);
      setAddress(customer.address);
      setGstin(customer.gstin || '');
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if(window.confirm("Delete this customer?")) {
        await CustomerService.deleteCustomer(id);
        if (editingId === id) resetForm();
        loadCustomers();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <nav className="bg-white border-b border-gray-200 px-4 md:px-6 py-4 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <button 
             onClick={() => navigate('/')}
             className="text-gray-500 hover:text-gray-800 flex items-center gap-1 text-sm font-medium"
          >
             <ChevronLeftIcon className="w-4 h-4" /> Back to Dashboard
          </button>
          <div className="h-6 w-px bg-gray-300"></div>
          <h1 className="font-bold text-xl text-gray-800 flex items-center gap-2">
            <UsersIcon className="w-6 h-6 text-indigo-600" /> Manage Customers
          </h1>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 mt-8">
        
        {/* Add/Edit Form */}
        <div className={`rounded-xl shadow-sm border p-6 mb-8 transition-colors ${editingId ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-gray-200'}`}>
            <div className="flex justify-between items-center mb-4">
                <h2 className={`text-lg font-bold ${editingId ? 'text-indigo-700' : 'text-gray-800'}`}>
                    {editingId ? 'Edit Customer' : 'Add New Customer'}
                </h2>
                {editingId && (
                    <button onClick={resetForm} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
                        <XMarkIcon className="w-4 h-4" /> Cancel
                    </button>
                )}
            </div>
            
            <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Customer / Company Name *</label>
                    <input type="text" required className="w-full border border-gray-300 rounded-lg p-2 text-sm" value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Corp" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input type="email" className="w-full border border-gray-300 rounded-lg p-2 text-sm" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contact@acme.com" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input type="tel" className="w-full border border-gray-300 rounded-lg p-2 text-sm" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91..." />
                </div>
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                    <textarea rows={2} className="w-full border border-gray-300 rounded-lg p-2 text-sm resize-none" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street, City, Zip" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">GSTIN (Optional)</label>
                    <input type="text" className="w-full border border-gray-300 rounded-lg p-2 text-sm" value={gstin} onChange={(e) => setGstin(e.target.value)} placeholder="GSTIN..." />
                </div>
                <div className="flex items-end justify-end">
                    <button type="submit" className={`px-6 py-2.5 rounded-lg text-white font-medium transition-colors flex items-center justify-center gap-2 ${editingId ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-gray-800 hover:bg-gray-900'}`}>
                        {editingId ? <CheckIcon className="w-5 h-5" /> : <PlusIcon className="w-5 h-5" />}
                        {editingId ? 'Update Customer' : 'Add Customer'}
                    </button>
                </div>
            </form>
        </div>

        {/* List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                <span className="font-bold text-gray-700">Saved Customers</span>
                <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full">{customers.length}</span>
            </div>
            
            {loading ? (
                <div className="p-8 text-center text-gray-500">Loading customers...</div>
            ) : customers.length === 0 ? (
                <div className="p-8 text-center text-gray-500">No customers saved yet.</div>
            ) : (
                <table className="w-full text-left text-sm text-gray-600">
                    <thead className="bg-gray-50 text-xs uppercase font-medium text-gray-500 border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-3">Name</th>
                            <th className="px-6 py-3">Contact</th>
                            <th className="px-6 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {customers.map((c) => (
                            <tr key={c.id} className={`hover:bg-gray-50 ${editingId === c.id ? 'bg-indigo-50' : ''}`}>
                                <td className="px-6 py-3 font-medium text-gray-900">
                                    {c.name}
                                    <div className="text-xs text-gray-400 font-normal">{c.address}</div>
                                </td>
                                <td className="px-6 py-3">
                                    <div className="text-gray-900">{c.email}</div>
                                    <div className="text-xs text-gray-500">{c.phone}</div>
                                </td>
                                <td className="px-6 py-3 text-right">
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => handleEdit(c)} className="text-blue-500 hover:text-blue-700 p-1 hover:bg-blue-50 rounded">
                                            <PencilIcon className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => handleDelete(c.id)} className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded">
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
      </div>
    </div>
  );
};

export default Customers;