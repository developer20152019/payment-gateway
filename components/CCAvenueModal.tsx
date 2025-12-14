import React, { useState, useEffect, useRef } from 'react';
import { XMarkIcon, LockClosedIcon } from '@heroicons/react/24/outline';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  paymentHtml: string;
  isLoading: boolean;
}

export const CCAvenueModal: React.FC<Props> = ({ isOpen, onClose, paymentHtml, isLoading }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [showContent, setShowContent] = useState(false);
  
  // Handle animation state
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => setShowContent(true), 50);
    } else {
      setShowContent(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4">
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity duration-300 ${showContent ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      ></div>

      {/* Modal Content */}
      <div 
        className={`relative bg-white w-full h-[90vh] sm:h-auto sm:max-h-[90vh] sm:rounded-xl shadow-2xl flex flex-col transition-all duration-300 ease-out ${
          showContent ? 'translate-y-0 opacity-100 sm:scale-100' : 'translate-y-full opacity-0 sm:translate-y-10 sm:scale-95'
        }`}
        style={{ maxWidth: '550px' }} 
      >
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50 shrink-0 rounded-t-xl">
          <div className="flex items-center gap-2">
             <div className="bg-green-100 p-1.5 rounded-full">
               <LockClosedIcon className="w-4 h-4 text-green-700" />
             </div>
             <div>
               <h3 className="font-semibold text-sm text-gray-900 leading-tight">Secure Payment</h3>
               <p className="text-[10px] text-gray-500 leading-tight">CCAvenue Iframe Integration</p>
             </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Content (Iframe) */}
        <div className="flex-1 bg-white relative w-full overflow-hidden flex items-center justify-center">
          {isLoading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white z-10">
              <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-sm text-gray-500 font-medium">Connecting to secure gateway...</p>
            </div>
          ) : (
            <iframe
                ref={iframeRef}
                srcDoc={paymentHtml}
                title="Payment Checkout"
                className="w-full h-full border-0"
                style={{ minHeight: '520px' }}
                sandbox="allow-forms allow-scripts allow-same-origin allow-popups allow-top-navigation allow-modals" 
            />
          )}
        </div>

        {/* Footer (Desktop only) */}
        <div className="px-4 py-2 bg-gray-50 text-center text-[10px] text-gray-400 border-t border-gray-100 shrink-0 hidden sm:block rounded-b-xl">
          <div className="flex items-center justify-center gap-1.5">
             <LockClosedIcon className="w-3 h-3"/>
             <span>256-bit SSL Encrypted Connection. Your data is safe.</span>
          </div>
        </div>
      </div>
    </div>
  );
};