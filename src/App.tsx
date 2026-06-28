import { useState, useEffect, Suspense, lazy } from 'react';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './lib/auth';
import { useMessaging } from './lib/useMessaging';
import { useI18n } from './lib/i18n';
import Layout from './components/Layout';
const Dashboard = lazy(() => import('./views/Dashboard'));
const Farmers = lazy(() => import('./views/Farmers'));
const Customers = lazy(() => import('./views/Customers'));
const Collections = lazy(() => import('./views/Collections'));
const Deliveries = lazy(() => import('./views/Deliveries'));
const Expenses = lazy(() => import('./views/Expenses'));
const Payments = lazy(() => import('./views/Payments'));
const Reports = lazy(() => import('./views/Reports'));
const ProfitLoss = lazy(() => import('./views/ProfitLoss'));
const DairySales = lazy(() => import('./views/DairySales'));
const Inventory = lazy(() => import('./views/Inventory'));
const Admin = lazy(() => import('./views/Admin'));
const FarmerDashboard = lazy(() => import('./views/FarmerDashboard'));
const CustomerDashboard = lazy(() => import('./views/CustomerDashboard'));
const PinLock = lazy(() => import('./components/PinLock'));
const AdminLogin = lazy(() => import('./components/AdminLogin'));
const PortalLogin = lazy(() => import('./components/PortalLogin'));
const LandingPage = lazy(() => import('./views/LandingPage'));
const PrivacyPolicy = lazy(() => import('./views/PrivacyPolicy'));
const TermsOfService = lazy(() => import('./views/TermsOfService'));
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
    
    if (path.includes('/farmer')) return (
      <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}>
        <PortalLogin role="farmer" />
      </Suspense>
    );
    
    if (path.includes('/customer')) return (
      <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}>
        <PortalLogin role="customer" />
      </Suspense>
    );

    let Component = LandingPage;
    if (path.includes('/admin')) Component = AdminLogin;
    else if (path.includes('/privacy-policy')) Component = PrivacyPolicy;
    else if (path.includes('/terms-of-service')) Component = TermsOfService;

    return (
      <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}>
        <Component />
      </Suspense>
    );
  }

  if (role === 'farmer') {
    return (
      <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}>
        <FarmerDashboard />
      </Suspense>
    );
  }

  if (role === 'customer') {
    return (
      <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}>
        <CustomerDashboard />
      </Suspense>
    );
  }

  if (user && !pinVerified) {
    return (
      <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}>
        <PinLock 
          user={user} 
          onSuccess={() => setPinVerified(true)} 
          onLogout={logout} 
        />
      </Suspense>
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
        <Suspense fallback={<div className="flex h-full items-center justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}>
          {renderView()}
        </Suspense>
      </Layout>
    </>
  );
}
