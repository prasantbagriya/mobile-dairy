import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useI18n } from '../lib/i18n';
import { useAuth } from '../lib/auth';
import { db } from '../lib/db';
import { collection, where, addDoc, getDocs, query, orderBy, limit, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { ShoppingBag, Plus, Save, Edit2, Trash2 } from 'lucide-react';
import dayjs from 'dayjs';
import InfoTooltip from '../components/InfoTooltip';

export default function DairySales() {
  const { t } = useI18n();
  const { user , tenantId } = useAuth();
  const [sales, setSales] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    dairyName: '',
    date: dayjs().format('YYYY-MM-DD'),
    quantity: '',
    fat: '',
    rate: '',
    amount: 0
  });

  useEffect(() => {
    if (!tenantId) return;
    const q = query(collection(db, 'dairy_sales'), where('userId', '==', tenantId), orderBy('date', 'desc'), limit(100));
    const unsub = onSnapshot(q, (snap) => {
      setSales(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [tenantId]);

  useEffect(() => {
    setFormData(prev => ({ ...prev, amount: (parseFloat(prev.quantity) || 0) * (parseFloat(prev.rate) || 0) }));
  }, [formData.quantity, formData.rate]);

  async function handleSave() {
    if (isSaving) return;
    setIsSaving(true);
    const now = new Date().toISOString();
    try {
      const dataToSave = {
        ...formData, 
        quantity: parseFloat(formData.quantity) || 0,
        fat: parseFloat(formData.fat) || 0,
        rate: parseFloat(formData.rate) || 0,
        amount: formData.amount,
        updatedAt: now,
        syncPending: true
      };

      if (editingId) {
        await updateDoc(doc(db, 'dairy_sales', editingId), dataToSave);
      } else {
        (dataToSave as any).createdAt = now;
        dataToSave.userId = tenantId;
        await addDoc(collection(db, 'dairy_sales'), dataToSave);
      }
      
      setShowForm(false);
      setEditingId(null);
      toast.success(editingId ? 'Dairy Sale updated successfully!' : 'Dairy Sale saved successfully!');
    } catch (e) {
      console.error(e);
      toast.error("Dairy Sale Error: " + (e as any).message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this sale record?")) return;
    try {
      await deleteDoc(doc(db, 'dairy_sales', id));
      toast.success('Sale record deleted successfully!');
    } catch (e) {
      console.error(e);
      toast.error("Error deleting: " + (e as any).message);
    }
  }

  function handleEditClick(sale: any) {
    setFormData({
      dairyName: sale.dairyName || '',
      date: sale.date || dayjs().format('YYYY-MM-DD'),
      quantity: sale.quantity?.toString() || '',
      fat: sale.fat?.toString() || '',
      rate: sale.rate?.toString() || '',
      amount: sale.amount || 0
    });
    setEditingId(sale.id);
    setShowForm(true);
  }

  if (showForm) {
    return (
      <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300 max-w-2xl mx-auto mt-4 md:mt-10">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => setShowForm(false)} className="p-2 bg-slate-100 hover:bg-slate-200 text-black rounded-none transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="square" strokeLinejoin="miter" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
          </button>
          <h2 className="text-2xl text-slate-900 tracking-tight">{editingId ? t('edit_dairy_sale') : t('new_dairy_sale')}</h2>
        </div>

        <div className="bg-white border border-slate-200 p-6">
          <div className="space-y-4">
              <input placeholder={t('dairy_name')} className="w-full p-3 bg-slate-50 rounded-none border border-slate-100 text-sm focus:border-slate-300 focus:outline-none" value={formData.dairyName} onChange={e => setFormData({...formData, dairyName: e.target.value})} />
              <input type="date" className="w-full p-3 bg-slate-50 rounded-none border border-slate-100 text-sm focus:border-slate-300 focus:outline-none" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
              <div className="grid grid-cols-2 gap-3">
                <input type="number" inputMode="decimal" pattern="[0-9]*" placeholder={t('qty')} className="w-full p-3 bg-slate-50 rounded-none border border-slate-100 text-sm focus:border-slate-300 focus:outline-none" value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} />
                <input type="number" inputMode="decimal" pattern="[0-9]*" placeholder={t('fat')} className="w-full p-3 bg-slate-50 rounded-none border border-slate-100 text-sm focus:border-slate-300 focus:outline-none" value={formData.fat} onChange={e => setFormData({...formData, fat: e.target.value})} />
              </div>
              <input type="number" inputMode="decimal" pattern="[0-9]*" placeholder={t('rate')} className="w-full p-3 bg-slate-50 rounded-none border border-slate-100 text-sm focus:border-slate-300 focus:outline-none" value={formData.rate} onChange={e => setFormData({...formData, rate: e.target.value})} />
              <div className="p-3 bg-blue-50 text-blue-700 rounded-none text-center text-sm font-medium">{t('amount')}: ₹ {formData.amount.toFixed(2)}</div>
          </div>
          
          <div className="mt-8 flex gap-3">
             <button disabled={isSaving} onClick={() => setShowForm(false)} className="flex-1 py-3 text-slate-700 bg-slate-100 hover:bg-slate-200 text-sm transition-colors disabled:opacity-50">{t('cancel')}</button>
             <button disabled={isSaving} onClick={handleSave} className="flex-1 py-3 bg-blue-600 text-white hover:bg-blue-700 rounded-none text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                <Save className="w-4 h-4" />
                {editingId ? t('update_sale') : t('save_sale')}
             </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">{t('dairy_sales')} <InfoTooltip text="Record bulk milk sales to large Dairies (based on FAT)." /></h2>
        <button onClick={() => {
          setEditingId(null);
          setFormData({
            dairyName: '',
            date: dayjs().format('YYYY-MM-DD'),
            quantity: '',
            fat: '',
            rate: '',
            amount: 0
          });
          setShowForm(true);
        }} className="bg-slate-900 text-white px-3 py-2 text-[10px] uppercase tracking-widest flex items-center gap-1 shrink-0 shadow-sm">
          <Plus className="w-3.5 h-3.5" /> {t('record_sale')}
        </button>
      </div>

      <div className="bg-white rounded-none border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-left min-w-[600px]">
          <thead className="bg-slate-50/50 text-black text-[9px] capitalize tracking-widest sticky top-0 z-10 backdrop-blur-sm">
            <tr>
              <th className="px-4 py-3">{t('date')}</th>
              <th className="px-4 py-3">{t('dairy')}</th>
              <th className="px-4 py-3">{t('qty')}</th>
              <th className="px-4 py-3">{t('fat')}</th>
              <th className="px-4 py-3">{t('amount')}</th>
              <th className="px-4 py-3 text-right">{t('actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {sales.map(s => (
              <tr key={s.id} className="hover:bg-slate-50/50 transition-colors group text-sm">
                <td className="px-4 py-3 whitespace-nowrap text-xs text-black">{s.date}</td>
                <td className="px-4 py-3 whitespace-nowrap font-medium">{s.dairyName}</td>
                <td className="px-4 py-3 whitespace-nowrap">{s.quantity} L</td>
                <td className="px-4 py-3 whitespace-nowrap">{s.fat}</td>
                <td className="px-4 py-3 whitespace-nowrap font-mono text-emerald-600">₹ {s.amount}</td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  {(() => {
                    const daysOld = dayjs().diff(dayjs(s.date), 'day');
                    if (daysOld > 10) return <span className="text-[10px] text-slate-400">Locked</span>;
                    return (
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleEditClick(s)} className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(s.id)} className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        {sales.length === 0 && (
          <div className="p-8 text-center text-slate-500 text-sm">{t('no_dairy_sales_recorded')}</div>
        )}
      </div>
    </div>
  );
}
