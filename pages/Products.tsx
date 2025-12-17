
import React, { useEffect, useState } from 'react';
// Changed import from 'react-router-dom' to 'react-router' to fix v7 export errors
import { useNavigate } from 'react-router';
import { Product } from '../types';
import { ProductService } from '../services/productService';
import { ChevronLeftIcon, PlusIcon, TrashIcon, TagIcon, PencilIcon, XMarkIcon, CheckIcon } from '@heroicons/react/24/outline';

const Products: React.FC = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newRate, setNewRate] = useState('');

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    const data = await ProductService.getAllProducts();
    setProducts(data);
    setLoading(false);
  };

  const resetForm = () => {
    setEditingId(null);
    setNewName('');
    setNewDesc('');
    setNewRate('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!newName.trim() || !newRate) return;

    // Uniqueness Check
    const nameExists = products.some(p => 
        p.name.toLowerCase() === newName.trim().toLowerCase() && p.id !== editingId
    );

    if (nameExists) {
        alert("A product with this name already exists. Please use a unique name.");
        return;
    }

    const productToSave: Product = {
        id: editingId || `prod_${Date.now()}`,
        name: newName.trim(),
        description: newDesc.trim(),
        rate: parseFloat(newRate)
    };

    await ProductService.saveProduct(productToSave);
    
    resetForm();
    loadProducts();
  };

  const handleEdit = (product: Product) => {
      setEditingId(product.id);
      setNewName(product.name);
      setNewDesc(product.description);
      setNewRate(product.rate.toString());
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
      resetForm();
  };

  const handleDelete = async (id: string) => {
    if(window.confirm("Delete this product?")) {
        await ProductService.deleteProduct(id);
        if (editingId === id) resetForm();
        loadProducts();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <nav className="bg-white border-b border-gray-200 px-4 md:px-6 py-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <button 
             onClick={() => navigate('/')}
             className="text-gray-500 hover:text-gray-800 flex items-center gap-1 text-sm font-medium"
          >
             <ChevronLeftIcon className="w-4 h-4" /> Back to Dashboard
          </button>
          <div className="h-6 w-px bg-gray-300"></div>
          <h1 className="font-bold text-xl text-gray-800 flex items-center gap-2">
            <TagIcon className="w-6 h-6 text-indigo-600" /> Manage Products
          </h1>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 mt-8">
        
        {/* Add/Edit Product Form */}
        <div className={`rounded-xl shadow-sm border p-6 mb-8 transition-colors ${editingId ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-gray-200'}`}>
            <div className="flex justify-between items-center mb-4">
                <h2 className={`text-lg font-bold ${editingId ? 'text-indigo-700' : 'text-gray-800'}`}>
                    {editingId ? 'Edit Product' : 'Add New Product'}
                </h2>
                {editingId && (
                    <button onClick={handleCancelEdit} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
                        <XMarkIcon className="w-4 h-4" /> Cancel
                    </button>
                )}
            </div>
            
            <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div className="md:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
                    <input 
                        type="text" 
                        required
                        className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="e.g. Consulting"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                    />
                </div>
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <input 
                        type="text" 
                        className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="e.g. Hourly consultation rate"
                        value={newDesc}
                        onChange={(e) => setNewDesc(e.target.value)}
                    />
                </div>
                <div className="md:col-span-1 flex gap-2">
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Rate</label>
                        <input 
                            type="number" 
                            required
                            min="0"
                            step="any"
                            className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="0.00"
                            value={newRate}
                            onChange={(e) => setNewRate(e.target.value)}
                        />
                    </div>
                    <button 
                        type="submit"
                        className={`px-4 py-2 rounded-lg text-white transition-colors h-[38px] flex items-center justify-center ${editingId ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-gray-800 hover:bg-gray-900'}`}
                    >
                        {editingId ? <CheckIcon className="w-5 h-5" /> : <PlusIcon className="w-5 h-5" />}
                    </button>
                </div>
            </form>
        </div>

        {/* Product List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                <span className="font-bold text-gray-700">Saved Products</span>
                <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full">{products.length}</span>
            </div>
            
            {loading ? (
                <div className="p-8 text-center text-gray-500">Loading products...</div>
            ) : products.length === 0 ? (
                <div className="p-8 text-center text-gray-500">No products saved yet.</div>
            ) : (
                <div className="overflow-x-auto overflow-y-auto max-h-[400px]">
                    <table className="w-full text-left text-sm text-gray-600">
                        <thead className="bg-gray-50 text-xs uppercase font-medium text-gray-500 border-b border-gray-100 sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="px-6 py-3 w-1/4 bg-gray-50">Name</th>
                                <th className="px-6 py-3 w-2/4 bg-gray-50">Description</th>
                                <th className="px-6 py-3 text-right w-1/4 bg-gray-50">Rate</th>
                                <th className="px-6 py-3 text-right w-[100px] bg-gray-50">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {products.map((p) => (
                                <tr key={p.id} className={`hover:bg-gray-50 ${editingId === p.id ? 'bg-indigo-50' : ''}`}>
                                    <td className="px-6 py-3 font-medium text-gray-900">{p.name}</td>
                                    <td className="px-6 py-3 text-gray-500 break-words max-w-sm" title={p.description}>{p.description}</td>
                                    <td className="px-6 py-3 text-right font-medium">{p.rate.toFixed(2)}</td>
                                    <td className="px-6 py-3 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button 
                                                onClick={() => handleEdit(p)}
                                                className="text-blue-500 hover:text-blue-700 p-1 hover:bg-blue-50 rounded"
                                                title="Edit"
                                            >
                                                <PencilIcon className="w-4 h-4" />
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(p.id)}
                                                className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded"
                                                title="Delete"
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default Products;