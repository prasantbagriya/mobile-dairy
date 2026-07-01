import React, { useState, useEffect } from 'react';
import { MilkDelivery } from '../types';
import { db } from '../lib/db';
import { doc, getDoc, updateDoc, increment, writeBatch, runTransaction } from 'firebase/firestore';
import { X, Save, Calculator } from 'lucide-react';
import { useAuth } from '../lib/auth';

interface EditDeliveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  delivery: MilkDelivery | null;
  onSuccess: () => void;
}

export default function EditDeliveryModal({ isOpen, onClose, delivery, onSuccess }: EditDeliveryModalProps) {
  const { tenantId } = useAuth();
  const [formData, setFormData] = useState({
    quantity: '',
    rate: '',
    amount: 0
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && delivery) {
      setFormData({
        quantity: delivery.quantity.toString(),
        rate: delivery.rate.toString(),
        amount: delivery.amount
      });
    }
  }, [isOpen, delivery]);

  const calculateAmount = () => {
    const qty = parseFloat(formData.quantity) || 0;
    const rate = parseFloat(formData.rate) || 0;
    const amount = qty * rate;
    setFormData(prev => ({ ...prev, amount }));
  };

  useEffect(() => {
    calculateAmount();
  }, [formData.quantity, formData.rate]);

  async function handleSave() {
    if (!delivery || !delivery.id || !delivery.customerId) return;
    setLoading(true);

    try {
      const delRef = doc(db, 'milk_deliveries', delivery.id);

      await runTransaction(db, async (transaction) => {
        let customerRef = null;
        if (delivery.customerId !== 'CASH_SALE') {
          customerRef = doc(db, 'customers', delivery.customerId);
          const customerSnap = await transaction.get(customerRef);
          
          if (customerSnap.exists()) {
             const cData = customerSnap.data() as any;
             if (cData?.lastSettledDate && delivery.date <= cData.lastSettledDate) {
                throw new Error("This entry is already settled and cannot be edited.");
             }
          } else {
             throw new Error("Customer document does not exist.");
          }
        }

        const delSnap = await transaction.get(delRef);
        if (!delSnap.exists()) {
          throw new Error("Delivery document does not exist.");
        }

        const liveDelData = delSnap.data() as any;
        const oldAmount = liveDelData?.amount || 0;

        const newQty = parseFloat(formData.quantity);
        const newRate = parseFloat(formData.rate);
        const newAmount = formData.amount;
        
        const difference = newAmount - oldAmount;
        const currentEditCount = liveDelData.editCount || 0;

        transaction.update(delRef, {
          quantity: newQty,
          rate: newRate,
          amount: newAmount,
          editCount: currentEditCount + 1,
          updatedAt: new Date().toISOString()
        });

        if (customerRef && delivery.customerId !== 'CASH_SALE') {
          transaction.update(customerRef, {
            balance: increment(difference) // Increased delivery amount increases their balance/debt
          });
        }
      });

      onSuccess();
      onClose();
    } catch (e: any) {
      console.error("Error updating milk delivery:", e);
      alert(e.message || "Failed to update entry.");
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen || !delivery) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-150 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md max-h-[90vh] overflow-y-auto border border-slate-200 flex flex-col">
        <div className="bg-amber-500 p-4 text-white flex items-center justify-between">
          <h3 className="text-lg tracking-tight">Edit Entry (Max 2 Edits)</h3>
          <button onClick={onClose} className="p-1 hover:bg-white/10">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          <div className="bg-slate-50 p-3 flex justify-between border border-slate-100 mb-2">
             <div>
                <p className="text-[10px] text-black uppercase">Date & Session</p>
                <p className="text-xs">{delivery.date} • {delivery.session}</p>
             </div>
             <div className="text-right">
                <p className="text-[10px] text-black uppercase">Edits Done</p>
                <p className="text-xs text-amber-600">{delivery.editCount || 0} / 2</p>
             </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-black tracking-tight block mb-1">Quantity (L)</label>
              <input id="auto-input-74" name="auto-input-74" type="number" inputMode="decimal" pattern="[0-9]*" className="w-full bg-slate-50 border border-slate-200 rounded-none px-3 py-2 text-sm text-black" value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} />
            </div>
            <div>
              <label className="text-[10px] text-black tracking-tight block mb-1">Rate (₹/L)</label>
              <input id="auto-input-75" name="auto-input-75" type="number" inputMode="decimal" pattern="[0-9]*" className="w-full bg-slate-50 border border-slate-200 rounded-none px-3 py-2 text-sm text-black" value={formData.rate} onChange={e => setFormData({...formData, rate: e.target.value})} />
            </div>
          </div>

          <div className="flex items-center justify-between bg-slate-900 p-4 text-white mt-4">
            <div className="flex items-center gap-2">
               <Calculator className="w-4 h-4 text-black" />
               <span className="text-xs text-slate-300">New Amount</span>
            </div>
            <span className="text-xl">₹ {formData.amount.toFixed(2)}</span>
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 px-4 py-3 bg-slate-100 text-black hover:bg-slate-200 text-xs uppercase tracking-widest">
              Cancel
            </button>
            <button onClick={handleSave} disabled={loading || !formData.quantity || !formData.rate} className="flex-2 px-4 py-3 bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50 flex items-center justify-center gap-2 text-xs uppercase tracking-widest">
              <Save className="w-4 h-4" /> {loading ? 'Saving...' : 'Update Entry'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
