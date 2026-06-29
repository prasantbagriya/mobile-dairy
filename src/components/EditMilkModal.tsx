import React, { useState, useEffect } from 'react';
import { MilkCollection, AppSettings } from '../types';
import { db } from '../lib/db';
import { doc, getDoc, updateDoc, increment, writeBatch, runTransaction } from 'firebase/firestore';
import { X, Save, Calculator } from 'lucide-react';
import { useAuth } from '../lib/auth';

interface EditMilkModalProps {
  isOpen: boolean;
  onClose: () => void;
  collection: MilkCollection | null;
  onSuccess: () => void;
}

export default function EditMilkModal({ isOpen, onClose, collection, onSuccess }: EditMilkModalProps) {
  const { tenantId } = useAuth();
  const [formData, setFormData] = useState({
    quantity: '',
    fat: '',
    snf: '',
    rate: '',
    amount: 0
  });
  const [settings, setSettings] = useState<AppSettings>({ peakFatRate: 7.2, avgPrice: 52.4, efficiency: 14.2 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && collection) {
      setFormData({
        quantity: collection.quantity.toString(),
        fat: collection.fat.toString(),
        snf: collection.snf.toString(),
        rate: collection.rate.toString(),
        amount: collection.amount
      });
      loadSettings();
    }
  }, [isOpen, collection]);

  async function loadSettings() {
    try {
      const snap = await getDoc(doc(db, 'settings', tenantId || 'default'));
      if (snap.exists()) {
        setSettings(snap.data() as AppSettings);
      }
    } catch (e) {
      console.error(e);
    }
  }

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
    const fat = parseFloat(formData.fat) || 0;
    const snf = parseFloat(formData.snf) || 0;
    if (fat > 0 && snf > 0) {
      const calculatedRate = (fat * settings.peakFatRate / 10) + (snf * 3.5);
      setFormData(prev => ({ ...prev, rate: calculatedRate.toFixed(2) }));
    }
  };

  useEffect(() => {
    if (isOpen) {
      autoCalculateRate();
    }
  }, [formData.fat, formData.snf, settings]);

  async function handleSave() {
    if (!collection || !collection.id || !collection.farmerId) return;
    setLoading(true);

    try {
      const farmerRef = doc(db, 'farmers', collection.farmerId);
      const colRef = doc(db, 'milk_collections', collection.id);

      await runTransaction(db, async (transaction) => {
        const farmerSnap = await transaction.get(farmerRef);
        const colSnap = await transaction.get(colRef);

        if (!farmerSnap.exists() || !colSnap.exists()) {
          throw new Error("Document does not exist.");
        }

        const fData = farmerSnap.data() as any;
        if (fData?.lastSettledDate && collection.date <= fData.lastSettledDate) {
          throw new Error("This entry is already settled and cannot be edited.");
        }

        const liveColData = colSnap.data() as any;
        const oldAmount = liveColData?.amount || 0;
        
        const newQty = parseFloat(formData.quantity);
        const newFat = parseFloat(formData.fat);
        const newSnf = parseFloat(formData.snf);
        const newRate = parseFloat(formData.rate);
        const newAmount = formData.amount;
        
        const difference = newAmount - oldAmount;
        const currentEditCount = liveColData.editCount || 0;

        transaction.update(colRef, {
          quantity: newQty,
          fat: newFat,
          snf: newSnf,
          rate: newRate,
          amount: newAmount,
          editCount: currentEditCount + 1,
          updatedAt: new Date().toISOString()
        });

        transaction.update(farmerRef, {
          balance: increment(difference)
        });
      });

      onSuccess();
      onClose();
    } catch (e: any) {
      console.error("Error updating milk collection:", e);
      alert(e.message || "Failed to update entry.");
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen || !collection) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-150 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md max-h-[90vh] overflow-y-auto border border-slate-200 flex flex-col">
        <div className="bg-amber-500 p-4 text-white flex items-center justify-between">
          <h3 className="text-lg  tracking-tight">Edit Entry (Max 2 Edits)</h3>
          <button onClick={onClose} className="p-1 hover:bg-white/10">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          <div className="bg-slate-50 p-3 flex justify-between border border-slate-100 mb-2">
             <div>
                <p className="text-[10px] text-black  uppercase">Date & Session</p>
                <p className="text-xs ">{collection.date} • {collection.session}</p>
             </div>
             <div className="text-right">
                <p className="text-[10px] text-black  uppercase">Edits Done</p>
                <p className="text-xs  text-amber-600">{collection.editCount || 0} / 2</p>
             </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[10px]  text-black tracking-tight block mb-1">Quantity (L)</label>
              <input type="number" inputMode="decimal" pattern="[0-9]*" className="w-full bg-slate-50 border border-slate-200 rounded-none px-3 py-2 text-sm  text-black" value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} />
            </div>
            <div>
              <label className="text-[10px]  text-black tracking-tight block mb-1">Fat (%)</label>
              <input type="number" inputMode="decimal" pattern="[0-9]*" className="w-full bg-slate-50 border border-slate-200 rounded-none px-3 py-2 text-sm  text-black" value={formData.fat} onChange={e => setFormData({...formData, fat: e.target.value})} />
            </div>
            <div>
              <label className="text-[10px]  text-black tracking-tight block mb-1">SNF (%)</label>
              <input type="number" inputMode="decimal" pattern="[0-9]*" className="w-full bg-slate-50 border border-slate-200 rounded-none px-3 py-2 text-sm  text-black" value={formData.snf} onChange={e => setFormData({...formData, snf: e.target.value})} />
            </div>
          </div>

          <div>
            <label className="text-[10px]  text-black tracking-tight block mb-1">Calculated Rate (₹)</label>
            <input type="number" inputMode="decimal" pattern="[0-9]*" className="w-full bg-slate-100 border border-slate-200 rounded-none px-4 py-3 text-xl  text-blue-600" value={formData.rate} onChange={e => setFormData({...formData, rate: e.target.value})} />
          </div>

          <div className="flex items-center justify-between bg-slate-900 p-4 text-white mt-4">
            <div className="flex items-center gap-2">
               <Calculator className="w-4 h-4 text-black" />
               <span className="text-xs  text-slate-300">New Amount</span>
            </div>
            <span className="text-xl ">₹ {formData.amount.toFixed(2)}</span>
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 px-4 py-3 bg-slate-100 text-black  hover:bg-slate-200 text-xs uppercase tracking-widest">
              Cancel
            </button>
            <button onClick={handleSave} disabled={loading || !formData.quantity || !formData.rate} className="flex-2 px-4 py-3 bg-amber-500 text-white  hover:bg-amber-600 disabled:opacity-50 flex items-center justify-center gap-2 text-xs uppercase tracking-widest">
              <Save className="w-4 h-4" /> {loading ? 'Saving...' : 'Update Entry'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
