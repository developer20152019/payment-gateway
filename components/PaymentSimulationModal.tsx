import React from 'react';
import { XMarkIcon, BeakerIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onFailure: () => void;
  amount: number;
  currency: string;
  gatewayName: string;
}

export const PaymentSimulationModal: React.FC<Props> = ({ 
  isOpen, onClose, onSuccess, onFailure, amount, currency, gatewayName 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
        onClick={onClose}
      ></div>

      {/* Modal Content */}
      <div className="relative bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-gray-800 to-gray-900 px-6 py-4 flex justify-between items-center text-white">
           <div className="flex items-center gap-2">
              <BeakerIcon className="w-5 h-5 text-yellow-400" />
              <span className="font-semibold tracking-wide">Test Mode</span>
           </div>
           <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
              <XMarkIcon className="w-6 h-6" />
           </button>
        </div>

        {/* Body */}
        <div className="p-6 text-center">
           <div className="mb-6">
              <p className="text-gray-500 text-sm uppercase tracking-wider font-bold mb-1">Paying via {gatewayName}</p>
              <p className="text-4xl font-bold text-gray-900">
                {new Intl.NumberFormat('en-IN', { style: 'currency', currency: currency }).format(amount)}
              </p>
           </div>

           <p className="text-sm text-gray-600 mb-8 bg-yellow-50 p-3 rounded-lg border border-yellow-100 text-left">
             The backend returned an error (likely due to missing API keys).
             <br/><br/>
             Use these buttons to simulate a payment response:
           </p>

           <div className="space-y-3">
              <button 
                onClick={onSuccess}
                className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-green-200"
              >
                <CheckCircleIcon className="w-5 h-5" /> Simulate Success
              </button>
              
              <button 
                onClick={onFailure}
                className="w-full py-3 bg-white border-2 border-red-100 text-red-600 hover:bg-red-50 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <XCircleIcon className="w-5 h-5" /> Simulate Failure
              </button>
           </div>
        </div>
      </div>
    </div>
  );
};