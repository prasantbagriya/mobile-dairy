import React, { useState, useEffect } from 'react';
import { InventoryItem, Farmer, Customer } from '../types';
import { db } from '../lib/db';
import { collection, query, where, getDocs, doc, writeBatch, increment } from 'firebase/firestore';
import { X, Save, User, UserCircle, ShoppingCart } from 'lucide-react';
import { useAuth } from '../lib/auth';

interface SellItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: InventoryItem | null;
  onSuccess: () => void;
}

export default function SellItemModal({ isOpen, onClose, item, onSuccess }: SellItemModalProps) {
  const { tenantId } = useAuth();
  const [personType, setPersonType] = useState<'farmer' | 'customer'>('farmer');
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  
  const [selectedPersonId, setSelectedPersonId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [rate, setRate] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && tenantId) {
      loadPeople();
      if (item) {
        setRate(item.rate?.toString() || '0');
        setQuantity('');
        setSelectedPersonId('');
        setDate(new Date().toISOString().split('T')[0]);
      }
    }
  }, [isOpen, tenantId, item]);

  async function loadPeople() {
    try {
      const farmersQ = query(collection(db, 'farmers'), where('userId', '==', tenantId));
      const farmersSnap = await getDocs(farmersQ);
      setFarmers(farmersSnap.docs.map(d => ({ id: d.id, ...d.data() } as Farmer)).filter(f => f.isActive !== false).sort((a, b) => (a.sequence || 0) - (b.sequence || 0)));

      const customersQ = query(collection(db, 'customers'), where('userId', '==', tenantId));
      const customersSnap = await getDocs(customersQ);
      setCustomers(customersSnap.docs.map(d => ({ id: d.id, ...d.data() } as Customer)).filter(c => c.isActive !== false).sort((a, b) => (a.sequence || 0) - (b.sequence || 0)));
    } catch (e) {
      console.error("Error loading people:", e);
    }
  }

  const amount = (parseFloat(quantity) || 0) * (parseFloat(rate) || 0);
  const isValid = selectedPersonId && (parseFloat(quantity) || 0) > 0 && (parseFloat(quantity) || 0) <= (item?.quantity || 0);

  async function handleSave() {
    if (!item || !item.id || !isValid || !tenantId) return;
    setLoading(true);

    try {
      const qtyNum = parseFloat(quantity);
      const batch = writeBatch(db);

      // 1. Deduct Inventory
      const itemRef = doc(db, 'inventory', item.id);
      batch.update(itemRef, {
        quantity: increment(-qtyNum),
        updatedAt: new Date().toISOString()
      });

      // 2. Create Transaction
      const transRef = doc(collection(db, 'transactions'));
      batch.set(transRef, {
        date: date,
        personId: selectedPersonId,
        personType: personType,
        type: 'debit', // Sale is a debit (reduces farmer balance / increases customer balance)
        amount: amount,
        description: `Purchased: ${qtyNum} ${item.unit} ${item.itemName}`,
        method: 'Item Sale',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        userId: tenantId
      });

      // 3. Update Person's Balance
      const personRef = doc(db, personType === 'farmer' ? 'farmers' : 'customers', selectedPersonId);
      // For farmer: debit -> balance decreases (we owe them less) -> increment(-amount)
      // For customer: debit -> balance increases (they owe us more) -> increment(amount)
      const balanceChange = personType === 'farmer' ? -amount : amount;
      batch.update(personRef, {
        balance: increment(balanceChange)
      });

      await batch.commit();
      onSuccess();
      onClose();
    } catch (e) {
      console.error("Error processing sale:", e);
      alert("Failed to process sale.");
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen || !item) return null;

  const peopleList = personType === 'farmer' ? farmers : customers;

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-150 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md overflow-hidden border border-slate-200">
        <div className="bg-emerald-600 p-4 text-white flex items-center justify-between">
          <h3 className="text-lg tracking-tight flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Sell {item.itemName}
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-white/10 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-5">
          {/* Item Info Summary */}
          <div className="bg-slate-50 p-3 flex justify-between border border-slate-100 items-center">
             <div>
                <p className="text-[10px] text-black uppercase tracking-widest mb-1">Available Stock</p>
                <p className="text-sm font-semibold">{item.quantity} {item.unit}</p>
             </div>
             <div className="text-right">
                <p className="text-[10px] text-black uppercase tracking-widest mb-1">Default Rate</p>
                <p className="text-sm font-semibold">₹{item.rate || 0} / {item.unit}</p>
             </div>
          </div>

          <div className="flex bg-slate-100 p-1">
            <button 
              className={`flex-1 py-2 text-xs uppercase tracking-widest font-semibold flex items-center justify-center gap-2 ${personType === 'farmer' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-black'}`}
              onClick={() => { setPersonType('farmer'); setSelectedPersonId(''); }}
            >
              <User className="w-4 h-4" /> Farmer
            </button>
            <button 
              className={`flex-1 py-2 text-xs uppercase tracking-widest font-semibold flex items-center justify-center gap-2 ${personType === 'customer' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-500 hover:text-black'}`}
              onClick={() => { setPersonType('customer'); setSelectedPersonId(''); }}
            >
              <UserCircle className="w-4 h-4" /> Customer
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-[10px] uppercase tracking-widest text-black block mb-1">Date</label>
              <input 
                type="date" 
                className="w-full bg-slate-50 border border-slate-200 rounded-none px-3 py-2.5 text-sm"
                value={date} 
                onChange={e => setDate(e.target.value)} 
              />
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-widest text-black block mb-1">Select {personType}</label>
              <select 
                className="w-full bg-slate-50 border border-slate-200 rounded-none px-3 py-2.5 text-sm"
                value={selectedPersonId}
                onChange={e => setSelectedPersonId(e.target.value)}
              >
                <option value="">-- Choose --</option>
                {peopleList.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] uppercase tracking-widest text-black block mb-1">Quantity ({item.unit})</label>
                <input 
                  type="number" 
                  step="0.01"
                  max={item.quantity}
                  className={`w-full bg-slate-50 border rounded-none px-3 py-2.5 text-sm ${parseFloat(quantity) > item.quantity ? 'border-red-500 text-red-600' : 'border-slate-200'}`}
                  value={quantity} 
                  onChange={e => setQuantity(e.target.value)} 
                  placeholder="0.0"
                />
                {parseFloat(quantity) > item.quantity && (
                  <p className="text-[10px] text-red-500 mt-1">Exceeds stock!</p>
                )}
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest text-black block mb-1">Rate (₹)</label>
                <input 
                  type="number" 
                  step="0.01"
                  className="w-full bg-slate-50 border border-slate-200 rounded-none px-3 py-2.5 text-sm"
                  value={rate} 
                  onChange={e => setRate(e.target.value)} 
                />
              </div>
            </div>
            
            <div className="flex items-center justify-between bg-slate-900 p-4 text-white mt-2">
              <span className="text-xs text-slate-300 uppercase tracking-widest">Total Amount</span>
              <span className="text-xl">₹{amount.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 px-4 py-3 bg-slate-100 text-black hover:bg-slate-200 text-xs uppercase tracking-widest">
              Cancel
            </button>
            <button 
              onClick={handleSave} 
              disabled={loading || !isValid} 
              className="flex-2 px-4 py-3 bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2 text-xs uppercase tracking-widest"
            >
              <Save className="w-4 h-4" /> {loading ? 'Processing...' : 'Complete Sale'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
