import { Milk, ArrowRight, UserCheck, Users, ShieldAlert, BarChart3, Cloud, Smartphone } from 'lucide-react';

export default function LandingPage() {
  const navigateTo = (path: string) => {
    window.location.href = path;
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-blue-200">
      {/* Mobile App View (Visible only on small screens) */}
      <div className="md:hidden min-h-screen flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,var(--tw-gradient-stops))] from-blue-100 via-slate-50 to-white opacity-80"></div>
        </div>
        
        <div className="relative z-10 w-full flex flex-col items-center">
          <div className="w-24 h-24 bg-blue-600 rounded-3xl flex items-center justify-center mb-6 shadow-xl shadow-blue-600/30">
            <Milk className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">MilkMaster</h1>
          <p className="text-sm text-slate-600 mb-10 font-medium">Select your portal to continue</p>

          <div className="w-full max-w-sm space-y-4">
            <button onClick={() => navigateTo('/admin')} className="w-full bg-white border border-slate-200 p-4 rounded-2xl shadow-sm flex items-center gap-4 hover:border-blue-300 hover:shadow-md transition-all active:scale-95">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div className="text-left">
                <h3 className="text-lg font-bold text-slate-900">Dairy Admin</h3>
                <p className="text-[10px] text-slate-500 tracking-widest font-semibold">Manage Dairy Business</p>
              </div>
            </button>

            <button onClick={() => navigateTo('/farmer')} className="w-full bg-white border border-slate-200 p-4 rounded-2xl shadow-sm flex items-center gap-4 hover:border-emerald-300 hover:shadow-md transition-all active:scale-95">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
                <UserCheck className="w-6 h-6" />
              </div>
              <div className="text-left">
                <h3 className="text-lg font-bold text-slate-900">Farmer</h3>
                <p className="text-[10px] text-slate-500 tracking-widest font-semibold">Milk Supplier Portal</p>
              </div>
            </button>

            <button onClick={() => navigateTo('/customer')} className="w-full bg-white border border-slate-200 p-4 rounded-2xl shadow-sm flex items-center gap-4 hover:border-orange-300 hover:shadow-md transition-all active:scale-95">
              <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center shrink-0">
                <Users className="w-6 h-6" />
              </div>
              <div className="text-left">
                <h3 className="text-lg font-bold text-slate-900">Customer</h3>
                <p className="text-[10px] text-slate-500 tracking-widest font-semibold">Milk Buyer Portal</p>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Desktop Landing Page */}
      <div className="hidden md:block">
      {/* Navigation */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <Milk className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-slate-900 tracking-tight">MilkMaster</span>
            </div>
            <div className="flex space-x-2 md:space-x-4">
              <button onClick={() => navigateTo('/admin')} className="text-xs md:text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors px-2 py-1 md:px-0 md:py-0">Admin</button>
              <button onClick={() => navigateTo('/farmer')} className="text-xs md:text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors px-2 py-1 md:px-0 md:py-0">Farmer</button>
              <button onClick={() => navigateTo('/customer')} className="text-xs md:text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors px-2 py-1 md:px-0 md:py-0">Customer</button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative bg-white overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,var(--tw-gradient-stops))] from-blue-50 via-white to-slate-50 opacity-70"></div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 pt-20 pb-24 lg:pt-32 lg:pb-40">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight mb-6">
              The Complete Digital Dairy <span className="text-transparent bg-clip-text bg-linear-to-r from-blue-600 to-cyan-500">Management System</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-600 mb-10 leading-relaxed">
              MilkMaster is a comprehensive dairy management application designed to help dairy owners, farmers, and customers track milk collections, manage sales, and organize financial records effortlessly.
            </p>
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 text-left mb-10 inline-block max-w-2xl mx-auto shadow-sm">
              <p className="text-sm text-blue-800 leading-relaxed">
                <strong>Google Integrations:</strong> MilkMaster integrates directly with Google Sheets to allow users to securely export and back up their dairy records. It also integrates with Google Contacts to help users easily import and manage their farmer and customer contact details.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <button onClick={() => navigateTo('/admin')} className="px-8 py-4 bg-blue-600 text-white rounded-full font-semibold shadow-lg shadow-blue-600/30 hover:bg-blue-700 hover:scale-105 transition-all flex items-center justify-center gap-2">
                Go to Admin Portal <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Portals Section */}
      <div className="py-20 bg-slate-50 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Dedicated Portals for Everyone</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">MilkMaster provides specialized interfaces tailored to the unique needs of dairy administrators, contributing farmers, and daily customers.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {/* Admin */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 hover:shadow-xl hover:border-blue-300 transition-all group">
              <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <ShieldAlert className="w-7 h-7 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Dairy Admin</h3>
              <p className="text-slate-600 mb-6 text-sm leading-relaxed">Manage daily milk collections, set fat/SNF rates, generate bills, and get a complete overview of your dairy business performance.</p>
              <button onClick={() => navigateTo('/admin')} className="text-blue-600 font-semibold flex items-center gap-2 hover:gap-3 transition-all">
                Access Admin Portal <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Farmer */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 hover:shadow-xl hover:border-emerald-300 transition-all group">
              <div className="w-14 h-14 bg-emerald-100 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <UserCheck className="w-7 h-7 text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Farmer Portal</h3>
              <p className="text-slate-600 mb-6 text-sm leading-relaxed">View your daily milk delivery records, check quality parameters (Fat/SNF), and monitor your upcoming payments securely.</p>
              <button onClick={() => navigateTo('/farmer')} className="text-emerald-600 font-semibold flex items-center gap-2 hover:gap-3 transition-all">
                Access Farmer Portal <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Customer */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 hover:shadow-xl hover:border-orange-300 transition-all group">
              <div className="w-14 h-14 bg-orange-100 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Users className="w-7 h-7 text-orange-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Customer Portal</h3>
              <p className="text-slate-600 mb-6 text-sm leading-relaxed">Check your daily milk purchases, view monthly bills, manage your balance, and keep track of your transactions.</p>
              <button onClick={() => navigateTo('/customer')} className="text-orange-600 font-semibold flex items-center gap-2 hover:gap-3 transition-all">
                Access Customer Portal <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Showcase */}
      <div className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl font-bold text-slate-900 mb-6">Why choose MilkMaster?</h2>
              <div className="space-y-8">
                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center shrink-0">
                    <Cloud className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-slate-900 mb-1">Cloud Synced & Secure</h4>
                    <p className="text-slate-600 text-sm">Your data is safely stored in the cloud. Access it from anywhere, anytime, without worrying about losing records.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center shrink-0">
                    <BarChart3 className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-slate-900 mb-1">Automated Accounting</h4>
                    <p className="text-slate-600 text-sm">Instantly calculate milk prices based on Fat/SNF and automatically generate accurate bills and full details.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center shrink-0">
                    <Smartphone className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-slate-900 mb-1">Mobile Friendly PWA</h4>
                    <p className="text-slate-600 text-sm">Install the app directly from your browser menu. It works just like a native mobile app for all users.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-linear-to-tr from-blue-100 to-cyan-50 rounded-3xl transform rotate-3"></div>
              <div className="bg-slate-900 rounded-3xl p-8 relative shadow-2xl overflow-hidden">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                </div>
                <div className="space-y-4">
                  <div className="h-4 bg-slate-800 rounded w-3/4"></div>
                  <div className="h-4 bg-slate-800 rounded w-1/2"></div>
                  <div className="h-4 bg-slate-800 rounded w-5/6"></div>
                  <div className="h-32 bg-slate-800 rounded-lg mt-8 border border-slate-700 flex items-end p-4 gap-2">
                    <div className="w-8 bg-blue-500/50 rounded-t h-1/3"></div>
                    <div className="w-8 bg-blue-500/50 rounded-t h-2/3"></div>
                    <div className="w-8 bg-blue-500/80 rounded-t h-full"></div>
                    <div className="w-8 bg-blue-500/50 rounded-t h-1/2"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-slate-950 pt-16 pb-8 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
            <div className="lg:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <Milk className="w-6 h-6 text-white" />
                <span className="text-xl font-bold text-white">MilkMaster</span>
              </div>
              <p className="text-slate-400 text-sm max-w-sm mb-6 leading-relaxed">
                Empowering dairy businesses with digital tools for better management, transparency, and growth.
              </p>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-3">
                <li><button onClick={() => navigateTo('/admin')} className="text-sm text-slate-400 hover:text-white transition-colors">Admin Portal</button></li>
                <li><button onClick={() => navigateTo('/farmer')} className="text-sm text-slate-400 hover:text-white transition-colors">Farmer Portal</button></li>
                <li><button onClick={() => navigateTo('/customer')} className="text-sm text-slate-400 hover:text-white transition-colors">Customer Portal</button></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-3">
                <li><a href="/privacy-policy" className="text-sm text-slate-400 hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="/terms-of-service" className="text-sm text-slate-400 hover:text-white transition-colors">Terms of Service</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-slate-500 text-sm">
              © {new Date().getFullYear()} MilkMaster. All rights reserved.
            </p>
            <p className="text-slate-600 text-xs tracking-widest">
              Install as App via Browser Menu
            </p>
          </div>
        </div>
      </footer>
      </div>
    </div>
  );
}
