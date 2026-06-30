import { ReactNode, useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { useI18n } from '../lib/i18n';
import { 
  Users, 
  Droplet, 
  Settings as SettingsIcon, 
  LogOut, 
  FileText,
  UserPlus,
  BookOpen,
  PieChart,
  Globe,
  Wallet,
  Menu,
  X,
  Package,
  TrendingUp,
  Activity,
  LayoutDashboard,
  UserCircle,
  Truck,
  BadgeIndianRupee,
  ShoppingBag,
  ChevronLeft, 
  ChevronRight,
  Database,
  Download,
  Milk,
  Languages,
  Plus,
  LifeBuoy
} from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
  activeView: string;
  setActiveView: (view: string) => void;
}

export default function Layout({ children, activeView, setActiveView }: LayoutProps) {
  const { user, logout, role , tenantId } = useAuth();
  const { t, lang, setLang } = useI18n();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Load sidebar state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('sidebar_collapsed');
    if (saved !== null) {
      setIsCollapsed(JSON.parse(saved));
    }
  }, []);

  const toggleSidebar = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('sidebar_collapsed', JSON.stringify(newState));
  };



  const menuItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: t('dashboard') },
    { id: 'farmers', icon: Users, label: t('farmers') },
    { id: 'collections', icon: Droplet, label: t('collections') },
    { id: 'customers', icon: UserCircle, label: t('customers') },
    { id: 'deliveries', icon: Truck, label: t('deliveries') },
    { id: 'expenses', icon: Wallet, label: t('expenses') },
    { id: 'profitloss', icon: Activity, label: t('profit_loss') },
    { id: 'dairy_sales', icon: ShoppingBag, label: t('dairy_sales') },
    { id: 'inventory', icon: Package, label: t('inventory') },
    { id: 'payments', icon: BadgeIndianRupee, label: t('payments') },
    { id: 'reports', icon: FileText, label: t('reports') },
  ];

  const isSuperAdmin = user?.email?.toLowerCase().trim() === 'prashantbagriya7877@gmail.com';
  if (role === 'admin' || isSuperAdmin) {
    menuItems.push({ id: 'admin', icon: SettingsIcon, label: t('settings', 'Settings') });
  }

  const handleNavClick = (id: string) => {
    setActiveView(id);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="h-dvh overflow-hidden bg-slate-50 flex flex-col md:flex-row font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Sidebar - Desktop */}
      <aside className={`hidden md:flex flex-col ${isCollapsed ? 'w-20' : 'w-72'} bg-slate-900 text-white p-4 shrink-0 relative z-10 border-r border-white/5`}>
        <button 
          onClick={toggleSidebar}
          className="absolute -right-3 top-20 w-6 h-6 bg-blue-600 text-white flex items-center justify-center border border-white/10 z-20"
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>

        <div className={`flex items-center gap-4 mb-10 px-2 group cursor-pointer ${isCollapsed ? 'justify-center' : ''}`}>
          <div className="w-12 h-12 bg-blue-600 flex items-center justify-center shrink-0">
            <Milk className="w-7 h-7 text-white" />
          </div>
          {!isCollapsed && (
            <div className="overflow-hidden whitespace-nowrap">
              <h1 className="text-xl tracking-tight text-white leading-none">MilkMaster</h1>
              <p className="text-[10px] text-slate-500 tracking-widest mt-1">Enterprise ERP</p>
            </div>
          )}
        </div>

        <nav className="flex-1 space-y-1 no-scrollbar overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={`w-full flex items-center gap-4 px-4 py-3.5 relative group overflow-hidden ${
                  isActive 
                  ? 'bg-blue-600 text-white' 
                  : 'text-white hover:bg-slate-800/50'
                } ${isCollapsed ? 'justify-center' : ''}`}
                title={isCollapsed ? item.label : ''}
              >
                <item.icon className={`w-5 h-5 relative z-10 ${isActive ? 'text-white' : 'group-hover:text-blue-400'}`} />
                {!isCollapsed && (
                  <span className="text-[13px] relative z-10 tracking-wide whitespace-nowrap overflow-hidden">
                    {item.label}
                  </span>
                )}
                {isActive && !isCollapsed && (
                   <div className="absolute right-4 w-1.5 h-1.5 bg-white" />
                )}
              </button>
            );
          })}
          <div className="pt-4 mt-4 border-t border-slate-800 space-y-2 shrink-0 px-2 pb-4">
            <button 
              onClick={() => handleNavClick('help_support')}
              className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-white hover:bg-indigo-500/10 hover:text-indigo-400 text-[13px] ${isCollapsed ? 'justify-center' : ''}`}
              title={isCollapsed ? "Help & Support" : ''}
            >
              <LifeBuoy className="w-5 h-5" />
              {!isCollapsed && <span>Help & Support</span>}
            </button>
            
            <a
              href={import.meta.env.VITE_APK_DOWNLOAD_URL || "/milkmaster.apk"}
              download="milkmaster.apk"
              rel="noopener noreferrer"
              className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-white hover:bg-emerald-500/10 hover:text-emerald-400 text-[13px] ${isCollapsed ? 'justify-center' : ''}`}
              title={isCollapsed ? "Download App" : ''}
            >
              <Download className="w-5 h-5" />
              {!isCollapsed && <span>Download App</span>}
            </a>

            {!isCollapsed ? (
              <div className="flex items-center gap-4 px-4 py-3 text-white bg-slate-800/30 border border-slate-800/50 rounded-xl group mx-2">
                <Languages className="w-5 h-5 text-white group-hover:text-blue-400" />
                <select 
                  value={lang} 
                  onChange={(e) => setLang(e.target.value as any)}
                  className="bg-transparent text-[13px] focus:outline-none cursor-pointer flex-1"
                >
                  <option value="en" className="bg-slate-900">English Language</option>
                  <option value="hi" className="bg-slate-900">हिन्दी भाषा</option>
                  <option value="gu" className="bg-slate-900">ગુજરાતી</option>
                  <option value="mr" className="bg-slate-900">मराठी</option>
                </select>
              </div>
            ) : (
              <button 
                onClick={() => setLang(lang === 'hi' ? 'en' : 'hi')}
                className="w-full flex justify-center py-3 rounded-xl text-white hover:text-blue-400"
                title="Change Language"
              >
                <Languages className="w-5 h-5" />
              </button>
            )}

            <button 
              onClick={logout}
              className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-white hover:bg-red-500/10 hover:text-red-400 text-[13px] ${isCollapsed ? 'justify-center' : ''}`}
              title={isCollapsed ? t('logout') : ''}
            >
              <LogOut className="w-5 h-5" />
              {!isCollapsed && <span>{t('logout')}</span>}
            </button>
          </div>
        </nav>
      </aside>

      {/* Header - Mobile */}
      <header className="md:hidden bg-slate-900 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-50 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-none flex items-center justify-center">
            <Milk className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg tracking-tight font-semibold mr-1">MilkMaster</span>
          <a
            href={import.meta.env.VITE_APK_DOWNLOAD_URL || "/milkmaster.apk"}
            download="milkmaster.apk"
            rel="noopener noreferrer"
            className="p-1.5 md:p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-none flex items-center gap-1 text-[10px] md:text-xs font-bold tracking-widest"
          >
            <Download className="w-3.5 h-3.5" /> App
          </a>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 bg-slate-800 rounded-none ml-1">
            {isMobileMenuOpen ? <X className="w-5 h-5 text-red-400" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {isMobileMenuOpen && (
        <div className="fixed inset-x-0 top-[57px] bottom-16 z-100 md:hidden flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setIsMobileMenuOpen(false)}></div>
          <div className="relative w-64 bg-slate-900 h-full flex flex-col shadow-2xl border-r border-slate-800 overflow-hidden">
            {/* Scrollable nav area */}
            <div className="flex-1 overflow-y-auto space-y-1 no-scrollbar pb-4 pt-2 px-4">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center gap-4 px-4 py-3 rounded-none ${
                    activeView === item.id 
                    ? 'bg-blue-600 text-white' 
                    : 'text-white hover:bg-slate-800'
                  }`}
                >
                  <item.icon className={`w-5 h-5 ${activeView === item.id ? 'text-white' : 'text-white group-hover:text-blue-400'}`} />
                  <span className="text-[13px] tracking-wide relative z-10">{item.label}</span>
                </button>
              ))}
            {/* Fixed bottom section moved into scrollable area */}
            <div className="shrink-0 space-y-1 pb-4 pt-3 mt-4 border-t border-slate-800">
              <div className="flex items-center gap-4 px-4 py-2 text-white">
                <Languages className="w-5 h-5" />
                <select 
                  value={lang} 
                  onChange={(e) => setLang(e.target.value as any)}
                  className="bg-transparent text-[13px] focus:outline-none"
                >
                  <option value="en" className="bg-slate-900">English</option>
                  <option value="hi" className="bg-slate-900">हिन्दी</option>
                  <option value="gu" className="bg-slate-900">ગુજરાતી</option>
                  <option value="mr" className="bg-slate-900">मराठी</option>
                </select>
              </div>
              <button 
                onClick={() => handleNavClick('help_support')}
                className={`w-full flex items-center gap-4 px-4 py-3 rounded-none text-white hover:text-indigo-400 hover:bg-indigo-400/10 text-[13px] ${activeView === 'help_support' ? 'bg-indigo-500/20 text-indigo-400' : ''}`}
              >
                <LifeBuoy className="w-5 h-5" />
                <span>Help & Support</span>
              </button>

              <button 
                onClick={logout}
                className="w-full flex items-center gap-4 px-4 py-3 rounded-none text-white hover:text-red-400 hover:bg-red-400/10 text-[13px]"
              >
                <LogOut className="w-5 h-5" />
                <span>{t('logout')}</span>
              </button>
            </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-auto no-scrollbar bg-slate-50 pb-16 md:pb-0">
        <div className="p-4 md:p-6">
          {children}
        </div>
      </main>

      {/* Bottom Navigation - Mobile Only */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-40 flex items-center justify-around pb-safe h-16 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
        {[
          { id: 'dashboard', icon: LayoutDashboard, label: t('dashboard') },
          { id: 'collections', icon: Droplet, label: t('farmer') },
          { id: 'deliveries', icon: Truck, label: t('customer') },
          { id: 'expenses', icon: Wallet, label: t('expenses') },
        ].map(item => {
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`flex flex-col items-center justify-center w-full h-full relative ${isActive ? 'text-blue-600' : 'text-slate-500'}`}
            >
              {isActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-blue-600 rounded-b-full"></div>
              )}
              <item.icon className={`w-5 h-5 mb-1 ${isActive ? 'text-blue-600' : 'text-slate-500'}`} />
              <span className="text-[10px] font-bold tracking-wide">{item.label}</span>
            </button>
          )
        })}
      </nav>


    </div>
  );
}

