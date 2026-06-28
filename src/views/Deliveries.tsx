import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useI18n } from '../lib/i18n';
import { db } from '../lib/db';
import { useAuth } from '../lib/auth';
import { collection, addDoc, getDocs, onSnapshot, query, orderBy, limit, deleteDoc, doc, where, increment, updateDoc, writeBatch } from 'firebase/firestore';
import { Customer, MilkDelivery } from '../types';
import { Plus, History, Sun, Moon, Save, Search, Edit2, X, Filter } from 'lucide-react';
import dayjs from 'dayjs';
import InfoTooltip from '../components/InfoTooltip';
import EditDeliveryModal from '../components/EditDeliveryModal';

export default function Deliveries() {
  const { user , tenantId } = useAuth();
  const { t } = useI18n();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [recentDeliveries, setRecentDeliveries] = useState<MilkDelivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    customerId: '',
    date: dayjs().format('YYYY-MM-DD'),
    session: 'morning' as 'morning' | 'evening',
    quantity: '',
    rate: '',
    amount: 0
  });

  const [viewMode, setViewMode] = useState<'form' | 'sheet' | 'cash'>('form');
  const [sheetSearch, setSheetSearch] = useState('');
  const [editingDelivery, setEditingDelivery] = useState<MilkDelivery | null>(null);
  const [showSheetFilters, setShowSheetFilters] = useState(false);
  const [sheetData, setSheetData] = useState<Record<string, { quantity: string, rate: string }>>({});
  const [existingSessions, setExistingSessions] = useState<Record<string, Set<'morning' | 'evening'>>>({});

  useEffect(() => {
    if (!tenantId) return;
    setLoading(true);
    const unsubCustomers = onSnapshot(query(collection(db, 'customers'), where('userId', '==', tenantId)), (snap) => {
      const cusList = snap.docs.map(d => ({ id: d.id, ...d.data() } as Customer));
      cusList.sort((a, b) => (a.sequence || 0) - (b.sequence || 0) || a.name.localeCompare(b.name));
      setCustomers(cusList);

      setSheetData(prev => {
        if (Object.keys(prev).length === 0) {
          const initialSheet: Record<string, { quantity: string, rate: string }> = {};
          cusList.forEach(c => {
            initialSheet[c.id!] = {
              quantity: c.fixedQty?.toString() || '',
              rate: c.defaultRate?.toString() || ''
            };
          });
          return initialSheet;
        }
        return prev;
      });
    });

    const qDel = query(collection(db, 'milk_deliveries'), where('userId', '==', tenantId), orderBy('date', 'desc'), limit(100));
    const unsubDels = onSnapshot(qDel, (snap) => {
      const dels = snap.docs.map(d => ({ id: d.id, ...d.data() } as MilkDelivery));
      dels.sort((a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime());
      setRecentDeliveries(dels.slice(0, 10));
    });

    setLoading(false);
    return () => {
      unsubCustomers();
      unsubDels();
    };
  }, [tenantId]);

  useEffect(() => {
    if (!tenantId) return;
    if (!formData.date) return;
    const unsubSessions = onSnapshot(query(collection(db, 'milk_deliveries'), where('userId', '==', tenantId), where('date', '==', formData.date)), (snap) => {
      const sessions: Record<string, Set<'morning' | 'evening'>> = {};
      snap.docs.forEach(d => {
        const data = d.data();
        if (!sessions[data.customerId]) {
          sessions[data.customerId] = new Set();
        }
        sessions[data.customerId].add(data.session);
      });
      setExistingSessions(sessions);
    });
    return () => unsubSessions();
  }, [formData.date, tenantId]);

  async function handleSaveSheetRow(customerId: string) {
    const data = sheetData[customerId];
    if (!data.quantity || !data.rate) return;

    try {
      // Duplicate session check
      const customerSessions = existingSessions[customerId] || new Set();
      if (customerSessions.has(formData.session)) {
        toast.error("Session data already exists for this customer.");
        return;
      }

      const qty = parseFloat(data.quantity);
      const rate = parseFloat(data.rate);
      const amount = qty * rate;

      const customer = customers.find(c => c.id === customerId);

      const batch = writeBatch(db);
      const deliveryRef = doc(collection(db, 'milk_deliveries'));
      const customerRef = doc(db, 'customers', customerId);

      batch.set(deliveryRef, {
        customerId,
        customerName: customer?.name,
        date: formData.date,
        session: formData.session,
        quantity: qty,
        rate,
        amount,
        createdAt: new Date().toISOString(),
        userId: tenantId
      });

      batch.update(customerRef, { balance: increment(amount) });
      batch.commit().catch(e => {
        console.error("Batch commit failed: ", e);
        toast.error("Failed to sync dispatch: " + e.message);
      });

      setSheetData(prev => ({
        ...prev,
        [customerId]: { ...prev[customerId], saved: true } as any
      }));
      toast.success(`Dispatch saved for ${customer?.name || 'Customer'}!`);
    } catch (e) { 
      console.error(e);
      toast.error("Error saving dispatch: " + (e as any).message);
    }
  }

  useEffect(() => {
    setFormData(prev => ({ ...prev, amount: (parseFloat(prev.quantity) || 0) * (parseFloat(prev.rate) || 0) }));
  }, [formData.quantity, formData.rate]);

  async function handleSave(moveToNext = true) {
    if (viewMode === 'cash') {
      if (!formData.quantity) return;
      try {
        const data = {
          ...formData,
          customerId: 'CASH_SALE',
          customerName: 'Counter Cash Sale',
          quantity: parseFloat(formData.quantity) || 0,
          rate: parseFloat(formData.rate) || 0,
          createdAt: new Date().toISOString(),
          userId: tenantId
        };
        addDoc(collection(db, 'milk_deliveries'), data).catch(e => {
          console.error("Error saving cash sale: ", e);
          toast.error("Failed to sync cash sale: " + e.message);
        });
        
        setFormData({
          ...formData,
          quantity: '',
          session: 'morning',
          amount: 0
        });
        setShowForm(false);
        toast.success('Cash sale saved!');
        return;
      } catch (e) {
        console.error(e);
        toast.error("Error saving cash sale: " + (e as any).message);
        return;
      }
    }

    if (!formData.customerId || !formData.quantity) return;
    try {
      // Final duplicate check
      const customerSessions = existingSessions[formData.customerId] || new Set();
      if (formData.customerId !== 'CASH_SALE' && customerSessions.has(formData.session)) {
        toast.error(`${formData.session.toUpperCase()} data already exists for this customer.`);
        return;
      }

      const data = {
        ...formData,
        quantity: parseFloat(formData.quantity) || 0,
        rate: parseFloat(formData.rate) || 0,
        customerName: customers.find(c => c.id === formData.customerId)?.name,
        createdAt: new Date().toISOString(),
        userId: tenantId
      };
      const batch = writeBatch(db);
      const deliveryRef = doc(collection(db, 'milk_deliveries'));
      const customerRef = doc(db, 'customers', formData.customerId);

      batch.set(deliveryRef, data);
      batch.update(customerRef, { balance: increment(data.amount) });
      batch.commit().catch(e => {
        console.error("Batch commit failed: ", e);
        toast.error("Failed to sync dispatch: " + e.message);
      });

      if (moveToNext) {
        // Find Next Customer in sequence
        const currentIdx = customers.findIndex(c => c.id === formData.customerId);
        const nextCustomer = customers[currentIdx + 1];

        setFormData({
          ...formData,
          customerId: nextCustomer ? nextCustomer.id! : '',
          quantity: '',
          amount: 0
        });
      } else {
        setFormData({
          ...formData,
          quantity: '',
          amount: 0
        });
      }
      setShowForm(false);
      toast.success('Sale recorded!');
    } catch (e) { 
      console.error(e);
      toast.error("Error saving delivery: " + (e as any).message);
    }
  }

  useEffect(() => {
    if (formData.customerId) {
      const customer = customers.find(c => c.id === formData.customerId);
      if (customer) {
        const customerSessions = existingSessions[formData.customerId] || new Set();
        const hasMorning = customerSessions.has('morning');
        const hasEvening = customerSessions.has('evening');

        setFormData(prev => ({ 
          ...prev, 
          session: (hasMorning && !hasEvening) ? 'evening' : 
                   (hasEvening && !hasMorning) ? 'morning' : prev.session,
          rate: customer.defaultRate ? customer.defaultRate.toString() : prev.rate 
        }));
      }
    }
  }, [formData.customerId, customers, existingSessions]);

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex items-center justify-between w-full md:w-auto">
          <div>
            <h2 className="text-xl text-slate-900 tracking-tight flex items-center gap-2">{t('deliveries')} <InfoTooltip text="Record milk sold/delivered to customers or walk-in sales." /></h2>

          </div>
          {(viewMode === 'form' || viewMode === 'cash') && (
            <button 
              onClick={() => setShowForm(true)}
              className="xl:hidden bg-slate-900 text-white px-3 py-2 text-[10px] tracking-widest flex items-center gap-1 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" /> {t('add_item')}
            </button>
          )}
        </div>

        {/* Entry Mode Switcher */}
        <div className="grid grid-cols-3 gap-1 md:gap-2 mt-2 md:mt-0 w-full md:w-auto">
            <button 
              onClick={() => setViewMode('form')}
              className={`px-1 py-2 md:px-4 md:py-3 text-[10px] md:text-xs tracking-tight md:tracking-wider transition-all flex flex-col md:flex-row items-center justify-center gap-1 md:gap-1.5 ${viewMode === 'form' ? 'bg-emerald-600 text-white' : 'bg-white text-black border border-slate-200 md:border-slate-100'}`}
            >
              <span className="text-center leading-tight">{t('customer_sale')}</span>
              <div className="hidden lg:block"><InfoTooltip text="For regular registered customers with a full detail account." /></div>
            </button>
            <button 
              onClick={() => setViewMode('sheet')}
              className={`px-1 py-2 md:px-4 md:py-3 text-[10px] md:text-xs tracking-tight md:tracking-wider transition-all flex flex-col md:flex-row items-center justify-center gap-1 md:gap-1.5 ${viewMode === 'sheet' ? 'bg-emerald-600 text-white' : 'bg-white text-black border border-slate-200 md:border-slate-100'}`}
            >
              <span className="text-center leading-tight">{t('quick_dispatch')}</span>
              <div className="hidden lg:block"><InfoTooltip text="Quickly enter daily fixed quantity deliveries for all customers." /></div>
            </button>
            <button 
              onClick={() => setViewMode('cash')}
              className={`px-1 py-2 md:px-4 md:py-3 text-[10px] md:text-xs tracking-tight md:tracking-wider transition-all flex flex-col md:flex-row items-center justify-center gap-1 md:gap-1.5 ${viewMode === 'cash' ? 'bg-violet-600 text-white' : 'bg-white text-black border border-slate-200 md:border-slate-100'}`}
            >
              <span className="text-center leading-tight">{t('cash_sale')}</span>
              <div className="hidden lg:block"><InfoTooltip text="Walk-in sales without maintaining a customer full detail." /></div>
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">

        {viewMode === 'form' || viewMode === 'cash' ? (
          <>
            {/* Entry Form - Left Section */}
            <div className={`xl:col-span-4 xl:sticky xl:top-4 ${showForm ? 'block' : 'hidden xl:block'}`}>
          <div className={`bg-white rounded-none border border-slate-100 overflow-hidden relative ${viewMode === 'cash' ? 'ring-2 ring-violet-600/50' : ''}`}>
            <button 
              onClick={() => setShowForm(false)} 
              className="xl:hidden absolute top-4 right-4 text-white hover:text-slate-200 z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <div className={`${viewMode === 'cash' ? 'bg-violet-600' : 'bg-emerald-600'} p-6 text-white`}>
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 bg-white/20 rounded-none flex items-center justify-center">
                  <Plus className="w-5 h-5" />
                </div>
                <div className="text-right">
                  <p className="text-[10px] tracking-tight  opacity-70 mb-0.5">{t('total_bill')}</p>
                  <h4 className="text-2xl ">₹ {formData.amount.toFixed(2)}</h4>
                </div>
              </div>
              <h3 className="text-lg  tracking-tight">{t('new_delivery')}</h3>
              <p className="text-emerald-100 text-[10px]  tracking-tight opacity-80 mt-0.5">{t('sale_information')}</p>
            </div>

            <div className="p-4 space-y-4">
              <div className="space-y-3">
                {viewMode === 'form' ? (
                  <div>
                    <label className="text-[10px]  text-black tracking-tight block mb-1">{t('customer')}</label>
                    <select 
                      className="w-full bg-slate-50 border border-slate-200 rounded-none px-3 py-3 focus:ring-1 focus:ring-emerald-500 outline-none transition-all appearance-none  text-black text-xs"
                      value={formData.customerId}
                      onChange={(e) => setFormData({...formData, customerId: e.target.value})}
                    >
                      <option value="">{t('select_customer')}</option>
                      {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                ) : (
                  <div className="bg-amber-50 border border-amber-200 p-3 rounded-none">
                    <p className="text-amber-800  text-xs flex items-center gap-2">
                      <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
                      {t('counter_cash_sale', 'Counter / Cash Sale')}
                    </p>
                    <p className="text-[10px] text-amber-600  mt-1 tracking-tight">{t('cash_sale_desc', 'Record direct sales where no ledger balance is maintained. Useful for walk-in customers.')}</p>
                  </div>
                )}

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
                        className={`flex items-center justify-center gap-2 py-1.5 rounded-none text-[10px] ${formData.session === 'morning' ? 'bg-white text-emerald-600 border border-slate-200' : 'text-black'}`}
                      >
                        <Sun className="w-3 h-3" /> {t('morning')}
                      </button>
                      <button 
                        onClick={() => setFormData({...formData, session: 'evening'})}
                        className={`flex items-center justify-center gap-2 py-1.5 rounded-none text-[10px] ${formData.session === 'evening' ? 'bg-white text-emerald-600 border border-slate-200' : 'text-black'}`}
                      >
                        <Moon className="w-3 h-3" /> {t('evening')}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px]  text-black tracking-tight block mb-1">{t('quantity_l')}</label>
                    <input type="number" inputMode="decimal" pattern="[0-9]*" placeholder="0.0" className="w-full bg-slate-50 border border-slate-200 rounded-none px-3 py-3 text-base  text-black" value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[10px]  text-black tracking-tight block mb-1">{t('rate_l')}</label>
                    <input type="number" inputMode="decimal" pattern="[0-9]*" placeholder="0.00" className="w-full bg-slate-100 border border-slate-200 rounded-none px-3 py-3 text-base  text-emerald-600" value={formData.rate} onChange={e => setFormData({...formData, rate: e.target.value})} />
                  </div>
                </div>
              </div>

              {viewMode === 'cash' ? (
                <button onClick={() => handleSave(true)} className="w-full px-4 py-4 rounded-none text-xs tracking-wider transition flex items-center justify-center gap-3 bg-violet-600 hover:bg-violet-700 text-white">
                  <Save className="w-5 h-5" /> {t('save_cash_sale')}
                </button>
              ) : (
                <div className="flex gap-2">
                  <button onClick={() => handleSave(false)} className="flex-1 px-4 py-3 rounded-none text-xs tracking-wider border border-slate-200 text-slate-700 hover:bg-slate-50 transition flex items-center justify-center gap-2 font-medium">
                    <Save className="w-4 h-4" /> {t('save')}
                  </button>
                  <button onClick={() => handleSave(true)} className="flex-2 px-4 py-3 rounded-none text-xs tracking-wider bg-slate-900 text-white hover:bg-black transition flex items-center justify-center gap-2 font-medium">
                    <Save className="w-4 h-4" /> {t('save_next')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* History Section - Right Section */}
        <div className="xl:col-span-8 text-xs">
          <div className="bg-white rounded-none border border-slate-100 overflow-hidden">
            <div className="p-4 border-b border-slate-50 flex items-center justify-between">
              <h3 className="text-sm  flex items-center gap-2 tracking-tight text-emerald-600">
                <History className="w-4 h-4" />
                {t('latest_deliveries')}
              </h3>
            </div>
            <div className="max-h-[calc(100vh-220px)] md:max-h-[600px] overflow-y-auto overflow-x-auto no-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50/50 text-black text-[9px] tracking-widest  sticky top-0 z-10 backdrop-blur-sm">
                  <tr>
                    <th className="px-6 py-4 whitespace-nowrap">{t('date')}</th>
                    <th className="px-6 py-4 whitespace-nowrap">{t('customer')}</th>
                    <th className="px-6 py-4 text-center whitespace-nowrap">{t('session_qty')}</th>
                    <th className="px-6 py-4 text-right whitespace-nowrap">{t('amount')}</th>
                    {user?.role === 'admin' && <th className="px-6 py-4 text-center whitespace-nowrap">{t('action')}</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-black">
                  {recentDeliveries.map(del => (
                    <tr key={del.id} className={del.customerId === 'CASH_SALE' ? 'bg-amber-50/30' : ''}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="">{del.date}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className=" text-slate-900 flex items-center gap-2">
                          {del.customerName}
                          {del.customerId === 'CASH_SALE' && (
                            <span className="bg-amber-100 text-amber-700 text-[8px] px-1.5 py-0.5 tracking-widest ">{t('cash', 'Cash')}</span>
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        <div className="flex flex-col items-center">
                          <span className={`text-[9px]  mb-0.5 ${del.session === 'morning' ? 'text-amber-500' : 'text-indigo-500'}`}>{del.session === 'morning' ? t('morning') : t('evening')}</span>
                          <span className=" text-slate-900">{del.quantity} L</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className=" text-slate-900 font-mono">₹{del.amount}</span>
                          <span className="text-[9px]  text-black tracking-wider">@ ₹{del.rate}/L</span>
                        </div>
                      </td>
                      {user?.role === 'admin' && (
                        <td className="px-6 py-4 text-center whitespace-nowrap">
                          {(() => {
                             const c = customers.find(cus => cus.id === del.customerId);
                             const isSettled = c?.lastSettledDate && del.date <= c.lastSettledDate;
                             
                             if (del.customerId === 'CASH_SALE') {
                                return <span className="text-[10px] text-black opacity-50 uppercase">{t('no_edit', 'No Edit')}</span>;
                             }
                             if (isSettled) {
                                return <span className="text-[10px] text-amber-600 uppercase">{t('settled', 'Settled')}</span>;
                             }
                             return (
                                <button 
                                  onClick={() => setEditingDelivery(del)}
                                  disabled={(del.editCount || 0) >= 2}
                                  className="p-2 bg-slate-100 text-black hover:bg-slate-200 disabled:opacity-30"
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
              {recentDeliveries.length === 0 && (
                <div className="p-12 text-center text-black  text-[10px] tracking-widest">{t('no_recent_deliveries')}</div>
              )}
            </div>
          </div>
        </div>
          </>
        ) : viewMode === 'sheet' ? (
          <div className="xl:col-span-12 bg-white border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-300">
            <div className="p-6 bg-slate-50 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
               <div>
                  <h3 className="text-sm md:text-base font-bold tracking-tight flex items-center gap-2 text-slate-900">
                    {t('daily_dispatch_sheet', 'Daily Dispatch Route Sheet')} <InfoTooltip text={t('dispatch_tooltip', 'Confirm deliveries based on customer fixed quantities')} />
                  </h3>
                  <button onClick={() => setShowSheetFilters(!showSheetFilters)} className="md:hidden mt-3 w-full flex items-center justify-center gap-2 bg-slate-100 text-slate-700 py-2 px-4 text-xs font-medium border border-slate-200">
                    <Filter className="w-4 h-4" /> {showSheetFilters ? t('hide_filters', 'Hide Filters') : t('show_filters', 'Show Filters')}
                  </button>
               </div>
                <div className={`flex flex-col md:flex-row items-stretch md:items-center gap-4 bg-white p-3 border border-slate-200 w-full md:w-auto ${showSheetFilters ? 'flex' : 'hidden md:flex'}`}>
                  <div className="flex-1 md:flex-none">
                    <label className="text-[10px]  text-black block mb-1">{t('dispatch_date', 'Dispatch Date')}</label>
                    <input type="date" className="w-full md:w-auto bg-slate-50 border border-slate-200 text-black text-xs px-3 py-1.5 focus:outline-none " value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                  </div>
                  <div className="flex-1 md:flex-none">
                    <label className="text-[10px]  text-black block mb-1">{t('session')}</label>
                    <div className="flex bg-slate-50 p-1 border border-slate-200">
                      <button onClick={() => setFormData({...formData, session: 'morning'})} className={`flex-1 md:flex-none px-4 py-1 text-[11px] ${formData.session === 'morning' ? 'bg-white text-emerald-700 border border-slate-200' : 'text-black hover:text-black'}`}>{t('morning')}</button>
                      <button onClick={() => setFormData({...formData, session: 'evening'})} className={`flex-1 md:flex-none px-4 py-1 text-[11px] ${formData.session === 'evening' ? 'bg-white text-emerald-700 border border-slate-200' : 'text-black hover:text-black'}`}>{t('evening')}</button>
                    </div>
                  </div>
                  <div className="flex-1 md:flex-none">
                    <label className="text-[10px] text-black block mb-1">{t('search_customer', 'Search Customer')}</label>
                    <div className="relative">
                      <Search className="w-3 h-3 absolute left-3 top-1/2 -translate-y-1/2 text-black" />
                      <input 
                        type="text" 
                        placeholder="Search..." 
                        className="w-full md:w-auto bg-slate-50 border border-slate-200 text-xs pl-8 pr-3 py-1.5 focus:outline-none  text-black placeholder:text-black"
                        value={sheetSearch}
                        onChange={e => setSheetSearch(e.target.value)}
                      />
                    </div>
                  </div>
               </div>
            </div>
            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-left">
                <thead className="bg-slate-100 text-black text-[10px] md:text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="px-3 md:px-6 py-4 md:py-5 whitespace-nowrap">{t('seq_no', '#Seq')}</th>
                    <th className="px-3 md:px-6 py-4 md:py-5 whitespace-nowrap">{t('customer_name', 'Customer Name')}</th>
                    <th className="px-3 md:px-6 py-4 md:py-5 whitespace-nowrap">{t('delivery_qty', 'Delivery Qty (L)')}</th>
                    <th className="px-3 md:px-6 py-4 md:py-5 whitespace-nowrap">{t('current_rate', 'Current Rate (₹/L)')}</th>
                    <th className="px-3 md:px-6 py-4 md:py-5 whitespace-nowrap">{t('total_amount')}</th>
                    <th className="px-3 md:px-6 py-4 md:py-5 whitespace-nowrap text-center">{t('status_confirm', 'Status / Confirm')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {customers.filter(c => c.name.toLowerCase().includes(sheetSearch.toLowerCase())).map((c, idx) => {
                    const rowData = sheetData[c.id!] || { quantity: '', rate: '' };
                    const qty = parseFloat(rowData.quantity) || 0;
                    const rate = parseFloat(rowData.rate) || 0;
                    const amount = qty * rate;
                    const isSaved = (rowData as any).saved;

                    return (
                      <tr key={c.id} className={`${isSaved ? 'bg-emerald-50/30' : 'hover:bg-slate-50/80'}`}>
                        <td className="px-3 md:px-6 py-3 md:py-4 whitespace-nowrap">
                           <span className={`w-6 h-6 flex items-center justify-center  rounded-none text-[10px] ${isSaved ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-black'}`}>
                             {c.sequence || idx + 1}
                           </span>
                        </td>
                        <td className="px-3 md:px-6 py-3 md:py-4 whitespace-nowrap">
                          <p className={` tracking-tight text-sm ${isSaved ? 'text-emerald-700' : 'text-slate-900'}`}>{c.name}</p>
                          <p className="text-[10px] text-black  tracking-widest">{c.mobile}</p>
                        </td>
                        <td className="px-3 md:px-6 py-3 md:py-4 whitespace-nowrap">
                          <input 
                            type="number" inputMode="decimal" pattern="[0-9]*" 
                            disabled={isSaved}
                            placeholder="0.0"
                            id={`del-qty-${idx}`}
                            className="w-20 md:w-24 bg-slate-50 border border-slate-200 px-2 md:px-3 py-2 md:py-2.5  text-black focus:bg-white focus:border-emerald-500 outline-none text-sm disabled:opacity-50"
                            value={rowData.quantity}
                            onKeyDown={(e) => {
                              if (e.key === ' ') {
                                e.preventDefault();
                                document.getElementById(`del-rate-${idx}`)?.focus();
                              } else if (e.key === 'Enter') {
                                e.preventDefault();
                                handleSaveSheetRow(c.id!);
                                setTimeout(() => {
                                  document.getElementById(`del-qty-${idx + 1}`)?.focus();
                                }, 100);
                              }
                            }}
                            onChange={(e) => setSheetData({...sheetData, [c.id!]: {...rowData, quantity: e.target.value}})}
                          />
                        </td>
                        <td className="px-3 md:px-6 py-3 md:py-4 whitespace-nowrap">
                          <input 
                            type="number" inputMode="decimal" pattern="[0-9]*" 
                            disabled={isSaved}
                            placeholder="0.0"
                            id={`del-rate-${idx}`}
                            className="w-16 bg-slate-50 border border-slate-200 px-2 md:px-3 py-2 md:py-2.5  text-black focus:bg-white focus:border-emerald-500 outline-none text-sm disabled:opacity-50"
                            value={rowData.rate}
                            onKeyDown={(e) => {
                              if (e.key === ' ' || e.key === 'Enter') {
                                e.preventDefault();
                                handleSaveSheetRow(c.id!);
                                setTimeout(() => {
                                  document.getElementById(`del-qty-${idx + 1}`)?.focus();
                                }, 100);
                              }
                            }}
                            onChange={(e) => setSheetData({...sheetData, [c.id!]: {...rowData, rate: e.target.value}})}
                          />
                        </td>
                        <td className="px-3 md:px-6 py-3 md:py-4 whitespace-nowrap">
                           <span className="text-sm md:text-base text-slate-900 font-mono">₹ {amount.toFixed(2)}</span>
                        </td>
                        <td className="px-3 md:px-6 py-3 md:py-4 whitespace-nowrap text-center">
                          <button 
                            disabled={isSaved || !rowData.quantity}
                            onClick={() => handleSaveSheetRow(c.id!)}
                             className={`min-w-[100px] px-4 py-2.5  text-[10px] tracking-wider ${isSaved ? 'bg-emerald-500 text-white cursor-not-allowed' : 'bg-slate-900 text-white hover:bg-emerald-600'}`}
                          >
                            {isSaved ? t('confirmed', 'Confirmed') : t('confirm_box', 'Confirm Box')}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </div>

      <EditDeliveryModal 
        isOpen={!!editingDelivery}
        onClose={() => setEditingDelivery(null)}
        delivery={editingDelivery}
        onSuccess={() => {
          toast.success('Delivery entry updated successfully!');
          setEditingDelivery(null);
        }}
      />
    </div>
  );
}


