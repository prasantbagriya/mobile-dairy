import { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { ShieldCheck, RefreshCw, AlertCircle, CheckCircle2, FileSpreadsheet, Lock } from 'lucide-react';
import { AdminConfig } from '../types';
import InfoTooltip from '../components/InfoTooltip';
import { useI18n } from '../lib/i18n';

export default function Sync() {
  const { user, accessToken, tenantId, connectGoogle } = useAuth();
  const { t } = useI18n();
  const [syncing, setSyncing] = useState(false);
  const [config, setConfig] = useState<AdminConfig | null>(null);
  const [status, setStatus] = useState<{ type: 'idle' | 'success' | 'error', message?: string }>({ type: 'idle' });

  useEffect(() => {
    if (user?.uid) {
      loadConfig();
    }
  }, [user]);

  async function loadConfig() {
    const docSnap = await getDoc(doc(db, 'admin_configs', user!.uid));
    if (docSnap.exists()) {
      setConfig(docSnap.data() as AdminConfig);
    }
  }

  async function handleSync() {
    if (!accessToken) {
      setStatus({ type: 'error', message: 'Not authenticated with Google. Please re-login.' });
      return;
    }

    setSyncing(true);
    setStatus({ type: 'idle' });

    try {
      let spreadsheetId = config?.spreadsheetId;

      // 2. Define Sheets to sync
      const collections = [
        { name: 'farmers', title: 'Farmers' },
        { name: 'customers', title: 'Customers' },
        { name: 'milk_collections', title: 'Collections' },
        { name: 'milk_deliveries', title: 'Deliveries' },
        { name: 'expenses', title: 'Expenses' },
        { name: 'transactions', title: 'Transactions' },
        { name: 'dairy_sales', title: 'DairySales' }
      ];

      // 1. Create Spreadsheet if not exists
      if (!spreadsheetId) {
        const resp = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            properties: { title: 'MilkMaster Data Export' },
            sheets: collections.map(c => ({ properties: { title: c.title } }))
          })
        });
        const result = await resp.json();
        spreadsheetId = result.spreadsheetId;
        await setDoc(doc(db, 'admin_configs', user!.uid), { spreadsheetId }, { merge: true });
        setConfig(prev => prev ? { ...prev, spreadsheetId } : null);
      }

      // 3. Sync each collection
      for (const col of collections) {
        const snap = await getDocs(query(collection(db, col.name), where('userId', '==', tenantId)));
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));

        if (data.length === 0) continue;

        const syncableData = data;
        if (syncableData.length === 0) continue;

        // Extract consistent headers for all rows
        const headersSet = new Set<string>();
        syncableData.forEach((item: any) => Object.keys(item).forEach(k => headersSet.add(k)));
        const allHeaders = Array.from(headersSet);
        const headers = ['id', 'createdAt', 'date', 'name', 'farmerName', 'customerName', 'dairyName', 'amount', 'quantity', 'rate', 'fat', 'snf', 'session'].filter(h => allHeaders.includes(h)).concat(allHeaders.filter(h => !['id', 'createdAt', 'date', 'name', 'farmerName', 'customerName', 'dairyName', 'amount', 'quantity', 'rate', 'fat', 'snf', 'session'].includes(h)));
        
        const values = [headers, ...syncableData.map((item: any) => 
          headers.map(h => {
            const val = item[h];
            if (val === undefined || val === null) return '';
            if (typeof val === 'object') return JSON.stringify(val);
            return String(val);
          })
        )];

        // Ensure sheet exists or clear it
        // This is a simplified overwrite sync
        await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${col.title}!A1:Z1000?valueInputOption=RAW`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ values })
        });
      }

      await setDoc(doc(db, 'admin_configs', user!.uid), { lastSyncedAt: new Date().toISOString() }, { merge: true });
      loadConfig();
      setStatus({ type: 'success', message: 'Data synced successfully to Google Sheets!' });
    } catch (e: any) {
      console.error(e);
      setStatus({ type: 'error', message: e.message || 'Sync failed. Please try again.' });
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="bg-white rounded-none border border-slate-200 overflow-hidden">
      <div className="p-4 border-b border-slate-50 flex flex-wrap items-center gap-3">
        <div className="w-8 h-8 bg-blue-50 flex items-center justify-center shrink-0">
          <FileSpreadsheet className="w-4 h-4 text-blue-600" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm text-slate-900 tracking-tight flex items-center gap-2">
            {t('cloud_sync')} 
            <InfoTooltip text={t('cloud_sync_desc')} />
          </h3>
          <p className="text-[10px] text-black tracking-widest mt-0.5">{t('manage_cloud_connectivity')}</p>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-none flex items-center justify-between">
            <div>
              <p className="text-[10px] text-slate-500 mb-1">{t('last_sync_status')}</p>
              <p className="text-sm text-black font-medium">
                {config?.lastSyncedAt ? new Date(config.lastSyncedAt).toLocaleString() : t('never_synced')}
              </p>
            </div>
            <RefreshCw className="w-5 h-5 text-slate-300" />
          </div>
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-none flex items-center justify-between">
            <div>
              <p className="text-[10px] text-slate-500 mb-1">{t('google_access_status')}</p>
              <div className="flex items-center gap-2">
                {accessToken ? (
                  <>
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    <span className="text-sm font-semibold text-emerald-600">{t('connected')}</span>
                  </>
                ) : (
                  <span className="text-sm text-red-500">{t('not_connected')}</span>
                )}
              </div>
            </div>
            {!accessToken && (
              <button onClick={connectGoogle} className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-none transition-colors border border-blue-100">
                <Lock className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">{t('connect_google')}</span>
              </button>
            )}
          </div>
        </div>

        {status.type !== 'idle' && (
          <div className={`p-4 flex items-center gap-3 rounded-none ${status.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
            {status.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <p className="text-xs">{status.message}</p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-slate-50">
          <button 
            onClick={handleSync}
            disabled={syncing || !accessToken}
            className="flex-1 py-3 bg-blue-600 text-white text-xs tracking-wider hover:bg-blue-700 flex items-center justify-center gap-2 disabled:opacity-50 rounded-none transition-colors"
          >
            {syncing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                {t('syncing')}
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                {t('start_sync')}
              </>
            )}
          </button>
          {config?.spreadsheetId && (
            <a 
              href={`https://docs.google.com/spreadsheets/d/${config.spreadsheetId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-3 bg-white border border-slate-200 text-center text-xs tracking-wider text-blue-600 hover:bg-slate-50 rounded-none transition-colors flex items-center justify-center"
            >
              {t('view_live_spreadsheet')}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
