import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useI18n } from '../lib/i18n';
import { useAuth } from '../lib/auth';
import { db } from '../lib/firebase';
import { collection, where, addDoc, onSnapshot, query, deleteDoc, doc } from 'firebase/firestore';
import { Expense } from '../types';
import { Trash2, Wallet, Fuel, Lightbulb, Users, Settings, Save, Plus, X } from 'lucide-react';
import { format } from 'date-fns';
import InfoTooltip from '../components/InfoTooltip';

export default function Expenses() {
  const { t } = useI18n();
  const { tenantId } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    category: 'Fuel',
    amount: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    description: '',
    method: 'Cash'
  });

  useEffect(() => {
    if (!tenantId) return;
    setLoading(true);
    const q = query(collection(db, 'expenses'), where('userId', '==', tenantId));
    const unsubscribe = onSnapshot(q, (snap) => {
      const sorted = snap.docs.map(d => ({ id: d.id, ...d.data() } as Expense))
        .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      setExpenses(sorted);
      setLoading(false);
    }, (error) => {
      console.error(error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [tenantId]);

  async function handleSave() {
    if (!formData.amount) return;
    try {
      await addDoc(collection(db, 'expenses'), {
        ...formData,
        amount: parseFloat(formData.amount) || 0,
        userId: tenantId
      });
      setFormData({ ...formData, amount: '', description: '' });
      setShowForm(false);
      toast.success('Expense recorded!');
    } catch (e) {
      console.error(e);
      toast.error('Expense Error: ' + (e as any).message);
    }
  }

  const categories = ['Fuel', 'Maintenance', 'Labor', 'Electricity', 'Miscellaneous', 'Inventory Purchase'];
  const getIcon = (cat: string) => {
    switch (cat) {
      case 'Fuel': return Fuel;
      case 'Electricity': return Lightbulb;
      case 'Labor': return Users;
      case 'Maintenance': return Settings;
      default: return Wallet;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            {t('expenses')} <InfoTooltip text="Track daily business expenses like fuel, feed, and salaries." />
          </h2>

        </div>
        <button 
          onClick={() => setShowForm(true)}
          className="xl:hidden bg-slate-900 text-white px-3 py-2 text-[10px] uppercase tracking-widest flex items-center gap-1 shrink-0"
        >
          <Plus className="w-3.5 h-3.5" /> {t('add_expense')}
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
        {/* Entry Form */}
        <div className={`xl:col-span-4 xl:sticky xl:top-4 ${showForm ? 'block' : 'hidden xl:block'}`}>
          <div className="bg-white rounded-none border border-slate-200 overflow-hidden relative">
            <button 
              onClick={() => setShowForm(false)} 
              className="xl:hidden absolute top-4 right-4 text-white hover:text-slate-200 z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="bg-red-600 p-4 text-white">
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 bg-white/20 rounded-none flex items-center justify-center">
                  <Wallet className="w-5 h-5" />
                </div>
                <div className="text-right">
                  <p className="text-[10px] opacity-60 mb-0.5">{t('new_voucher')}</p>
                  <h4 className="text-xl">₹ {parseFloat(formData.amount || '0').toLocaleString()}</h4>
                </div>
              </div>
              <h3 className="text-lg">{t('record_expense')}</h3>
            </div>

            <div className="p-4 space-y-3">
              <div>
                <label className="text-[10px] text-black tracking-tight block mb-1">{t('category')}</label>
                <select
                  className="w-full bg-slate-50 border border-slate-100 rounded-none px-3 py-2.5 focus:ring-2 focus:ring-red-500 outline-none text-black text-sm"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[10px] text-black tracking-tight block mb-1">{t('amount_rs')}</label>
                <input
                  type="number" inputMode="decimal" pattern="[0-9]*"
                  placeholder="0.00"
                  className="w-full bg-slate-50 border border-slate-100 rounded-none px-3 py-2.5 text-lg text-black outline-none focus:ring-2 focus:ring-red-500"
                  value={formData.amount}
                  onChange={e => setFormData({ ...formData, amount: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-black tracking-tight block mb-1">{t('date')}</label>
                  <input
                    type="date"
                    className="w-full bg-slate-50 border border-slate-100 rounded-none px-3 py-2.5 text-black text-sm outline-none focus:ring-2 focus:ring-red-500"
                    value={formData.date}
                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-[10px] text-black tracking-tight block mb-1">{t('method')}</label>
                  <select
                    className="w-full bg-slate-50 border border-slate-100 rounded-none px-3 py-2.5 focus:ring-2 focus:ring-red-500 outline-none text-black text-sm"
                    value={formData.method}
                    onChange={(e) => setFormData({ ...formData, method: e.target.value })}
                  >
                    <option value="Cash">Cash</option>
                    <option value="Bank">Bank Transfer</option>
                    <option value="UPI">UPI / GPay</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-black tracking-tight block mb-1">{t('description')}</label>
                <textarea
                  placeholder={t('purpose_of_expense')}
                  className="w-full p-3 bg-slate-50 border border-slate-100 rounded-none outline-none focus:ring-2 focus:ring-red-500 min-h-[70px] text-sm"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <button
                onClick={handleSave}
                className="w-full px-4 py-3 rounded-none bg-slate-900 text-white hover:bg-black flex items-center justify-center gap-2 text-sm"
              >
                <Save className="w-4 h-4" /> {t('save_voucher')}
              </button>
            </div>
          </div>
        </div>

        {/* Expense History List */}
        <div className="xl:col-span-8">
          <div className="bg-white border border-slate-200 divide-y divide-slate-100 max-h-[calc(100vh-220px)] md:max-h-[600px] overflow-y-auto custom-scrollbar">
            <div className="px-4 py-2.5 bg-slate-50 flex items-center justify-between sticky top-0 z-10">
              <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">{t('expense_history')}</span>
              <span className="text-[10px] text-slate-400">{expenses.length} {t('records')}</span>
            </div>
            {loading ? (
              <div className="py-10 text-center text-xs text-slate-400 uppercase tracking-widest">Loading...</div>
            ) : expenses.length === 0 ? (
              <div className="py-12 text-center">
                <Wallet className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                <p className="text-black text-xs uppercase tracking-widest">{t('no_expenses_recorded')}</p>
              </div>
            ) : expenses.map(exp => {
              const Icon = getIcon(exp.category);
              return (
                <div key={exp.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors">
                  <div className="p-2 bg-slate-100 text-slate-600 rounded-none shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-xs font-bold text-black">₹{exp.amount.toLocaleString()}</p>
                      <span className="text-[8px] uppercase tracking-widest text-black bg-slate-100 px-1.5 py-0.5">{exp.category}</span>
                      <span className="text-[8px] text-black">{(exp as any).method || 'Cash'}</span>
                    </div>
                    {exp.description && (
                      <p className="text-[10px] text-black truncate mt-0.5">{exp.description}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <p className="text-[9px] text-black whitespace-nowrap">{exp.date}</p>
                    <button
                      onClick={async () => {
                        if (confirm('Delete this expense?')) {
                          try {
                            await deleteDoc(doc(db, 'expenses', exp.id!));
                            toast.success('Deleted');
                          } catch (e) {
                            toast.error('Error deleting');
                          }
                        }
                      }}
                      className="mt-1 p-1 text-slate-300 hover:text-red-500 transition-colors block ml-auto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

