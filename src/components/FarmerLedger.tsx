import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, orderBy, writeBatch, doc, onSnapshot } from 'firebase/firestore';
import { MilkCollection, Transaction, Farmer } from '../types';
import { ArrowLeft, Calendar, FileText, IndianRupee, Printer, ChevronLeft, ChevronRight, X, Info, Edit2, Trash2 } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isSameMonth, isToday } from 'date-fns';
import EditMilkModal from './EditMilkModal';
import toast from 'react-hot-toast';

interface FarmerLedgerProps {
  farmer: Farmer;
  allFarmers?: Farmer[];
  onClose: () => void;
  onRefresh: () => void;
  onNavigateToFarmer?: (f: Farmer) => void;
}

import { useAuth } from "../lib/auth";
export default function FarmerLedger({ farmer, allFarmers = [], onClose, onRefresh, onNavigateToFarmer }: FarmerLedgerProps) {
  const { tenantId } = useAuth();
  const [allCollections, setAllCollections] = useState<MilkCollection[]>([]);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingCollection, setEditingCollection] = useState<MilkCollection | null>(null);
  const [paymentData, setPaymentData] = useState({
    type: 'debit' as 'credit' | 'debit',
    amount: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    method: 'Cash',
    description: ''
  });
  
  const [localBalance, setLocalBalance] = useState(farmer.balance || 0);

  useEffect(() => {
    setLocalBalance(farmer.balance || 0);
  }, [farmer.balance]);

  const dateRange = {
    start: format(startOfMonth(currentMonth), 'yyyy-MM-dd'),
    end: format(endOfMonth(currentMonth), 'yyyy-MM-dd')
  };

  useEffect(() => {
    if (!tenantId) return;
    if (!farmer.id) return;
    setLoading(true);

    const colQuery = query(
      collection(db, 'milk_collections'),
      where('farmerId', '==', farmer.id),
      orderBy('date', 'desc')
    );
    const unsubCol = onSnapshot(colQuery, (snap) => {
      setAllCollections(snap.docs.map(d => ({ id: d.id, ...d.data() } as MilkCollection)));
      setLoading(false);
    }, (e) => {
      console.error("Ledger Load Error:", e);
      setLoading(false);
    });

    const transQuery = query(
      collection(db, 'transactions'),
      where('personId', '==', farmer.id),
      where('personType', '==', 'farmer'),
      orderBy('date', 'desc')
    );
    const unsubTrans = onSnapshot(transQuery, (snap) => {
      setAllTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction)));
    }, (e) => {
      console.error("Trans Load Error:", e);
    });

    return () => {
      unsubCol();
      unsubTrans();
    };
  }, [farmer.id, tenantId]);

  const collections = allCollections.filter(c => c.date >= dateRange.start && c.date <= dateRange.end);
  const transactions = allTransactions.filter(t => t.date >= dateRange.start && t.date <= dateRange.end);

  async function loadHistory() {
    // Kept for interface compatibility but logic uses onSnapshot
  }

  const combinedHistory = [
    ...collections.map(c => ({ ...c, entryType: 'collection' as const })),
    ...transactions.map(t => ({ ...t, entryType: 'transaction' as const }))
  ].sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  async function handleSavePayment(goNext: boolean = false) {
    if (!farmer.id || !paymentData.amount || isSaving) return;
    setIsSaving(true);
    try {
      const batch = writeBatch(db);
      const amountNum = parseFloat(paymentData.amount);
      
      const transData: Omit<Transaction, 'id'> = {
        amount: amountNum,
        date: paymentData.date,
        description: paymentData.description || 'Manual Entry',
        method: paymentData.method,
        personId: farmer.id,
        personType: 'farmer',
        type: paymentData.type,
        createdAt: new Date().toISOString(),
        userId: tenantId
      };
      
      // Farmer: Debit = Paid them (balance decreases), Credit = They gave us money or we owe them more (balance increases)
      const balanceChange = paymentData.type === 'debit' ? -amountNum : amountNum;
      
      const transRef = doc(collection(db, 'transactions'));
      batch.set(transRef, transData);
      const updateData: any = { balance: localBalance + balanceChange };
      // Fallback for older documents missing required fields to pass Firestore rules
      if (!farmer.village) updateData.village = "Not specified";
      if (!farmer.mobile) updateData.mobile = "0000000000";

      if (paymentData.method === 'Settlement') {
        updateData.lastSettledDate = paymentData.date;
      }

      batch.update(doc(db, 'farmers', farmer.id), updateData);
      
      await batch.commit();
      setLocalBalance(localBalance + balanceChange);
      setShowPaymentModal(false);
      setPaymentData({ ...paymentData, amount: '', description: '' });
      if (paymentData.method === 'Settlement') {
        toast.success(`Settled successfully for ${farmer.name}`);
      } else {
        toast.success(`Payment recorded for ${farmer.name}`);
      }
      onRefresh();

      if (goNext && allFarmers && onNavigateToFarmer) {
        const sortedFarmers = [...allFarmers].sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
        const currentIndex = sortedFarmers.findIndex(f => f.id === farmer.id);
        if (currentIndex !== -1 && currentIndex < sortedFarmers.length - 1) {
          onNavigateToFarmer(sortedFarmers[currentIndex + 1]);
        }
      }
    } catch (e: any) { 
      console.error(e); 
      toast.error("Error saving payment: " + e.message); 
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteTransaction(item: Transaction) {
    if (!window.confirm("Are you sure you want to delete this transaction? The balance will be adjusted back.")) return;
    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, 'transactions', item.id!));
      
      const reverseChange = item.type === 'debit' ? item.amount : -item.amount;
      batch.update(doc(db, 'farmers', farmer.id!), {
        balance: localBalance + reverseChange
      });
      await batch.commit();
      setLocalBalance(localBalance + reverseChange);
      toast.success("Transaction deleted successfully");
      onRefresh();
    } catch(e: any) {
      console.error(e);
      toast.error("Error deleting transaction: " + e.message);
    }
  }

  // Calendar Construction
  let daysInMonth: Date[] = [];
  try {
    daysInMonth = eachDayOfInterval({
      start: startOfMonth(currentMonth),
      end: endOfMonth(currentMonth)
    });
  } catch (e) {
    console.error("Farmer Calendar Error:", e);
  }

  if (showPaymentModal) {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 bg-white w-full border border-slate-200">
        <div className="bg-blue-600 p-3 text-white flex items-center justify-between border-b border-blue-700">
          <div className="flex items-center gap-2">
            <button onClick={() => setShowPaymentModal(false)} className="p-1 hover:bg-blue-700 transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h3 className="text-base tracking-tight font-bold">Record Payment - {farmer.name}</h3>
          </div>
        </div>
        <div className="p-3 md:p-4 space-y-3 max-w-xl mx-auto">
          <div className="flex justify-between items-center p-2.5 bg-slate-50 border border-slate-200">
            <span className="text-black text-[10px] md:text-xs uppercase tracking-tight font-bold">Current Balance</span>
            <div className="flex items-center gap-2">
              <span className={`text-base font-bold ${localBalance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                ₹ {Math.abs(localBalance).toLocaleString()} {localBalance >= 0 ? '(Dr)' : '(Cr)'}
              </span>
              {localBalance !== 0 && (
                <button 
                  onClick={() => {
                    setPaymentData({
                      ...paymentData,
                      amount: Math.abs(localBalance).toString(),
                      type: localBalance > 0 ? 'debit' : 'credit',
                      method: 'Settlement',
                      description: 'Full Balance Settlement'
                    });
                  }}
                  className="px-2 py-1 bg-blue-100 text-blue-700 hover:bg-blue-200 text-[10px] uppercase tracking-widest border border-blue-200 font-bold"
                >
                  Settle All
                </button>
              )}
            </div>
          </div>

          <div className="flex bg-slate-100 p-1">
            <button onClick={() => setPaymentData({...paymentData, type: 'credit'})} className={`flex-1 py-2 text-[10px] md:text-xs uppercase tracking-widest font-bold border ${paymentData.type === 'credit' ? 'bg-emerald-600 text-white border-emerald-600' : 'text-black bg-transparent border-transparent hover:bg-slate-200'}`}>Received (+)</button>
            <button onClick={() => setPaymentData({...paymentData, type: 'debit'})} className={`flex-1 py-2 text-[10px] md:text-xs uppercase tracking-widest font-bold border ${paymentData.type === 'debit' ? 'bg-red-600 text-white border-red-600' : 'text-black bg-transparent border-transparent hover:bg-slate-200'}`}>Paid (-)</button>
          </div>

          <div className="space-y-3 mt-2">
            <div className="space-y-1">
              <label className="text-[10px] text-black uppercase tracking-widest font-bold block">Amount (₹)</label>
              <input 
                type="number" inputMode="decimal" pattern="[0-9]*" 
                className="w-full text-lg text-blue-600 border border-slate-300 px-3 py-2 outline-none focus:border-blue-500 font-bold" 
                value={paymentData.amount}
                onChange={(e) => setPaymentData({...paymentData, amount: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] text-black uppercase tracking-widest font-bold block">Method</label>
                <select className="w-full border border-slate-300 px-3 py-2 outline-none focus:border-blue-500 text-sm font-bold" value={paymentData.method} onChange={e => setPaymentData({...paymentData, method: e.target.value})}>
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="UPI">UPI</option>
                  <option value="Settlement">Settlement</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-black uppercase tracking-widest font-bold block">Date</label>
                <input type="date" className="w-full border border-slate-300 px-3 py-2 outline-none focus:border-blue-500 text-sm" value={paymentData.date} onChange={e => setPaymentData({...paymentData, date: e.target.value})} />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-black uppercase tracking-widest font-bold block">Description</label>
              <input type="text" className="w-full border border-slate-300 px-3 py-2 outline-none focus:border-blue-500 text-sm" value={paymentData.description} onChange={e => setPaymentData({...paymentData, description: e.target.value})} placeholder="Optional" />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <button disabled={isSaving} onClick={() => setShowPaymentModal(false)} className="flex-1 min-w-[80px] px-3 py-2.5 bg-slate-100 text-black hover:bg-slate-200 border border-slate-300 text-xs tracking-wide font-bold">
              Cancel
            </button>
            <button onClick={() => handleSavePayment(false)} disabled={!paymentData.amount || isSaving} className="flex-1 min-w-[100px] px-3 py-2.5 bg-blue-600 text-white hover:bg-blue-700 border border-blue-700 disabled:opacity-50 text-xs tracking-wide font-bold">
              {isSaving ? 'Saving...' : 'Save'}
            </button>
            {allFarmers && allFarmers.length > 0 && onNavigateToFarmer && (
              <button onClick={() => handleSavePayment(true)} disabled={!paymentData.amount || isSaving} className="w-full md:flex-1 md:w-auto px-3 py-2.5 bg-emerald-600 text-white hover:bg-emerald-700 border border-emerald-700 disabled:opacity-50 text-xs tracking-wide font-bold whitespace-nowrap">
                {isSaving ? 'Saving...' : 'Save & Next'}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white flex flex-col w-full border-0 min-h-[100dvh]">
      <div className="bg-slate-900 p-4 text-white relative">
        <div className="relative z-10">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2">
              <button onClick={onClose} className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex bg-slate-800 p-0.5 border border-slate-700">
                <button 
                  onClick={() => setViewMode('list')}
                  className={`px-2 py-1 md:px-3 md:py-1 text-[10px] md:text-xs border ${viewMode === 'list' ? 'bg-white text-black border-white' : 'text-white border-transparent hover:text-white/80'}`}
                >
                  List
                </button>
                <button 
                  onClick={() => setViewMode('calendar')}
                  className={`px-2 py-1 md:px-3 md:py-1 text-[10px] md:text-xs border ${viewMode === 'calendar' ? 'bg-white text-black border-white' : 'text-white border-transparent hover:text-white/80'}`}
                >
                  Calendar
                </button>
              </div>
            </div>
            <div className="flex items-center gap-1.5 md:gap-2">
               <button onClick={() => window.print()} className="p-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 hidden md:block">
                 <Printer className="w-4 h-4" />
               </button>
               <button 
                 onClick={() => setShowPaymentModal(true)}
                 className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 border border-blue-700 text-[10px] md:text-xs tracking-wide text-white font-bold whitespace-nowrap"
               >
                 Payment
               </button>
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 bg-slate-800 flex items-center justify-center border border-slate-700">
                  <IndianRupee className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-xl md:text-2xl uppercase tracking-tight font-bold">{farmer.name}</h3>
                  <p className="text-slate-300 uppercase tracking-widest text-[9px] md:text-[10px] flex items-center gap-2">
                    FARMER SUPPLY RECORDS / PROFILE
                  </p>
                </div>
              </div>
            </div>
            <div className="md:text-right bg-slate-800 p-3 border border-slate-700">
              <p className="text-slate-300 text-[9px] md:text-[10px] uppercase tracking-widest mb-0.5">Payable Balance</p>
              <h4 className={`text-2xl font-bold ${(farmer.balance || 0) > 0 ? 'text-green-400' : 'text-red-400'}`}>
                ₹ {Math.abs(farmer.balance || 0).toLocaleString()} <span className="text-sm font-normal">{(farmer.balance || 0) > 0 ? '(Cr)' : '(Dr)'}</span>
              </h4>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-6 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between bg-slate-50 gap-4">
        <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-2 bg-white border border-slate-200 p-1.5 px-4 w-full md:w-auto justify-between">
             <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1 hover:bg-slate-100 border border-slate-200"><ChevronLeft className="w-5 h-5 text-black" /></button>
             <span className="text-sm uppercase tracking-widest min-w-[140px] text-center text-black font-semibold">{format(currentMonth, 'MMMM yyyy')}</span>
             <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1 hover:bg-slate-100 border border-slate-200"><ChevronRight className="w-5 h-5 text-black" /></button>
          </div>
        </div>
        <div className="flex items-center gap-6 bg-white p-3 md:p-4 border border-slate-200 justify-between md:justify-end w-full md:w-auto">
          <div className="text-left md:text-right">
             <p className="text-black text-[10px] uppercase mb-1 tracking-wider">Milk Procurement</p>
             <p className="text-black text-sm md:text-base font-bold">₹ {collections.reduce((sum, c) => sum + (c.amount || 0), 0).toLocaleString()}</p>
          </div>
          <div className="text-right border-l border-slate-200 pl-6">
             <p className="text-black text-[10px] uppercase mb-1 tracking-wider">Paid Amount</p>
             <p className="text-black text-sm md:text-base font-bold">₹ {transactions.reduce((sum, t) => sum + (t.type === 'debit' ? t.amount : -t.amount), 0).toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className="w-full p-0">
        {loading ? (
          <div className="p-12 text-center text-black  uppercase tracking-widest text-[10px]">Loading Records...</div>
        ) : viewMode === 'list' ? (
          <>
            {/* Responsive Table */}
            <div className="block max-h-[600px] overflow-y-auto overflow-x-auto">
              <table className="w-full text-left border-collapse border border-slate-200">
                <thead className="bg-slate-50 sticky top-0 text-black text-sm font-semibold border-b border-slate-200 z-10">
                  <tr>
                    <th className="px-4 py-3 border-b border-slate-200 whitespace-nowrap">Date</th>
                    <th className="px-4 py-3 border-b border-slate-200 whitespace-nowrap">Entry Details</th>
                    <th className="px-4 py-3 border-b border-slate-200 text-center whitespace-nowrap">Quality (Fat/SNF)</th>
                    <th className="px-4 py-3 border-b border-slate-200 text-right whitespace-nowrap">Procurement (+)</th>
                    <th className="px-4 py-3 border-b border-slate-200 text-right whitespace-nowrap">Payment (-)</th>
                    <th className="px-4 py-3 border-b border-slate-200 text-center w-24 whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {combinedHistory.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="px-4 py-3 border-b border-slate-200 whitespace-nowrap">
                        <div className="flex flex-col">
                            <span className="text-sm text-black">{item.date}</span>
                            <span className="text-xs text-slate-500 capitalize mt-1">{item.entryType === 'collection' ? (item as any).session : ((item as any).method || 'Entry')}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 border-b border-slate-200 whitespace-nowrap">
                        <span className={`text-xs capitalize ${(item as any).method === 'Settlement' ? 'text-amber-600 bg-amber-50 border border-amber-200 inline-block px-3 py-1' : 'text-black'}`}>
                          {item.entryType === 'collection' ? 'Milk Collection' : ((item as any).method === 'Settlement' ? 'Settlement / Clear' : ((item as any).description || 'Payment'))}
                        </span>
                      </td>
                      <td className="px-4 py-3 border-b border-slate-200 text-center whitespace-nowrap">
                        {item.entryType === 'collection' ? (
                          <div className="flex flex-col items-center bg-emerald-50 py-1.5 px-3 w-fit mx-auto border border-emerald-200">
                             <span className="text-sm text-emerald-950 font-bold">{(item as any).quantity} L</span>
                             <span className="text-xs text-emerald-700 mt-0.5">F: {(item as any).fat} / S: {(item as any).snf}</span>
                          </div>
                        ) : <span className="text-slate-300">-</span>}
                      </td>
                      <td className="px-4 py-3 border-b border-slate-200 text-right font-mono text-sm text-emerald-600 font-bold whitespace-nowrap">
                        {item.entryType === 'collection' ? `+ ₹${item.amount || 0}` : (item.type === 'credit' ? `+ ₹${item.amount || 0}` : <span className="text-slate-300">-</span>)}
                      </td>
                      <td className="px-4 py-3 border-b border-slate-200 text-right font-mono text-sm text-red-600 font-bold whitespace-nowrap">
                        {item.entryType === 'transaction' && item.type === 'debit' ? `- ₹${item.amount || 0}` : <span className="text-slate-300">-</span>}
                      </td>
                      <td className="px-4 py-3 border-b border-slate-200 text-center whitespace-nowrap">
                        <div className="flex justify-center gap-2">
                          {item.entryType === 'collection' && ((item as any).editCount || 0) < 2 && (!farmer.lastSettledDate || item.date > farmer.lastSettledDate) && (
                            <button 
                              onClick={() => setEditingCollection(item as MilkCollection)}
                              className="p-2 bg-slate-100 hover:bg-slate-200 text-black border border-slate-300"
                              title="Edit Entry"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                          {item.entryType === 'transaction' && (!farmer.lastSettledDate || item.date > farmer.lastSettledDate || (item as any).method === 'Settlement') && (
                            <button 
                              onClick={() => handleDeleteTransaction(item as Transaction)}
                              className="p-2 bg-slate-100 hover:bg-red-100 text-red-500 border border-slate-300"
                              title="Delete Transaction"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <>
            <div className="p-0 w-full overflow-hidden">
             <div className="grid grid-cols-7 gap-px bg-slate-200 border border-slate-200">
               {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                 <div key={i} className="bg-slate-50 p-1 md:p-2 text-center text-[8px] md:text-[10px] uppercase tracking-widest text-black border-b border-slate-200">{d}</div>
               ))}
               {daysInMonth.map((day, i) => {
                 const dateStr = format(day, 'yyyy-MM-dd');
                 const dayCollections = collections.filter(c => c.date === dateStr);
                 const colVol = dayCollections.reduce((sum, c) => sum + (c.quantity || 0), 0);
                 const colAmt = dayCollections.reduce((sum, c) => sum + (c.amount || 0), 0);
                 const dayTransactions = transactions.filter(t => t.date === dateStr);
                 const payAmt = dayTransactions.reduce((sum, t) => sum + (t.type === 'debit' ? t.amount : 0), 0);
                 
                 return (
                    <div key={i} className={`bg-white min-h-[60px] md:min-h-[80px] p-0.5 md:p-1 overflow-hidden ${!isSameMonth(day, currentMonth) ? 'bg-slate-50 opacity-50' : ''} ${isToday(day) ? 'bg-blue-50/30' : ''}`}>
                     <div className="text-[8px] md:text-[10px] text-slate-400 mb-0.5">{format(day, 'd')}</div>
                     <div className="space-y-0.5">
                         {colVol > 0 && (
                           <div className="text-[7px] md:text-[9px] leading-tight mb-0.5 bg-emerald-50 p-0.5 truncate border border-emerald-100" title={`Milk: ${colVol}L, ₹${colAmt.toLocaleString()}`}>
                             <div className="text-emerald-700 font-bold truncate">{colVol}L</div>
                             <div className="text-slate-600 truncate">₹{colAmt.toLocaleString()}</div>
                           </div>
                         )}
                         {payAmt > 0 && (
                           <div className="text-[7px] md:text-[9px] leading-tight bg-blue-50 p-0.5 truncate border border-blue-100 text-blue-700" title={`Payment: ₹${payAmt.toLocaleString()}`}>
                             <span className="font-bold truncate">₹{payAmt.toLocaleString()}</span>
                           </div>
                         )}
                     </div>
                   </div>
                 );
               })}
             </div>
             <div className="mt-4 flex gap-4">
                <div className="flex items-center gap-2 text-[9px]  text-black">
                  <div className="w-3 h-3 bg-emerald-50 border border-emerald-100"></div> Milk Collection
                </div>
                <div className="flex items-center gap-2 text-[9px]  text-black">
                  <div className="w-3 h-3 bg-red-50 border border-red-100"></div> Payment Sent
                </div>
                <div className="flex items-center gap-2 text-[9px]  text-black">
                  <div className="w-3 h-3 bg-emerald-50 border border-emerald-100"></div> Received from Farmer
                </div>
             </div>
          </div>
          </>
        )}
        {combinedHistory.length === 0 && !loading && (
          <div className="py-20 text-center text-black  uppercase tracking-widest text-[10px]">No records found for this period.</div>
        )}
      </div>

      <EditMilkModal 
        isOpen={!!editingCollection} 
        collection={editingCollection} 
        onClose={() => setEditingCollection(null)} 
        onSuccess={() => {
          setEditingCollection(null);
          loadHistory();
          onRefresh();
        }} 
      />
    </div>
  );
}
