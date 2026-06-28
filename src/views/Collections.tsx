import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useI18n } from '../lib/i18n';
import { db } from '../lib/firebase';
import { collection, addDoc, getDocs, onSnapshot, query, orderBy, limit, doc, increment, updateDoc, getDoc, setDoc, where, writeBatch } from 'firebase/firestore';
import { Farmer, MilkCollection, AppSettings } from '../types';
import { Plus, Search, Calendar, Moon, Sun, Calculator, Save, X, Milk, History, Edit, TrendingUp, Clock, Edit2, Filter } from 'lucide-react';
import { format } from 'date-fns';
import InfoTooltip from '../components/InfoTooltip';
import { useAuth } from '../lib/auth';
import EditMilkModal from '../components/EditMilkModal';

export default function Collections() {
  const { t } = useI18n();
  const { accessToken, user, role , tenantId } = useAuth();
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [recentCollections, setRecentCollections] = useState<MilkCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConfig, setShowConfig] = useState(false);
  const [settings, setSettings] = useState<AppSettings>({
    avgPrice: 52.40,
    peakFatRate: 7.20,
    efficiency: 14.2
  });
  
  // Form State
  const [formData, setFormData] = useState({
    farmerId: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    session: 'morning' as 'morning' | 'evening',
    quantity: '',
    fat: '',
    snf: '',
    rate: '',
    amount: 0
  });

  const [viewMode, setViewMode] = useState<'form' | 'sheet'>('form');
  const [sheetSearch, setSheetSearch] = useState('');
  const [sheetData, setSheetData] = useState<Record<string, { quantity: string, fat: string, snf: string }>>({});
  const [existingSessions, setExistingSessions] = useState<Record<string, Record<string, { id: string, amount: number, quantity?: number, fat?: number, snf?: number }>>>({});
  const [editingCollection, setEditingCollection] = useState<MilkCollection | null>(null);
  const [showSheetFilters, setShowSheetFilters] = useState(false);

  useEffect(() => {
    if (!tenantId) return;
    setLoading(true);
    const unsubFarmers = onSnapshot(query(collection(db, 'farmers'), where('userId', '==', tenantId)), (snap) => {
      const farList = snap.docs.map(d => ({ id: d.id, ...d.data() } as Farmer)).sort((a, b) => (a.sequence || 0) - (b.sequence || 0) || a.name.localeCompare(b.name));
      setFarmers(farList);
    });

    const unsubSettings = onSnapshot(doc(db, 'settings', tenantId || 'default'), (doc) => {
      if (doc.exists()) {
        setSettings(doc.data() as AppSettings);
      }
    });

    const qCol = query(collection(db, 'milk_collections'), where('userId', '==', tenantId), orderBy('date', 'desc'), limit(100));
    const unsubCols = onSnapshot(qCol, (snap) => {
      const cols = snap.docs.map(d => ({ id: d.id, ...d.data() } as MilkCollection));
      cols.sort((a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime());
      setRecentCollections(cols.slice(0, 10));
    });

    setLoading(false);

    return () => {
      unsubFarmers();
      unsubSettings();
      unsubCols();
    };
  }, [tenantId]);

  useEffect(() => {
    if (!tenantId) return;
    if (!formData.date) return;
    const unsubSessions = onSnapshot(query(collection(db, 'milk_collections'), where('userId', '==', tenantId), where('date', '==', formData.date)), (snap) => {
      const sessions: Record<string, Record<string, { id: string, amount: number, quantity?: number, fat?: number, snf?: number }>> = {};
      snap.docs.forEach(d => {
        const data = d.data();
        if (!sessions[data.farmerId]) {
          sessions[data.farmerId] = {};
        }
        sessions[data.farmerId][data.session] = { 
          id: d.id, 
          amount: data.amount || 0,
          quantity: data.quantity,
          fat: data.fat,
          snf: data.snf
        };
      });
      setExistingSessions(sessions);
    });
    return () => unsubSessions();
  }, [formData.date, tenantId]);

  // Update sheetData whenever farmers list, date, session or existingSessions changes
  useEffect(() => {
    const newSheet: Record<string, { quantity: string, fat: string, snf: string }> = {};
    farmers.forEach(f => {
      const sessionData = existingSessions[f.id!]?.[formData.session];
      if (sessionData) {
        newSheet[f.id!] = {
          quantity: sessionData.quantity?.toString() || '',
          fat: sessionData.fat?.toString() || '',
          snf: sessionData.snf?.toString() || ''
        };
      } else {
        newSheet[f.id!] = {
          quantity: f.fixedQty?.toString() || '',
          fat: f.fixedFat?.toString() || '',
          snf: '8.5'
        };
      }
    });
    setSheetData(newSheet);
  }, [farmers, existingSessions, formData.session]);

  useEffect(() => {
    if (formData.farmerId) {
      const selectedFarmer = farmers.find(f => f.id === formData.farmerId);
      if (selectedFarmer) {
        const farmerSessions = existingSessions[formData.farmerId] || {};
        const hasMorning = !!farmerSessions['morning'];
        const hasEvening = !!farmerSessions['evening'];

        setFormData(prev => ({
          ...prev,
          session: (hasMorning && !hasEvening) ? 'evening' : 
                   (hasEvening && !hasMorning) ? 'morning' : prev.session,
          fat: selectedFarmer.fixedFat ? selectedFarmer.fixedFat.toString() : prev.fat,
          rate: selectedFarmer.fixedRate ? selectedFarmer.fixedRate.toString() : prev.rate
        }));
      }
    }
  }, [formData.farmerId, farmers, existingSessions]);

  const calculateAmount = () => {
    const qty = parseFloat(formData.quantity) || 0;
    const rate = parseFloat(formData.rate) || 0;
    const amount = qty * rate;
    setFormData(prev => ({ ...prev, amount }));
  };

  useEffect(() => {
    calculateAmount();
  }, [formData.quantity, formData.rate]);

  const autoCalculateRate = () => {
    const selectedFarmer = farmers.find(f => f.id === formData.farmerId);
    if (selectedFarmer?.fixedRate) return;

    const fat = parseFloat(formData.fat) || 0;
    const snf = parseFloat(formData.snf) || 0;
    if (fat > 0 && snf > 0) {
      const calculatedRate = (fat * settings.peakFatRate / 10) + (snf * 3.5); 
      setFormData(prev => ({ ...prev, rate: calculatedRate.toFixed(2) }));
    }
  };

  useEffect(() => {
    autoCalculateRate();
  }, [formData.fat, formData.snf, settings]);

  async function handleSave(moveToNext = true) {
    if (!formData.farmerId || !formData.quantity || !formData.amount) {
      alert("Missing required fields");
      return;
    }

    try {
      // Final check for duplicates
      const sessionData = existingSessions[formData.farmerId]?.[formData.session];
      let existingDocId = null;
      let existingAmount = 0;
      if (sessionData) {
        if (!window.confirm(`${formData.session.toUpperCase()} data already exists for this farmer on this date. Do you want to update entry?`)) {
          return;
        }
        existingDocId = sessionData.id;
        existingAmount = sessionData.amount;
      }

      const collectionRef = collection(db, 'milk_collections');
      const farmerRef = doc(db, 'farmers', formData.farmerId);

      const newCollection = {
        farmerId: formData.farmerId,
        farmerName: farmers.find(f => f.id === formData.farmerId)?.name,
        date: formData.date,
        session: formData.session,
        quantity: parseFloat(formData.quantity) || 0,
        fat: parseFloat(formData.fat) || 0,
        snf: parseFloat(formData.snf) || 0,
        rate: parseFloat(formData.rate) || 0,
        amount: formData.amount,
        createdAt: new Date().toISOString(),
        userId: tenantId
      };

      const batch = writeBatch(db);
      
      if (existingDocId) {
        const docRef = doc(collectionRef, existingDocId);
        batch.update(docRef, { ...newCollection, updatedAt: new Date().toISOString() });
        batch.update(farmerRef, { balance: increment(formData.amount - existingAmount) });
      } else {
        const newCollectionRef = doc(collectionRef);
        batch.set(newCollectionRef, newCollection);
        batch.update(farmerRef, { balance: increment(formData.amount) });
      }
      batch.commit().catch(e => {
        console.error("Batch commit failed: ", e);
        toast.error("Failed to sync collection: " + e.message);
      });

      if (moveToNext) {
        // Find Next Farmer in the sorted list
        const currentIdx = farmers.findIndex(f => f.id === formData.farmerId);
        const nextFarmer = farmers[currentIdx + 1];

        setFormData({
          ...formData,
          farmerId: nextFarmer ? nextFarmer.id! : '',
          quantity: '',
          fat: '',
          snf: '',
          rate: '',
          amount: 0
        });
      } else {
        setFormData({
          ...formData,
          quantity: '',
          fat: '',
          snf: '',
          rate: '',
          amount: 0
        });
      }
      const farmerName = farmers.find(f => f.id === formData.farmerId)?.name || 'Farmer';
      toast.success(`Collection saved successfully for ${farmerName}!`);
    } catch (e) {
      console.error(e);
      toast.error("Error saving collection: " + (e as any).message);
    }
  }

  async function saveSettings() {
    try {
      await setDoc(doc(db, 'settings', tenantId || 'default'), { ...settings, userId: tenantId });
      setShowConfig(false);
    } catch (e) { console.error(e); }
  }

  async function handleSaveSheetRow(farmerId: string) {
    const data = sheetData[farmerId];
    if (!data.quantity || !data.fat || !data.snf) return;

    try {
      // Duplicate session check
      const sessionData = existingSessions[farmerId]?.[formData.session];
      let existingDocId = null;
      let existingAmount = 0;
      if (sessionData) {
        if (!window.confirm("Session data already exists for this farmer. Do you want to update entry?")) {
          return;
        }
        existingDocId = sessionData.id;
        existingAmount = sessionData.amount;
      }

      const farmer = farmers.find(f => f.id === farmerId);
      const fat = parseFloat(data.fat) || 0;
      const snf = parseFloat(data.snf) || 0;
      const rate = farmer?.fixedRate ? farmer.fixedRate : ((fat * settings.peakFatRate / 10) + (snf * 3.5));
      const qty = parseFloat(data.quantity);
      const amount = qty * rate;


      
      const batch = writeBatch(db);
      const newCollectionData = {
        farmerId,
        farmerName: farmer?.name,
        date: formData.date,
        session: formData.session,
        quantity: qty,
        fat,
        snf,
        rate,
        amount,
        createdAt: new Date().toISOString(),
        userId: tenantId
      };

      if (existingDocId) {
        batch.update(doc(db, 'milk_collections', existingDocId), { ...newCollectionData, updatedAt: new Date().toISOString() });
        batch.update(doc(db, 'farmers', farmerId), { balance: increment(amount - existingAmount) });
      } else {
        batch.set(doc(collection(db, 'milk_collections')), newCollectionData);
        batch.update(doc(db, 'farmers', farmerId), { balance: increment(amount) });
      }
      
      batch.commit().catch(e => {
        console.error("Batch commit failed: ", e);
        toast.error("Failed to sync row: " + e.message);
      });
      
      // Mark as saved in local state
      setSheetData(prev => ({
        ...prev,
        [farmerId]: { ...prev[farmerId], saved: true } as any
      }));
      toast.success(`Record saved successfully for ${farmer?.name || 'Farmer'}!`);
    } catch (e) { 
      console.error(e);
      toast.error("Error saving row: " + (e as any).message);
    }
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
        {/* Entry Form - Left Section */}
        <div className="xl:col-span-12 flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4 md:gap-4">
          <h2 className="text-xl md:text-2xl text-slate-900 tracking-tight flex items-center gap-1 md:gap-2">
            {t('collections')}
            <InfoTooltip text="Record milk purchased from farmers with FAT/SNF testing." />
          </h2>
          <div className="flex gap-2 w-full md:w-auto shrink-0">
            <button 
              onClick={() => setViewMode('form')}
              className={`flex-1 md:flex-none px-3 py-2.5 md:px-6 md:py-3 text-xs tracking-wider transition-all ${viewMode === 'form' ? 'bg-blue-600 text-white border border-blue-600' : 'bg-white text-black border border-slate-200'}`}
            >
              {t('single_entry')}
            </button>
            <button 
              onClick={() => setViewMode('sheet')}
              className={`flex-1 md:flex-none px-3 py-2.5 md:px-6 md:py-3 text-xs tracking-wider transition-all ${viewMode === 'sheet' ? 'bg-blue-600 text-white border border-blue-600' : 'bg-white text-black border border-slate-200'}`}
            >
              {t('daily_sheet')}
            </button>
          </div>
        </div>

        {viewMode === 'form' ? (
          <>
            <div className="xl:col-span-4 xl:sticky xl:top-4">
          <div className="bg-white rounded-none border border-slate-100 overflow-hidden">
            <div className="bg-blue-600 p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 bg-white/20 rounded-none flex items-center justify-center">
                  <Calculator className="w-5 h-5" />
                </div>
                <div className="text-right">
                  <p className="text-[10px] tracking-tight  opacity-70 mb-0.5">{t("total_amount")}</p>
                  <h4 className="text-2xl ">₹ {formData.amount.toFixed(2)}</h4>
                </div>
              </div>
              <h3 className="text-lg  tracking-tight">{t("new_entry")}</h3>
              <p className="text-blue-100 text-[10px]  tracking-tight opacity-80 mt-0.5">{t("procurement_details")}</p>
            </div>

            <div className="p-4 space-y-4">
              <div className="space-y-3">
                <div>
                  <label className="text-[10px]  text-black tracking-tight block mb-1">{t('farmer_name')}</label>
                  <select 
                    className="w-full bg-slate-50 border border-slate-200 rounded-none px-3 py-3 focus:ring-1 focus:ring-blue-500 outline-none transition-all appearance-none  text-black text-xs"
                    value={formData.farmerId}
                    onChange={(e) => setFormData({...formData, farmerId: e.target.value})}
                  >
                    <option value="">{t("select_farmer")}</option>
                    {farmers.map(f => <option key={f.id} value={f.id}>{f.name} ({f.village}) [Seq: {f.sequence || 0}]</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px]  text-black tracking-tight block mb-1">{t('date')}</label>
                    <input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-none px-3 py-2.5  text-black text-xs" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[10px]  text-black tracking-tight block mb-1">{t('session')}</label>
                    <div className="grid grid-cols-2 gap-1 p-1 bg-slate-50 rounded-none border border-slate-200">
                      <button 
                        onClick={() => setFormData({...formData, session: 'morning'})}
                        className={`flex items-center justify-center gap-2 py-1.5 rounded-none text-[10px] ${formData.session === 'morning' ? 'bg-white text-blue-600 border border-slate-200' : 'text-black'}`}
                      >
                        <Sun className="w-3 h-3" /> Morning
                      </button>
                      <button 
                        onClick={() => setFormData({...formData, session: 'evening'})}
                        className={`flex items-center justify-center gap-2 py-1.5 rounded-none text-[10px] ${formData.session === 'evening' ? 'bg-white text-blue-600 border border-slate-200' : 'text-black'}`}
                      >
                        <Moon className="w-3 h-3" /> Evening
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px]  text-black tracking-tight block mb-1">{t('quantity')}</label>
                    <input type="number" inputMode="decimal" pattern="[0-9]*" placeholder="0.0" className="w-full bg-slate-50 border border-slate-200 rounded-none px-3 py-3 text-base  text-black" value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[10px]  text-black tracking-tight block mb-1">{t('fat')}</label>
                    <input type="number" inputMode="decimal" pattern="[0-9]*" placeholder="0.0" className="w-full bg-slate-50 border border-slate-200 rounded-none px-3 py-3 text-base  text-black" value={formData.fat} onChange={e => setFormData({...formData, fat: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[10px]  text-black tracking-tight block mb-1">{t('snf')}</label>
                    <input type="number" inputMode="decimal" pattern="[0-9]*" placeholder="0.0" className="w-full bg-slate-50 border border-slate-200 rounded-none px-3 py-3 text-base  text-black" value={formData.snf} onChange={e => setFormData({...formData, snf: e.target.value})} />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px]  text-black tracking-tight block">{t('rate')} (₹/L)</label>
                    <span className="text-[8px]  text-slate-300">Rate = (Fat * {settings.peakFatRate}/10) + (SNF * 3.5)</span>
                  </div>
                  <input type="number" inputMode="decimal" pattern="[0-9]*" placeholder="0.00" className="w-full bg-slate-100 border border-slate-200 rounded-none px-4 py-3 text-xl  text-blue-600" value={formData.rate} onChange={e => setFormData({...formData, rate: e.target.value})} />
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <button onClick={() => handleSave(false)} className="flex-1 px-4 py-3 rounded-none text-xs tracking-wider border border-slate-200 text-slate-700 hover:bg-slate-50 transition flex items-center justify-center gap-2 font-medium">
                  <Save className="w-4 h-4" /> Save
                </button>
                <button onClick={() => handleSave(true)} className="flex-2 px-4 py-3 rounded-none text-xs tracking-wider bg-slate-900 text-white hover:bg-black transition flex items-center justify-center gap-2 font-medium">
                  <Save className="w-4 h-4" /> Save & Next
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* {t('history')} & Summary - Right Section */}
        <div className="xl:col-span-8 space-y-4 hidden md:block">
          <div className="bg-white rounded-none border border-slate-100 overflow-hidden text-xs">
            <div className="p-4 border-b border-slate-50 flex items-center justify-between">
              <h3 className="text-sm text-slate-900 flex items-center gap-2 font-semibold">
                <History className="w-4 h-4 text-blue-500" />
                {t('latest_collections')}
              </h3>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-black" />
                  <input placeholder={t("search_placeholder")} className="pl-9 pr-3 py-1.5 bg-slate-50 rounded-none text-[10px]  border border-slate-100 outline-none focus:ring-1 focus:ring-blue-100 w-40" />
                </div>
              </div>
            </div>
            <div className="max-h-[600px] overflow-y-auto overflow-x-auto">
              <table className="w-full text-left order-collapse">
                <thead className="bg-slate-50/50 text-black text-[9px] tracking-widest  sticky top-0 z-10 backdrop-blur-sm">
                  <tr>
                    <th className="px-6 py-4 whitespace-nowrap">{t('date_session')}</th>
                    <th className="px-6 py-4 whitespace-nowrap">{t('farmer')}</th>
                    <th className="px-6 py-4 text-center whitespace-nowrap">{t('qty_quality')}</th>
                    <th className="px-6 py-4 text-right whitespace-nowrap">{t("settlement")}</th>
                    {role === 'admin' && <th className="px-6 py-4 text-center whitespace-nowrap">{t("action")}</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-black">
                  {recentCollections.map(col => (
                    <tr key={col.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="">{col.date}</span>
                          <span className={`text-[9px]  mt-0.5 ${col.session === 'morning' ? 'text-amber-500' : 'text-indigo-500'}`}>{col.session === 'morning' ? t('morning') : t('evening')}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className=" text-slate-900">{col.farmerName}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col items-center">
                          <span className=" text-slate-900">{col.quantity} L</span>
                          <span className="text-[9px]  text-black tracking-wider">FAT {col.fat} / SNF {col.snf}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className=" text-slate-900 font-mono">₹{col.amount.toFixed(2)}</span>
                          <span className="text-[9px]  text-black tracking-wider">@ ₹{col.rate}/L</span>
                        </div>
                      </td>
                      {role === 'admin' && (
                        <td className="px-6 py-4 text-center whitespace-nowrap">
                          {(() => {
                             const f = farmers.find(far => far.id === col.farmerId);
                             const isSettled = f?.lastSettledDate && col.date <= f.lastSettledDate;
                             return (col.editCount || 0) < 2 && !isSettled && (
                              <button 
                                onClick={() => setEditingCollection(col)}
                                className="p-1.5 bg-slate-100 hover:bg-amber-100 text-black hover:text-amber-600 transition-colors rounded-none"
                                title="Edit Entry"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                             );
                          })()}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">

          </div>
        </div>
      </>
    ) : (
          <div className="xl:col-span-12 bg-white border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-300">
            <div className="p-6 bg-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
               <div>
                  <h3 className="text-sm md:text-base font-bold tracking-tight flex items-center gap-2 text-white">
                    Daily Collection Sheet <InfoTooltip text="Batch Entry Mode: Enter records for all farmers in sequence" />
                  </h3>
                  <button onClick={() => setShowSheetFilters(!showSheetFilters)} className="md:hidden mt-3 w-full flex items-center justify-center gap-2 bg-white/10 text-white/90 py-2 px-4 text-xs font-medium border border-white/20">
                    <Filter className="w-4 h-4" /> {showSheetFilters ? 'Hide Filters' : 'Show Filters'}
                  </button>
               </div>
               <div className={`grid-cols-1 sm:grid-cols-3 gap-4 bg-white/5 p-4 border border-white/10 w-full md:w-auto ${showSheetFilters ? 'grid' : 'hidden md:grid'}`}>
                  <div className="w-full">
                    <label className="text-[10px] text-white/70 block mb-1">{t("entry_date")}</label>
                    <input type="date" className="w-full bg-white/10 border border-white/20 text-xs px-3 py-2 focus:outline-none " value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                  </div>
                  <div className="w-full">
                    <label className="text-[10px] text-white/70 block mb-1">Session</label>
                    <div className="flex bg-white/10 p-1 border border-white/20 w-full">
                      <button onClick={() => setFormData({...formData, session: 'morning'})} className={`flex-1 py-1.5 text-[10px] ${formData.session === 'morning' ? 'bg-white text-slate-900 border border-slate-200' : 'text-white/40'}`}>{t("morning")}</button>
                      <button onClick={() => setFormData({...formData, session: 'evening'})} className={`flex-1 py-1.5 text-[10px] ${formData.session === 'evening' ? 'bg-white text-slate-900 border border-slate-200' : 'text-white/40'}`}>{t("evening")}</button>
                    </div>
                  </div>
                  <div className="w-full">
                    <label className="text-[10px] text-white/70 block mb-1">{t("search")}</label>
                    <div className="relative w-full">
                      <Search className="w-3 h-3 absolute left-3 top-1/2 -translate-y-1/2 text-white/50" />
                      <input 
                        type="text" 
                        placeholder={t("search_placeholder")} 
                        className="w-full bg-white/10 border border-white/20 text-xs pl-8 pr-3 py-2 focus:outline-none  text-white placeholder:text-white/20"
                        value={sheetSearch}
                        onChange={e => setSheetSearch(e.target.value)}
                      />
                    </div>
                  </div>
               </div>
            </div>
            <div className="bg-slate-50 md:bg-white border-t border-slate-100">
              {/* Desktop View */}
              <table className="w-full text-left hidden md:table">
                <thead className="bg-slate-50 text-black text-[11px] border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-5">#Seq</th>
                    <th className="px-6 py-5">Farmer Name</th>
                    <th className="px-6 py-5">Quantity (L)</th>
                    <th className="px-6 py-5">Fat (%)</th>
                    <th className="px-6 py-5">SNF (%)</th>
                    <th className="px-6 py-5">Rate / Amount</th>
                    <th className="px-6 py-5 text-center">{t("status")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {farmers.filter(f => f.name.toLowerCase().includes(sheetSearch.toLowerCase())).map((f, idx) => {
                    const rowData = sheetData[f.id!] || { quantity: '', fat: '', snf: '8.5' };
                    const fat = parseFloat(rowData.fat) || 0;
                    const snf = parseFloat(rowData.snf) || 0;
                    const rate = f.fixedRate ? f.fixedRate : ((fat * settings.peakFatRate / 10) + (snf * 3.5));
                    const amount = (parseFloat(rowData.quantity) || 0) * rate;
                    const isSaved = !!existingSessions[f.id!]?.[formData.session] || (rowData as any).saved;

                    return (
                      <tr key={f.id} className={`transition-all duration-300 ${isSaved ? 'bg-emerald-50/30' : 'hover:bg-slate-50/80'}`}>
                        <td className="px-6 py-4">
                           <span className={`w-6 h-6 flex items-center justify-center  rounded-none text-[10px] ${isSaved ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-black'}`}>
                             {f.sequence || idx + 1}
                           </span>
                        </td>
                        <td className="px-6 py-4">
                          <p className={` tracking-tight text-sm ${isSaved ? 'text-emerald-700' : 'text-slate-900'}`}>{f.name}</p>
                          <p className="text-[10px] text-black  tracking-widest">{f.village}</p>
                        </td>
                        <td className="px-6 py-4">
                          <input 
                            type="number" inputMode="decimal" pattern="[0-9]*" 
                            disabled={isSaved}
                            placeholder="0.0"
                            id={`qty-${idx}`}
                            className="w-24 bg-slate-50 border border-slate-200 px-3 py-2.5  text-black focus:bg-white focus:border-blue-500 outline-none transition-all text-sm disabled:opacity-50"
                            value={rowData.quantity}
                            onKeyDown={(e) => {
                              if (e.key === ' ') {
                                e.preventDefault();
                                document.getElementById(`fat-${idx}`)?.focus();
                              } else if (e.key === 'Enter') {
                                e.preventDefault();
                                handleSaveSheetRow(f.id!);
                                setTimeout(() => {
                                  document.getElementById(`qty-${idx + 1}`)?.focus();
                                }, 100);
                              }
                            }}
                            onChange={(e) => setSheetData({...sheetData, [f.id!]: {...rowData, quantity: e.target.value}})}
                          />
                        </td>
                        <td className="px-6 py-4">
                          <input 
                            type="number" inputMode="decimal" pattern="[0-9]*" 
                            disabled={isSaved}
                            placeholder="0.0"
                            id={`fat-${idx}`}
                            className="w-16 bg-slate-50 border border-slate-200 px-3 py-2.5  text-black focus:bg-white focus:border-blue-500 outline-none transition-all text-sm disabled:opacity-50"
                            value={rowData.fat}
                            onKeyDown={(e) => {
                              if (e.key === ' ') {
                                e.preventDefault();
                                document.getElementById(`snf-${idx}`)?.focus();
                              } else if (e.key === 'Enter') {
                                e.preventDefault();
                                handleSaveSheetRow(f.id!);
                                setTimeout(() => {
                                  document.getElementById(`qty-${idx + 1}`)?.focus();
                                }, 100);
                              }
                            }}
                            onChange={(e) => setSheetData({...sheetData, [f.id!]: {...rowData, fat: e.target.value}})}
                          />
                        </td>
                        <td className="px-6 py-4">
                          <input 
                            type="number" inputMode="decimal" pattern="[0-9]*" 
                            disabled={isSaved}
                            placeholder="8.5"
                            id={`snf-${idx}`}
                            className="w-16 bg-slate-50 border border-slate-200 px-3 py-2.5  text-black focus:bg-white focus:border-blue-500 outline-none transition-all text-sm disabled:opacity-50"
                            value={rowData.snf}
                            onKeyDown={(e) => {
                              if (e.key === ' ' || e.key === 'Enter') {
                                e.preventDefault();
                                handleSaveSheetRow(f.id!);
                                setTimeout(() => {
                                  document.getElementById(`qty-${idx + 1}`)?.focus();
                                }, 100);
                              }
                            }}
                            onChange={(e) => setSheetData({...sheetData, [f.id!]: {...rowData, snf: e.target.value}})}
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className=" text-slate-900 font-mono">₹ {amount.toFixed(2)}</span>
                            <span className="text-[9px]  text-black tracking-wider">@ ₹ {rate.toFixed(2)}/L</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button 
                            disabled={isSaved || !rowData.quantity}
                            onClick={() => handleSaveSheetRow(f.id!)}
                            className={`min-w-[100px] px-4 py-2.5  text-[10px] tracking-wider ${isSaved ? 'bg-emerald-500 text-white cursor-not-allowed' : 'bg-slate-900 text-white hover:bg-blue-600'}`}
                          >
                            {isSaved ? 'Success' : 'Save Record'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Mobile View */}
              <div className="md:hidden p-3 space-y-3">
                 {farmers.filter(f => f.name.toLowerCase().includes(sheetSearch.toLowerCase())).map((f, idx) => {
                    const rowData = sheetData[f.id!] || { quantity: '', fat: '', snf: '8.5' };
                    const fat = parseFloat(rowData.fat) || 0;
                    const snf = parseFloat(rowData.snf) || 0;
                    const rate = f.fixedRate ? f.fixedRate : ((fat * settings.peakFatRate / 10) + (snf * 3.5));
                    const amount = (parseFloat(rowData.quantity) || 0) * rate;
                    const isSaved = !!existingSessions[f.id!]?.[formData.session] || (rowData as any).saved;

                    return (
                       <div key={f.id} className={`p-4 border ${isSaved ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
                          <div className="flex justify-between items-start mb-3">
                             <div className="flex gap-2 items-center">
                               <span className={`w-7 h-7 flex items-center justify-center  rounded-none text-xs ${isSaved ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-black'}`}>
                                 {f.sequence || idx + 1}
                               </span>
                               <div>
                                 <p className={` tracking-tight text-sm ${isSaved ? 'text-emerald-700' : 'text-slate-900'}`}>{f.name}</p>
                                 <p className="text-[10px] text-black  tracking-widest">{f.village}</p>
                               </div>
                             </div>
                             <div className="text-right">
                               <span className=" text-slate-900 font-mono block">₹ {amount.toFixed(2)}</span>
                               <span className="text-[9px]  text-black tracking-wider block">@ ₹ {rate.toFixed(2)}/L</span>
                             </div>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-2 mb-3">
                             <div>
                               <label className="text-[9px]  text-black block mb-1">Qty (L)</label>
                               <input 
                                 type="number" inputMode="decimal" pattern="[0-9]*" 
                                 disabled={isSaved}
                                 placeholder="0.0"
                                 id={`m-qty-${idx}`}
                                 className="w-full bg-slate-50 border border-slate-200 px-3 py-2.5  text-black focus:bg-white focus:border-blue-500 outline-none transition-all text-sm disabled:opacity-50 text-center"
                                 value={rowData.quantity}
                                 onKeyDown={(e) => {
                                   if (e.key === ' ' || e.key === 'Enter') {
                                     e.preventDefault();
                                     document.getElementById(`m-fat-${idx}`)?.focus();
                                   }
                                 }}
                                 onChange={(e) => setSheetData({...sheetData, [f.id!]: {...rowData, quantity: e.target.value}})}
                               />
                             </div>
                             <div>
                               <label className="text-[9px]  text-black block mb-1">Fat (%)</label>
                               <input 
                                 type="number" inputMode="decimal" pattern="[0-9]*" 
                                 disabled={isSaved}
                                 placeholder="0.0"
                                 id={`m-fat-${idx}`}
                                 className="w-full bg-slate-50 border border-slate-200 px-3 py-2.5  text-black focus:bg-white focus:border-blue-500 outline-none transition-all text-sm disabled:opacity-50 text-center"
                                 value={rowData.fat}
                                 onKeyDown={(e) => {
                                   if (e.key === ' ' || e.key === 'Enter') {
                                     e.preventDefault();
                                     document.getElementById(`m-snf-${idx}`)?.focus();
                                   }
                                 }}
                                 onChange={(e) => setSheetData({...sheetData, [f.id!]: {...rowData, fat: e.target.value}})}
                               />
                             </div>
                             <div>
                               <label className="text-[9px]  text-black block mb-1">SNF (%)</label>
                               <input 
                                 type="number" inputMode="decimal" pattern="[0-9]*" 
                                 disabled={isSaved}
                                 placeholder="8.5"
                                 id={`m-snf-${idx}`}
                                 className="w-full bg-slate-50 border border-slate-200 px-3 py-2.5  text-black focus:bg-white focus:border-blue-500 outline-none transition-all text-sm disabled:opacity-50 text-center"
                                 value={rowData.snf}
                                 onKeyDown={(e) => {
                                   if (e.key === ' ' || e.key === 'Enter') {
                                     e.preventDefault();
                                     handleSaveSheetRow(f.id!);
                                     setTimeout(() => {
                                       document.getElementById(`m-qty-${idx + 1}`)?.focus();
                                     }, 100);
                                   }
                                 }}
                                 onChange={(e) => setSheetData({...sheetData, [f.id!]: {...rowData, snf: e.target.value}})}
                               />
                             </div>
                          </div>
                          
                          <button 
                            disabled={isSaved || !rowData.quantity}
                            onClick={() => handleSaveSheetRow(f.id!)}
                            className={`w-full py-3  text-xs tracking-wider ${isSaved ? 'bg-emerald-500 text-white cursor-not-allowed' : 'bg-slate-900 text-white hover:bg-blue-600'}`}
                          >
                            {isSaved ? 'Saved Successfully' : 'Save Record'}
                          </button>
                       </div>
                    );
                 })}
              </div>
              {farmers.length === 0 && (
                <div className="p-20 text-center text-slate-300  tracking-widest text-xs">No farmers available for batch entry.</div>
              )}
            </div>
          </div>
        )}
      </div>

      <EditMilkModal 
        isOpen={!!editingCollection} 
        collection={editingCollection} 
        onClose={() => setEditingCollection(null)} 
        onSuccess={() => {
          setEditingCollection(null);
        }} 
      />
    </div>
  );
}

