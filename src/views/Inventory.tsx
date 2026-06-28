import { useState, useEffect } from 'react';
import { useI18n } from '../lib/i18n';
import { useAuth } from '../lib/auth';
import { db } from '../lib/firebase';
import { collection, where, addDoc, onSnapshot, query, doc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { Package, Plus, Save, X, Edit2, Trash2, AlertTriangle, TrendingUp, ShoppingCart, LayoutGrid, List } from 'lucide-react';
import InfoTooltip from '../components/InfoTooltip';
import SellItemModal from '../components/SellItemModal';

export default function Inventory() {
  const { t } = useI18n();
  const { user , tenantId } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sellItem, setSellItem] = useState<any | null>(null);
  const [originalQuantity, setOriginalQuantity] = useState<number>(0);
  const [formData, setFormData] = useState({
    itemName: '',
    category: 'Feed',
    quantity: '',
    unit: 'bags',
    rate: '',
    minStock: '',
    paymentMethod: 'Cash',
    purchaseDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    if (!tenantId) return;
    const q = query(collection(db, 'inventory'), where('userId', '==', tenantId));
    const unsubscribe = onSnapshot(q, (snap) => {
      setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => {
      console.error("Error loading inventory:", error);
    });
    return () => unsubscribe();
  }, [tenantId]);

  async function handleSave() {
    if (!formData.itemName || !formData.quantity) return;
    try {
      const now = new Date().toISOString();
      const newQty = parseFloat(formData.quantity) || 0;
      const rateNum = parseFloat(formData.rate) || 0;

      const dataToSave = {
        itemName: formData.itemName,
        category: formData.category || 'General',
        quantity: newQty,
        unit: formData.unit,
        rate: rateNum,
        minStock: parseFloat(formData.minStock) || 0,
        updatedAt: now,
        userId: tenantId
      };

      // Check if we need to record a purchase (quantity increased or new item with qty > 0)
      const isPurchase = editingId ? (newQty > originalQuantity) : (newQty > 0);

      if (isPurchase && rateNum > 0 && tenantId) {
        const qtyDiff = editingId ? (newQty - originalQuantity) : newQty;
        const totalCost = qtyDiff * rateNum;

        const batch = writeBatch(db);

        // 1. Update/Add Inventory Item
        let itemRef;
        if (editingId) {
          itemRef = doc(db, 'inventory', editingId);
          batch.update(itemRef, dataToSave);
        } else {
          itemRef = doc(collection(db, 'inventory'));
          (dataToSave as any).createdAt = now;
          batch.set(itemRef, dataToSave);
        }

        // 2. Add Expense Record
        const expRef = doc(collection(db, 'expenses'));
        batch.set(expRef, {
          date: formData.purchaseDate,
          category: 'Inventory Purchase',
          amount: totalCost,
          description: `Purchased ${qtyDiff} ${formData.unit} of ${formData.itemName} at ₹${rateNum}/${formData.unit}`,
          method: formData.paymentMethod,
          createdAt: now,
          userId: tenantId
        });

        await batch.commit();
      } else {
        // Normal save without recording an expense
        if (editingId) {
          await updateDoc(doc(db, 'inventory', editingId), dataToSave);
        } else {
          (dataToSave as any).createdAt = now;
          await addDoc(collection(db, 'inventory'), dataToSave);
        }
      }

      setShowForm(false);
      setEditingId(null);
      setFormData({
        itemName: '',
        category: 'Feed',
        quantity: '',
        unit: 'bags',
        rate: '',
        minStock: '',
        paymentMethod: 'Cash',
        purchaseDate: new Date().toISOString().split('T')[0]
      });
    } catch (e) {
      console.error(e);
      alert("Error saving item: " + (e as any).message);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this inventory item?")) return;
    try {
      await deleteDoc(doc(db, 'inventory', id));
    } catch (e) {
      console.error(e);
      alert("Error deleting: " + (e as any).message);
    }
  }

  function handleEditClick(item: any) {
    setFormData({
      itemName: item.itemName || '',
      category: item.category || 'Feed',
      quantity: item.quantity?.toString() || '',
      unit: item.unit || 'bags',
      rate: item.rate?.toString() || '',
      minStock: item.minStock?.toString() || '',
      paymentMethod: 'Cash',
      purchaseDate: new Date().toISOString().split('T')[0]
    });
    setOriginalQuantity(item.quantity || 0);
    setEditingId(item.id);
    setShowForm(true);
  }

  const newQty = parseFloat(formData.quantity) || 0;
  const rateNum = parseFloat(formData.rate) || 0;
  const isPurchase = editingId ? (newQty > originalQuantity) : (newQty > 0);
  const qtyDiff = editingId ? (newQty - originalQuantity) : newQty;
  const totalCost = qtyDiff * rateNum;

  if (showForm) {
    return (
      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="bg-white w-full overflow-hidden border border-slate-200 shadow-sm">
          <div className="bg-blue-600 p-4 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white/20 flex items-center justify-center">
                <Plus className="w-4 h-4" />
              </div>
              <h3 className="text-lg tracking-tight">{editingId ? t('edit_inventory_item') : t('add_inventory_item')}</h3>
            </div>
            <button onClick={() => { setShowForm(false); setEditingId(null); }} className="p-1 hover:bg-white/10 transition-colors flex items-center gap-1 text-sm">
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          <div className="p-4 md:p-6 space-y-4 max-w-2xl mx-auto">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-black uppercase tracking-widest block mb-1.5">{t('item_name')}</label>
                  <input 
                    type="text" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-none px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none text-black text-sm"
                    value={formData.itemName}
                    onChange={(e) => setFormData({...formData, itemName: e.target.value})}
                    placeholder="e.g. Cattle Feed"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-black uppercase tracking-widest block mb-1.5">{t('category')}</label>
                  <select 
                    className="w-full bg-slate-50 border border-slate-200 rounded-none px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none text-black text-sm"
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                  >
                    <option value="Feed">{t('feed')}</option>
                    <option value="Medicine">{t('medicine')}</option>
                    <option value="Equipment">{t('equipment')}</option>
                    <option value="General">{t('general')}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-black uppercase tracking-widest block mb-1.5">{t('quantity')}</label>
                  <input 
                    type="number" inputMode="decimal" pattern="[0-9]*" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-none px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none text-black text-sm"
                    value={formData.quantity}
                    onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                    placeholder="0.0"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-black uppercase tracking-widest block mb-1.5">{t('unit')}</label>
                  <select 
                    className="w-full bg-slate-50 border border-slate-200 rounded-none px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none text-black text-sm"
                    value={formData.unit}
                    onChange={(e) => setFormData({...formData, unit: e.target.value})}
                  >
                    <option value="bags">{t('bags')}</option>
                    <option value="kg">{t('kg')}</option>
                    <option value="litres">{t('litres')}</option>
                    <option value="units">{t('units')}</option>
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-black uppercase tracking-widest block mb-1.5">{t('rate_per_unit')}</label>
                  <input 
                    type="number" inputMode="decimal" pattern="[0-9]*" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-none px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none text-black text-sm"
                    value={formData.rate}
                    onChange={(e) => setFormData({...formData, rate: e.target.value})}
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-black uppercase tracking-widest block mb-1.5">{t('min_stock_alert')}</label>
                  <input 
                    type="number" inputMode="decimal" pattern="[0-9]*" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-none px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none text-black text-sm"
                    value={formData.minStock}
                    onChange={(e) => setFormData({...formData, minStock: e.target.value})}
                    placeholder="0.0"
                  />
                </div>
              </div>

              {isPurchase && (
                <div className="border border-blue-100 bg-blue-50/50 p-4 space-y-3 mt-2">
                  <p className="text-[10px] text-blue-700 uppercase tracking-widest font-bold">{t('purchase_expense_details')}</p>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-black uppercase tracking-widest block mb-1.5">{t('purchase_date')}</label>
                      <input 
                        type="date" 
                        className="w-full bg-white border border-slate-200 px-3 py-2 text-sm text-black focus:ring-2 focus:ring-blue-500 outline-none"
                        value={formData.purchaseDate}
                        onChange={(e) => setFormData({...formData, purchaseDate: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-black uppercase tracking-widest block mb-1.5">{t('payment_method')}</label>
                      <select 
                        className="w-full bg-white border border-slate-200 px-3 py-2 text-sm text-black focus:ring-2 focus:ring-blue-500 outline-none"
                        value={formData.paymentMethod}
                        onChange={(e) => setFormData({...formData, paymentMethod: e.target.value})}
                      >
                        <option value="Cash">Cash</option>
                        <option value="Bank">Bank Transfer</option>
                        <option value="UPI">UPI / GPay</option>
                      </select>
                    </div>
                  </div>
                  
                  {rateNum > 0 && (
                    <div className="flex items-center justify-between bg-slate-900 p-3 text-white">
                      <span className="text-[10px] text-slate-300 uppercase tracking-widest">{t('total_expense')}</span>
                      <span className="text-base text-red-400 font-bold">- ₹{totalCost.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-4 pt-4 pb-12">
              <button 
                onClick={() => { setShowForm(false); setEditingId(null); }}
                className="flex-1 px-6 py-4 rounded-none bg-slate-100 text-black hover:bg-slate-200 text-xs tracking-wide font-medium"
              >
                {t('cancel')}
              </button>
              <button onClick={handleSave} style={{ flex: 2 }} className="px-6 py-4 rounded-none bg-slate-900 text-white hover:bg-black flex items-center justify-center gap-2 text-xs tracking-wide font-medium">
                <Save className="w-4 h-4" /> {t('save_item')}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center justify-between w-full md:w-auto">
          <div>
            <h2 className="text-xl md:text-2xl text-slate-900 tracking-tight flex items-center gap-2">{t('inventory')} <InfoTooltip text="Manage your items, stock, and product inventory." /></h2>
            <p className="text-black text-[10px] uppercase tracking-widest mt-0.5 hidden md:block">{t('inventory_desc')}</p>
          </div>
          <button 
            onClick={() => {
              setEditingId(null);
              setFormData({
                itemName: '',
                category: 'Feed',
                quantity: '',
                unit: 'bags',
                rate: '',
                minStock: '',
                paymentMethod: 'Cash',
                purchaseDate: new Date().toISOString().split('T')[0]
              });
              setOriginalQuantity(0);
              setShowForm(true);
            }} 
            className="md:hidden bg-slate-900 text-white px-3 py-2 rounded-none text-[10px] uppercase tracking-widest flex items-center gap-1 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" /> {t('add_item')}
          </button>
        </div>
        
        <div className="flex items-center justify-between md:justify-end gap-2 w-full md:w-auto">
          <div className="flex bg-slate-100 border border-slate-200 p-1 rounded-none w-full md:w-auto">
            <button onClick={() => setViewMode('grid')} className={`flex-1 md:flex-none p-1.5 flex justify-center ${viewMode === 'grid' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button onClick={() => setViewMode('list')} className={`flex-1 md:flex-none p-1.5 flex justify-center ${viewMode === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>
              <List className="w-4 h-4" />
            </button>
          </div>
          <button 
            onClick={() => {
              setEditingId(null);
              setFormData({
                itemName: '',
                category: 'Feed',
                quantity: '',
                unit: 'bags',
                rate: '',
                minStock: '',
                paymentMethod: 'Cash',
                purchaseDate: new Date().toISOString().split('T')[0]
              });
              setOriginalQuantity(0);
              setShowForm(true);
            }} 
            className="hidden md:flex bg-slate-900 text-white px-4 py-2 rounded-none text-[11px] tracking-wider uppercase items-center gap-2 hover:bg-black shrink-0"
          >
            <Plus className="w-4 h-4" /> {t('add_item')}
          </button>
        </div>
      </div>

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
          {items.length === 0 ? (
            <div className="col-span-full py-12 text-center text-black bg-white rounded-none border border-dashed border-slate-200 text-xs uppercase tracking-widest">
              {t('no_records')}
            </div>
          ) : items.map(item => {
            const isLowStock = item.minStock > 0 && item.quantity <= item.minStock;
            const value = (item.quantity * (item.rate || 0)).toFixed(2);
            
            return (
              <div key={item.id} className={`bg-white p-3 md:p-4 rounded-none border ${isLowStock ? 'border-red-300 ring-1 ring-red-100' : 'border-slate-200'} relative overflow-hidden group flex flex-col`}>
                 {isLowStock && (
                   <div className="absolute top-0 right-0 bg-red-100 text-red-700 text-[8px] uppercase tracking-widest px-1.5 py-0.5 font-bold flex items-center gap-1">
                     <AlertTriangle className="w-2.5 h-2.5" /> {t('low_stock')}
                   </div>
                 )}
                 <div className="flex justify-between items-start mb-3">
                   <div className="flex items-center gap-2">
                     <div className={`p-1.5 ${isLowStock ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'} rounded-none`}>
                       <Package className="w-4 h-4" />
                     </div>
                     <div>
                       <span className="text-[8px] text-slate-500 uppercase tracking-widest bg-slate-100 px-1.5 py-0.5">{t(item.category?.toLowerCase() || 'general')}</span>
                     </div>
                   </div>
                 </div>
                 <h3 className=" text-slate-900 text-sm font-medium tracking-tight truncate pr-2 mb-2">{item.itemName}</h3>
                 <div className="flex items-end justify-between mt-auto">
                   <p className={`text-xl ${isLowStock ? 'text-red-600' : 'text-slate-900'}`}>
                     {item.quantity} <span className="text-[9px] text-black uppercase tracking-widest">{t(item.unit?.toLowerCase() || 'units')}</span>
                   </p>
                 </div>
                 {item.rate > 0 && (
                   <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-black">
                     <span className="flex items-center gap-1 truncate"><TrendingUp className="w-3 h-3 shrink-0" /> ₹{item.rate}</span>
                     <span className="font-mono text-slate-800 shrink-0">₹{value}</span>
                   </div>
                 )}
                 <div className="flex gap-1 mt-3 pt-2 border-t border-slate-100 justify-end">
                     <button onClick={() => setSellItem(item)} disabled={item.quantity <= 0} className="flex-1 p-1.5 bg-slate-50 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border border-slate-100 disabled:opacity-50 flex justify-center" title={t('sell_item')}>
                       <ShoppingCart className="w-3.5 h-3.5" />
                     </button>
                     <button onClick={() => handleEditClick(item)} className="p-1.5 bg-slate-50 text-black hover:text-blue-600 hover:bg-blue-50 border border-slate-100" title="Edit">
                       <Edit2 className="w-3.5 h-3.5" />
                     </button>
                     <button onClick={() => handleDelete(item.id)} className="p-1.5 bg-slate-50 text-black hover:text-red-600 hover:bg-red-50 border border-slate-100" title="Delete">
                       <Trash2 className="w-3.5 h-3.5" />
                     </button>
                 </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead className="bg-slate-50 text-black uppercase text-[9px] tracking-widest">
              <tr>
                <th className="px-4 py-3">{t('item_name')}</th>
                <th className="px-4 py-3">{t('category')}</th>
                <th className="px-4 py-3">{t('stock')}</th>
                <th className="px-4 py-3">{t('value')}</th>
                <th className="px-4 py-3 text-right">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-xs uppercase tracking-widest text-slate-500">{t('no_records')}</td>
                </tr>
              ) : items.map(item => {
                const isLowStock = item.minStock > 0 && item.quantity <= item.minStock;
                const value = (item.quantity * (item.rate || 0)).toFixed(2);
                return (
                  <tr key={item.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-sm text-slate-900">{item.itemName}</div>
                      {isLowStock && <span className="text-[9px] text-red-600 uppercase tracking-widest font-bold">{t('low_stock')}</span>}
                    </td>
                    <td className="px-4 py-3 text-xs">{t(item.category?.toLowerCase() || 'general')}</td>
                    <td className="px-4 py-3">
                      <span className={`text-sm ${isLowStock ? 'text-red-600 font-bold' : ''}`}>{item.quantity} {t(item.unit?.toLowerCase() || 'units')}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {item.rate > 0 ? (
                        <div>
                          <div className="font-mono text-slate-900 font-medium">₹{value}</div>
                          <div className="text-[9px] uppercase tracking-widest">₹{item.rate}/{item.unit}</div>
                        </div>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => setSellItem(item)} disabled={item.quantity <= 0} className="p-1.5 bg-slate-50 border border-slate-200 text-emerald-600 hover:bg-emerald-100 disabled:opacity-50" title={t('sell_item')}>
                          <ShoppingCart className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleEditClick(item)} className="p-1.5 bg-slate-50 border border-slate-200 text-blue-600 hover:bg-blue-100" title="Edit">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(item.id)} className="p-1.5 bg-slate-50 border border-slate-200 text-red-600 hover:bg-red-100" title="Delete">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <SellItemModal 
        isOpen={!!sellItem}
        onClose={() => setSellItem(null)}
        item={sellItem}
        onSuccess={() => {
          setSellItem(null);
        }}
      />
    </div>
  );
}

