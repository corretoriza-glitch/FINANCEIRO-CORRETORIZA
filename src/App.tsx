import React, { useState } from 'react';
import { AuthProvider, AuthGuard } from './components/AuthGuard';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { Transactions } from './components/Transactions';
import { Payable } from './components/Payable';
import { Receivable } from './components/Receivable';
import { Commissions } from './components/Commissions';
import { Reports } from './components/Reports';
import { Closing } from './components/Closing';
import Settings from './components/Settings';
import { ToastProvider } from './contexts/ToastContext';

function MainApp() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'transactions':
        return <Transactions />;
      case 'payable':
        return <Payable />;
      case 'receivable':
        return <Receivable />;
      case 'commissions':
        return <Commissions />;
      case 'reports':
        return <Reports />;
      case 'closing':
        return <Closing />;
      case 'users': {
        return <Settings initialTab="users" mode="users" />;
      }
      case 'profile': {
        return <Settings initialTab="profile" mode="users" />;
      }
      case 'settings': {
        return <Settings initialTab="branding" mode="system" />;
      }
      default:
        return (
          <div className="flex flex-col items-center justify-center py-20 text-brand/40">
            <h3 className="text-2xl font-serif font-bold mb-2">Em breve</h3>
            <p>Este módulo está em desenvolvimento.</p>
          </div>
        );
    }
  };

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      {renderContent()}
    </Layout>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AuthGuard>
          <MainApp />
        </AuthGuard>
      </AuthProvider>
    </ToastProvider>
  );
}
