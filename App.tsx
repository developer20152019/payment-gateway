import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import CreateInvoice from './pages/CreateInvoice';
import ViewInvoice from './pages/ViewInvoice';
import Dashboard from './pages/Dashboard';

const App: React.FC = () => {
  return (
    <HashRouter>
      <div className="min-h-screen bg-gray-50 text-gray-900 font-sans selection:bg-indigo-100 selection:text-indigo-800">
        <Routes>
          <Route 
            path="/" 
            element={<Dashboard />} 
          />
          <Route 
            path="/create" 
            element={<CreateInvoice />} 
          />
           <Route 
            path="/edit/:id" 
            element={<CreateInvoice />} 
          />
          <Route 
            path="/view/:id" 
            element={<ViewInvoice />} 
          />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </HashRouter>
  );
};

export default App;