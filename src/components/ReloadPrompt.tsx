import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, X } from 'lucide-react';
import { useEffect } from 'react';

export default function ReloadPrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered:', r);
    },
    onRegisterError(error) {
      console.log('SW registration error', error);
    },
  });

  if (!needRefresh) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] p-4 bg-white border border-slate-200 shadow-2xl rounded-xl flex items-center gap-4 animate-in fade-in slide-in-from-bottom-5">
      <div className="flex-1 pr-2">
        <p className="text-sm font-bold text-slate-900">New Update Available!</p>
        <p className="text-xs text-slate-500 mt-0.5">Click refresh to get the latest features.</p>
      </div>
      <div className="flex gap-2">
        <button 
          onClick={() => updateServiceWorker(true)} 
          className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1.5 text-xs font-bold transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
        <button 
          onClick={() => setNeedRefresh(false)} 
          className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
