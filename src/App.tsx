import { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './lib/auth';
import { useMessaging } from './lib/useMessaging';
import { useI18n } from './lib/i18n';
import Layout from './components/Layout';
import Dashboard from './views/Dashboard';
import Farmers from './views/Farmers';
import Customers from './views/Customers';
import Collections from './views/Collections';
import Deliveries from './views/Deliveries';
import Expenses from './views/Expenses';
import Payments from './views/Payments';
import Reports from './views/Reports';
import ProfitLoss from './views/ProfitLoss';
import DairySales from './views/DairySales';
import Inventory from './views/Inventory';
import Admin from './views/Admin';
import FarmerDashboard from './views/FarmerDashboard';
import PinLock from './components/PinLock';
import AdminLogin from './components/AdminLogin';
import FarmerLogin from './components/FarmerLogin';
import CustomerLogin from './components/CustomerLogin';
import CustomerDashboard from './views/CustomerDashboard';
import LandingPage from './views/LandingPage';
import PrivacyPolicy from './views/PrivacyPolicy';
import TermsOfService from './views/TermsOfService';
import { Milk } from 'lucide-react';

export default function App() {
  const { user, role, loading, logout } = useAuth();
  useMessaging();
  const { t } = useI18n();
  const [activeView, setActiveView] = useState('dashboard');
  const [pinVerified, setPinVerified] = useState(false);

  useEffect(() => {
    if (!user) {
      setPinVerified(false);
    }
  }, [user]);

  if (loading) {
    return <div className="min-h-screen bg-slate-50"></div>;
  }

  if (!user) {
    const path = window.location.pathname.toLowerCase();
    if (path.includes('/farmer')) return <FarmerLogin />;
    if (path.includes('/customer')) return <CustomerLogin />;
    if (path.includes('/admin')) return <AdminLogin />;
    if (path.includes('/privacy-policy')) return <PrivacyPolicy />;
    if (path.includes('/terms-of-service')) return <TermsOfService />;
    return <LandingPage />;
  }

  if (role === 'farmer') {
    return <FarmerDashboard />;
  }

  if (role === 'customer') {
    return <CustomerDashboard />;
  }

  if (user && !pinVerified) {
    return (
      <PinLock 
        user={user} 
        onSuccess={() => setPinVerified(true)} 
        onLogout={logout} 
      />
    );
  }

  const renderView = () => {
    switch (activeView) {
      case 'dashboard': return <Dashboard onNavigate={setActiveView} />;
      case 'farmers': return <Farmers />;
      case 'customers': return <Customers />;
      case 'collections': return <Collections />;
      case 'deliveries': return <Deliveries />;
      case 'expenses': return <Expenses />;
      case 'payments': return <Payments />;
      case 'reports': return <Reports />;
      case 'profitloss': return <ProfitLoss />;
      case 'dairy_sales': return <DairySales />;
      case 'inventory': return <Inventory />;
      case 'admin': return <Admin />;
      default: return <Dashboard onNavigate={setActiveView} />;
    }
  };

  return (
    <>
      <Toaster position="top-right" toastOptions={{ duration: 1000 }} />
      <Layout activeView={activeView} setActiveView={setActiveView}>
        {renderView()}
      </Layout>
    </>
  );
}
