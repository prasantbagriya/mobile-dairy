import { useState, useEffect, Suspense, lazy } from 'react';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './lib/auth';
import { useI18n } from './lib/i18n';
import Layout from './components/Layout';
import ReloadPrompt from './components/ReloadPrompt';
import { Milk } from 'lucide-react';

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
const HelpSupport = lazy(() => import('./views/HelpSupport'));
const FarmerDashboard = lazy(() => import('./views/FarmerDashboard'));
const CustomerDashboard = lazy(() => import('./views/CustomerDashboard'));
const PinLock = lazy(() => import('./components/PinLock'));
const AdminLogin = lazy(() => import('./components/AdminLogin'));
const PortalLogin = lazy(() => import('./components/PortalLogin'));
const LandingPage = lazy(() => import('./views/LandingPage'));
const PrivacyPolicy = lazy(() => import('./views/PrivacyPolicy'));
const TermsOfService = lazy(() => import('./views/TermsOfService'));

const FullPageLoader = () => (
  <div className="min-h-screen bg-slate-50 flex items-center justify-center">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
  </div>
);

export default function App() {
  const { user, role, loading, logout } = useAuth();
  const { t } = useI18n();
  const [activeView, setActiveView] = useState('dashboard');
  const [pinVerified, setPinVerified] = useState(false);

  useEffect(() => {
    if (!user) {
      setPinVerified(false);
    }
  }, [user]);

  const renderContent = () => {
    if (loading) {
      return <FullPageLoader />;
    }

    if (!user) {
      const path = window.location.pathname.toLowerCase();
      if (path.includes('/farmer')) return <PortalLogin role="farmer" />;
      if (path.includes('/customer')) return <PortalLogin role="customer" />;
      if (path.includes('/admin')) return <AdminLogin />;
      if (path.includes('/privacy-policy')) return <PrivacyPolicy />;
      if (path.includes('/terms-of-service')) return <TermsOfService />;
      return <LandingPage />;
    }

    if (role === 'farmer') return <FarmerDashboard />;
    if (role === 'customer') return <CustomerDashboard />;
    if (user && !pinVerified) return <PinLock user={user} onSuccess={() => setPinVerified(true)} onLogout={logout} />;

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
        case 'help_support': return <HelpSupport />;
        default: return <Dashboard onNavigate={setActiveView} />;
      }
    };

    return (
      <Layout activeView={activeView} setActiveView={setActiveView}>
        {renderView()}
      </Layout>
    );
  };

  return (
    <>
      <Toaster position="top-right" toastOptions={{ duration: 1000 }} />
      <ReloadPrompt />
      <Suspense fallback={<FullPageLoader />}>
        {renderContent()}
      </Suspense>
    </>
  );
}
