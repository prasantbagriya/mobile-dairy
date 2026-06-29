import { useState, useEffect, useMemo, memo } from 'react';
import { db } from '../lib/db';
import { collection, query, where, getDocs, orderBy, writeBatch, doc, onSnapshot, increment } from 'firebase/firestore';
import { MilkCollection, MilkDelivery, Transaction, Farmer, Customer } from '../types';
import { ArrowLeft, Calendar, FileText, IndianRupee, Printer, Trash2, ChevronLeft, ChevronRight, Settings, X, Info, Edit2 } from 'lucide-react';
import dayjs from 'dayjs';
import { eachDayOfInterval, addMonths, isSameMonth, isToday } from '../lib/dateUtils';
import EditMilkModal from './EditMilkModal';
import toast from 'react-hot-toast';
import { useAuth } from "../lib/auth";

type Person = Farmer | Customer;

interface SharedLedgerProps {
  person: Person;
  type: 'farmer' | 'customer';
  allPersons?: Person[];
  onClose: () => void;
  onRefresh: () => void;
  onNavigateToPerson?: (p: Person) => void;
}

const SharedLedger = memo(({ person, type, allPersons = [], onClose, onRefresh, onNavigateToPerson }: SharedLedgerProps) => {
  const { tenantId } = useAuth();
  const isFarmer = type === 'farmer';
  const [allMilkRecords, setAllMilkRecords] = useState<(MilkCollection | MilkDelivery)[]>([]);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingCollection, setEditingCollection] = useState<MilkCollection | null>(null);
  const [paymentData, setPaymentData] = useState({
    type: isFarmer ? 'debit' : 'credit' as 'credit' | 'debit',
    amount: '',
    date: dayjs().format('YYYY-MM-DD'),
    method: 'Cash',
    description: ''
  });
  
  const [localBalance, setLocalBalance] = useState(person.balance || 0);

  useEffect(() => {
    setLocalBalance(person.balance || 0);
  }, [person.balance]);

  const dateRange = useMemo(() => ({
    start: dayjs(currentMonth).startOf('month').format('YYYY-MM-DD'),
    end: dayjs(currentMonth).endOf('month').format('YYYY-MM-DD')
  }), [currentMonth]);

  useEffect(() => {
    if (!tenantId || !person.id) return;
    setLoading(true);

    const milkCollectionName = isFarmer ? 'milk_collections' : 'milk_deliveries';
    const idField = isFarmer ? 'farmerId' : 'customerId';

    const milkQuery = query(
      collection(db, milkCollectionName),
      where(idField, '==', person.id),
      orderBy('date', 'desc')
    );
    const unsubMilk = onSnapshot(milkQuery, (snap) => {
      setAllMilkRecords(snap.docs.map(d => ({ id: d.id, ...d.data() } as any)));
      setLoading(false);
    }, (e) => {
      console.error("Ledger Load Error:", e);
      setLoading(false);
    });

    const transQuery = query(
      collection(db, 'transactions'),
      where('personId', '==', person.id),
      where('personType', '==', type),
      orderBy('date', 'desc')
    );
    const unsubTrans = onSnapshot(transQuery, (snap) => {
      setAllTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction)));
    }, (e) => {
      console.error("Trans Load Error:", e);
    });

    return () => {
      unsubMilk();
      unsubTrans();
    };
  }, [person.id, tenantId, type, isFarmer]);

  const milkRecords = useMemo(() => allMilkRecords.filter(m => m.date >= dateRange.start && m.date <= dateRange.end), [allMilkRecords, dateRange.start, dateRange.end]);
  const transactions = useMemo(() => allTransactions.filter(t => t.date >= dateRange.start && t.date <= dateRange.end), [allTransactions, dateRange.start, dateRange.end]);

  const combinedHistory = useMemo(() => [
    ...milkRecords.map(m => ({ ...m, entryType: 'milk' as const })),
    ...transactions.map(t => ({ ...t, entryType: 'transaction' as const }))
  ].sort((a, b) => (b.date || '').localeCompare(a.date || '')), [milkRecords, transactions]);

  const dailyAggregations = useMemo(() => {
    const agg: Record<string, { milkVol: number, milkAmt: number, payAmt: number }> = {};
    milkRecords.forEach(c => {
      if (!c.date) return;
      if (!agg[c.date]) agg[c.date] = { milkVol: 0, milkAmt: 0, payAmt: 0 };
      agg[c.date].milkVol += (c.quantity || 0);
      agg[c.date].milkAmt += (c.amount || 0);
    });
    transactions.forEach(t => {
      if (!t.date) return;
      if (!agg[t.date]) agg[t.date] = { milkVol: 0, milkAmt: 0, payAmt: 0 };
      agg[t.date].payAmt += (t.type === (isFarmer ? 'debit' : 'credit') ? t.amount : (isFarmer ? 0 : -t.amount));
    });
    return agg;
  }, [milkRecords, transactions, isFarmer]);

  async function handleSavePayment(goNext: boolean = false) {
    if (!person.id || !paymentData.amount || isSaving) return;
    setIsSaving(true);
    try {
      const batch = writeBatch(db);
      const amountNum = parseFloat(paymentData.amount);
      
      const transData: Omit<Transaction, 'id'> = {
        amount: amountNum,
        date: paymentData.date,
        description: paymentData.description || 'Manual Entry',
        method: paymentData.method,
        personId: person.id,
        personType: type,
        type: paymentData.type,
        createdAt: new Date().toISOString(),
        userId: tenantId
      };
      
      let balanceChange = 0;
      if (isFarmer) {
        // Farmer: Debit = Paid them (balance decreases), Credit = They gave us money (balance increases)
        balanceChange = paymentData.type === 'debit' ? -amountNum : amountNum;
      } else {
        // Customer: Credit = Paid us (balance decreases), Debit = We gave them money (balance increases)
        balanceChange = paymentData.type === 'credit' ? -amountNum : amountNum;
      }
      
      const transRef = doc(collection(db, 'transactions'));
      batch.set(transRef, transData);
      
      const updateData: any = { balance: localBalance + balanceChange };
      
      if (!person.mobile) updateData.mobile = "0000000000";
      if (isFarmer && !(person as Farmer).village) updateData.village = "Not specified";

      if (paymentData.method === 'Settlement') {
        updateData.lastSettledDate = paymentData.date;
      }

      batch.update(doc(db, isFarmer ? 'farmers' : 'customers', person.id), updateData);
      
      await batch.commit();
      setLocalBalance(localBalance + balanceChange);
      setShowPaymentModal(false);
      setPaymentData({ ...paymentData, amount: '', description: '' });
      if (paymentData.method === 'Settlement') {
        toast.success(`Settled successfully for ${person.name}`);
      } else {
        toast.success(`Payment recorded for ${person.name}`);
      }
      onRefresh();

      if (goNext && allPersons && onNavigateToPerson) {
        const sortedPersons = [...allPersons].sort((a, b) => ((a as any).sequence || 0) - ((b as any).sequence || 0));
        const currentIndex = sortedPersons.findIndex(p => p.id === person.id);
        if (currentIndex !== -1 && currentIndex < sortedPersons.length - 1) {
          onNavigateToPerson(sortedPersons[currentIndex + 1]);
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
      
      let reverseChange = 0;
      if (isFarmer) {
        reverseChange = item.type === 'debit' ? item.amount : -item.amount;
      } else {
        reverseChange = item.type === 'credit' ? item.amount : -item.amount;
      }
      
      batch.update(doc(db, isFarmer ? 'farmers' : 'customers', person.id!), {
        balance: increment(reverseChange)
      });
      await batch.commit();
      setLocalBalance(prev => prev + reverseChange);
      toast.success("Transaction deleted successfully");
      onRefresh();
    } catch(e: any) {
      console.error(e);
      toast.error("Error deleting transaction: " + e.message);
    }
  }

  let daysInMonth: Date[] = [];
  let startDay = 0;
  try {
    daysInMonth = eachDayOfInterval({
      start: dayjs(currentMonth).startOf('month').toDate(),
      end: dayjs(currentMonth).endOf('month').toDate()
    });
    startDay = dayjs(currentMonth).startOf('month').toDate().getDay();
  } catch (e) {
    console.error("Calendar Error:", e);
  }

  const bgColorClass = isFarmer ? 'bg-blue-600 hover:bg-blue-700 border-blue-700' : 'bg-orange-600 hover:bg-orange-700 border-orange-700';

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
                 className={`flex items-center gap-1 px-3 py-1.5 ${isFarmer ? 'bg-blue-600 hover:bg-blue-700 border-blue-700' : 'bg-emerald-600 hover:bg-emerald-700 border-emerald-700'} text-[10px] md:text-xs tracking-wide text-white font-bold whitespace-nowrap border`}
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
                  <h3 className="text-xl md:text-2xl uppercase tracking-tight font-bold">{person.name}</h3>
                  <p className="text-slate-300 uppercase tracking-widest text-[9px] md:text-[10px] flex items-center gap-2">
                    {isFarmer ? 'FARMER SUPPLY RECORDS' : 'CUSTOMER LEDGER'} / PROFILE
                  </p>
                </div>
              </div>
            </div>
            <div className="md:text-right bg-slate-800 p-3 border border-slate-700">
              <p className="text-slate-300 text-[9px] md:text-[10px] uppercase tracking-widest mb-0.5">{isFarmer ? 'Payable Balance' : 'Current Dues'}</p>
              <h4 className={`text-2xl font-bold ${isFarmer ? (localBalance > 0 ? 'text-green-400' : 'text-red-400') : (localBalance > 0 ? 'text-red-400' : 'text-green-400')}`}>
                ₹ {Math.abs(localBalance).toLocaleString()} <span className="text-sm font-normal">{isFarmer ? (localBalance > 0 ? '(Cr)' : '(Dr)') : (localBalance > 0 ? '(Dr)' : '(Cr)')}</span>
              </h4>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-6 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between bg-slate-50 gap-4">
        <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-2 bg-white border border-slate-200 p-1.5 px-4 w-full md:w-auto justify-between">
             <button onClick={() => setCurrentMonth(dayjs(currentMonth).subtract(1, 'month').toDate())} className="p-1 hover:bg-slate-100 border border-slate-200"><ChevronLeft className="w-5 h-5 text-black" /></button>
             <span className="text-sm uppercase tracking-widest min-w-[140px] text-center text-black font-semibold">{dayjs(currentMonth).format('MMMM YYYY')}</span>
             <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1 hover:bg-slate-100 border border-slate-200"><ChevronRight className="w-5 h-5 text-black" /></button>
          </div>
        </div>
        <div className="flex items-center gap-6 bg-white p-3 md:p-4 border border-slate-200 justify-between md:justify-end w-full md:w-auto">
          <div className="text-left md:text-right">
             <p className="text-black text-[10px] uppercase mb-1 tracking-wider">{isFarmer ? 'Milk Procurement' : 'Milk Value'}</p>
             <p className="text-black text-sm md:text-base font-bold">₹ {milkRecords.reduce((sum, c) => sum + (c.amount || 0), 0).toLocaleString()}</p>
          </div>
          <div className="text-right border-l border-slate-200 pl-6">
             <p className="text-black text-[10px] uppercase mb-1 tracking-wider">{isFarmer ? 'Paid Amount' : 'Payments'}</p>
             <p className="text-black text-sm md:text-base font-bold">₹ {transactions.reduce((sum, t) => sum + (t.type === (isFarmer ? 'debit' : 'credit') ? t.amount : -t.amount), 0).toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className="w-full p-2 md:p-4">
        {loading ? (
          <div className="p-12 text-center text-black uppercase tracking-widest text-[10px]">Loading Records...</div>
        ) : viewMode === 'list' ? (
          <div className="block max-h-[600px] overflow-y-auto overflow-x-auto no-scrollbar">
            <table className="w-full text-left border-collapse border border-slate-200">
              <thead className="bg-slate-50 sticky top-0 text-black text-sm font-semibold border-b border-slate-200 z-10">
                <tr>
                  <th className="px-4 py-3 border-b border-slate-200 whitespace-nowrap">Date</th>
                  <th className="px-4 py-3 border-b border-slate-200 whitespace-nowrap">Entry Details</th>
                  <th className="px-4 py-3 border-b border-slate-200 text-center whitespace-nowrap">{isFarmer ? 'Quality (Fat/SNF)' : 'Qty / Rate'}</th>
                  <th className="px-4 py-3 border-b border-slate-200 text-right whitespace-nowrap">{isFarmer ? 'Procurement (+)' : 'Debit (+)'}</th>
                  <th className="px-4 py-3 border-b border-slate-200 text-right whitespace-nowrap">{isFarmer ? 'Payment (-)' : 'Credit (-)'}</th>
                  <th className="px-4 py-3 border-b border-slate-200 text-center w-24 whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {combinedHistory.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="px-4 py-3 border-b border-slate-200 whitespace-nowrap">
                      <div className="flex flex-col">
                          <span className="text-sm text-black">{item.date}</span>
                          <span className="text-xs text-slate-500 capitalize mt-1">{item.entryType === 'milk' ? (item as any).session : ((item as any).method || 'Entry')}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 border-b border-slate-200 whitespace-nowrap">
                      {isFarmer ? (
                        <span className={`text-xs capitalize ${(item as any).method === 'Settlement' ? 'text-amber-600 bg-amber-50 border border-amber-200 inline-block px-3 py-1' : 'text-black'}`}>
                          {item.entryType === 'milk' ? 'Milk Collection' : ((item as any).method === 'Settlement' ? 'Settlement / Clear' : ((item as any).description || 'Payment'))}
                        </span>
                      ) : (
                        <div className="flex items-center gap-3">
                          {item.entryType === 'milk' ? (
                            <div className="p-2 bg-orange-50 text-orange-600 border border-orange-200"><FileText className="w-4 h-4" /></div>
                          ) : (
                            <div className={`p-2 border ${(item as any).method === 'Settlement' ? 'bg-amber-50 text-amber-600 border-amber-200' : ((item as Transaction).type === 'debit' ? 'bg-red-50 text-red-500 border-red-100' : 'bg-emerald-50 text-emerald-500 border-emerald-100')}`}>
                              <IndianRupee className="w-4 h-4" />
                            </div>
                          )}
                          <p className={`text-[12px] capitalize ${(item as any).method === 'Settlement' ? 'text-amber-700 font-bold' : 'text-black'}`}>
                            {item.entryType === 'milk' ? 'Milk Delivery' : ((item as any).method === 'Settlement' ? 'Account Settlement' : ((item as any).description || 'Payment'))}
                          </p>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 border-b border-slate-200 text-center whitespace-nowrap">
                      {item.entryType === 'milk' ? (
                        <div className={`flex flex-col items-center py-1.5 px-3 w-fit mx-auto border ${isFarmer ? 'bg-emerald-50 border-emerald-200' : 'bg-orange-50 border-orange-200'}`}>
                           <span className={`text-sm font-bold ${isFarmer ? 'text-emerald-950' : 'text-orange-950'}`}>{(item as any).quantity} L</span>
                           {isFarmer ? (
                             <span className="text-xs text-emerald-700 mt-0.5">F: {(item as any).fat} / S: {(item as any).snf}</span>
                           ) : (
                             <span className="text-xs text-orange-600 mt-0.5 font-bold">@ ₹{(item as any).rate}/L</span>
                           )}
                        </div>
                      ) : <span className="text-slate-300">-</span>}
                    </td>
                    <td className={`px-4 py-3 border-b border-slate-200 text-right font-mono text-sm font-bold whitespace-nowrap ${isFarmer ? 'text-emerald-600' : 'text-red-500'}`}>
                      {item.entryType === 'milk' ? `+ ₹${item.amount || 0}` : ((item as Transaction).type === (isFarmer ? 'credit' : 'debit') ? `+ ₹${item.amount || 0}` : <span className="text-slate-300">-</span>)}
                    </td>
                    <td className={`px-4 py-3 border-b border-slate-200 text-right font-mono text-sm font-bold whitespace-nowrap ${isFarmer ? 'text-red-600' : 'text-emerald-600'}`}>
                      {item.entryType === 'transaction' && (item as Transaction).type === (isFarmer ? 'debit' : 'credit') ? `- ₹${item.amount || 0}` : <span className="text-slate-300">-</span>}
                    </td>
                    <td className="px-4 py-3 border-b border-slate-200 text-center whitespace-nowrap">
                      <div className="flex justify-center gap-2">
                        {isFarmer && item.entryType === 'milk' && ((item as any).editCount || 0) < 2 && (!person.lastSettledDate || item.date > person.lastSettledDate) && (
                          <button 
                            onClick={() => setEditingCollection(item as MilkCollection)}
                            className="p-2 bg-slate-100 hover:bg-slate-200 text-black border border-slate-300"
                            title="Edit Entry"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        {item.entryType === 'transaction' && (!person.lastSettledDate || item.date > person.lastSettledDate || (item as any).method === 'Settlement') && (
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
        ) : (
          <>
            <div className="p-0 w-full overflow-hidden">
             <div className="grid grid-cols-7 gap-px bg-slate-200 border border-slate-200">
               {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                 <div key={i} className="bg-slate-50 p-1 md:p-2 text-center text-[8px] md:text-[10px] uppercase tracking-widest text-black border-b border-slate-200">{d}</div>
               ))}
               {!isFarmer && Array.from({ length: startDay }).map((_, i) => (
                 <div key={`empty-${i}`} className="bg-slate-50 border border-slate-100 h-[60px] md:h-[100px]"></div>
               ))}
               {daysInMonth.map((day, i) => {
                 const dateStr = dayjs(day).format('YYYY-MM-DD');
                 const stats = dailyAggregations[dateStr] || { milkVol: 0, milkAmt: 0, payAmt: 0 };
                 const milkVol = stats.milkVol;
                 const milkAmt = stats.milkAmt;
                 const payAmt = stats.payAmt;
                 
                 return (
                    <div key={i} className={`bg-white min-h-[60px] md:min-h-[80px] p-0.5 md:p-1 overflow-hidden ${!isSameMonth(day, currentMonth) ? 'bg-slate-50 opacity-50' : ''} ${isToday(day) ? 'bg-blue-50/30' : ''}`}>
                     <div className="text-[8px] md:text-[10px] text-slate-400 mb-0.5">{dayjs(day).format('d')}</div>
                     <div className="space-y-0.5">
                         {milkVol > 0 && (
                           <div className={`text-[7px] md:text-[9px] leading-tight mb-0.5 p-0.5 truncate border ${isFarmer ? 'bg-emerald-50 border-emerald-100' : 'bg-orange-50 border-orange-100'}`} title={`Milk: ${milkVol}L, ₹${milkAmt.toLocaleString()}`}>
                             <div className={`${isFarmer ? 'text-emerald-700' : 'text-orange-600'} font-bold truncate`}>{milkVol}L</div>
                             <div className="text-slate-600 truncate">₹{milkAmt.toLocaleString()}</div>
                           </div>
                         )}
                         {payAmt > 0 && (
                           <div className="text-[7px] md:text-[9px] leading-tight bg-blue-50 p-0.5 truncate border border-blue-100 text-blue-700" title={`${isFarmer ? 'Payment' : 'Receipt'}: ₹${payAmt.toLocaleString()}`}>
                             <span className="font-bold truncate">₹{payAmt.toLocaleString()}</span>
                           </div>
                         )}
                     </div>
                   </div>
                 );
               })}
             </div>
           </div>
           <div className="mt-4 flex gap-4">
              <div className="flex items-center gap-2 text-[9px] text-black">
                <div className={`w-3 h-3 border ${isFarmer ? 'bg-emerald-50 border-emerald-100' : 'bg-orange-50 border-orange-100'}`}></div> Milk {isFarmer ? 'Collection' : 'Delivery'}
              </div>
              <div className="flex items-center gap-2 text-[9px] text-black">
                <div className={`w-3 h-3 border ${isFarmer ? 'bg-red-50 border-red-100' : 'bg-emerald-50 border-emerald-100'}`}></div> {isFarmer ? 'Payment Sent' : 'Payment Received'}
              </div>
              <div className="flex items-center gap-2 text-[9px] text-black">
                <div className={`w-3 h-3 border ${isFarmer ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}></div> {isFarmer ? 'Received from Farmer' : 'Advance / Refund'}
              </div>
           </div>
          </>
        )}
        {combinedHistory.length === 0 && !loading && (
          <div className="py-20 text-center text-black uppercase tracking-widest text-[10px]">No records found for this period.</div>
        )}
      </div>

      {showPaymentModal && (
        <div className="fixed inset-0 bg-slate-50 z-[100] flex flex-col items-center overflow-y-auto">
          <div className={`${isFarmer ? 'bg-blue-600 border-blue-700' : 'bg-emerald-600 border-emerald-700'} w-full p-3 text-white flex items-center justify-between sticky top-0 z-10 shadow-md`}>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowPaymentModal(false)} className={`p-1 ${isFarmer ? 'hover:bg-blue-700' : 'hover:bg-emerald-700'} transition-colors`}>
                <ArrowLeft className="w-4 h-4" />
              </button>
              <h3 className="text-base tracking-tight font-bold">Record Payment - {person.name}</h3>
            </div>
          </div>
          
          <div className="flex-1 w-full max-w-md flex flex-col justify-center py-6 px-4">
            <div className="bg-white w-full shadow-lg border border-slate-200 flex flex-col rounded-xl relative overflow-hidden">
              <div className="p-3 md:p-4 flex-1 flex flex-col w-full gap-3">
              <div className="flex justify-between items-center p-2 md:p-3 bg-slate-50 border border-slate-200 overflow-x-auto">
                <span className="text-black text-[11px] md:text-sm font-bold whitespace-nowrap">{isFarmer ? 'Current Balance' : 'Current Dues'}</span>
                <div className="flex items-center gap-2 md:gap-3 ml-2">
                  <span className={`text-lg md:text-xl font-bold whitespace-nowrap ${isFarmer ? (localBalance >= 0 ? 'text-emerald-600' : 'text-red-600') : (localBalance > 0 ? 'text-red-500' : 'text-emerald-500')}`}>
                    ₹ {Math.abs(localBalance).toLocaleString()} {isFarmer ? (localBalance >= 0 ? '(Dr)' : '(Cr)') : (localBalance > 0 ? '(Dr)' : '(Cr)')}
                  </span>
                  {localBalance !== 0 && (
                    <button 
                      onClick={() => {
                        setPaymentData({
                          ...paymentData,
                          amount: Math.abs(localBalance).toString(),
                          type: isFarmer ? (localBalance > 0 ? 'debit' : 'credit') : (localBalance > 0 ? 'credit' : 'debit'),
                          method: 'Settlement',
                          description: 'Full Balance Settlement'
                        });
                      }}
                      className={`px-2 md:px-3 py-1.5 whitespace-nowrap ${isFarmer ? 'bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-200' : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-emerald-200'} text-xs border font-bold shadow-sm`}
                    >
                      Settle All
                    </button>
                  )}
                </div>
              </div>

              <div className="flex bg-slate-100 p-1 shadow-inner">
                <button onClick={() => setPaymentData({...paymentData, type: 'credit'})} className={`flex-1 py-2 text-xs md:text-sm font-medium border shadow-sm ${paymentData.type === 'credit' ? 'bg-emerald-600 text-white border-emerald-600' : 'text-black bg-transparent border-transparent hover:bg-slate-200 shadow-none'}`}>Received (+)</button>
                <button onClick={() => setPaymentData({...paymentData, type: 'debit'})} className={`flex-1 py-2 text-xs md:text-sm font-medium border shadow-sm ${paymentData.type === 'debit' ? 'bg-red-600 text-white border-red-600' : 'text-black bg-transparent border-transparent hover:bg-slate-200 shadow-none'}`}>Paid (-)</button>
              </div>

              <div className="flex-1 flex flex-col gap-3 mt-1">
                <div className="space-y-1">
                  <label className="text-sm text-black block">Amount (₹)</label>
                  <input 
                    type="number" inputMode="decimal" pattern="[0-9]*" 
                    className="w-full text-xl text-blue-600 border-2 border-slate-300 px-3 py-2 outline-none focus:border-blue-500 bg-white" 
                    value={paymentData.amount}
                    onChange={(e) => setPaymentData({...paymentData, amount: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-sm text-black block">Method</label>
                    <select className="w-full border-2 border-slate-300 px-3 py-2 outline-none focus:border-blue-500 text-base bg-white" value={paymentData.method} onChange={e => setPaymentData({...paymentData, method: e.target.value})}>
                      <option value="Cash">Cash</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="UPI">UPI</option>
                      <option value="Settlement">Settlement</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm text-black block">Date</label>
                    <input type="date" className="w-full border-2 border-slate-300 px-3 py-2 outline-none focus:border-blue-500 text-base bg-white" value={paymentData.date} onChange={e => setPaymentData({...paymentData, date: e.target.value})} />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-sm text-black block">Description / Note</label>
                  <input type="text" className="w-full border-2 border-slate-300 px-3 py-2 outline-none focus:border-blue-500 text-base bg-white" value={paymentData.description} onChange={e => setPaymentData({...paymentData, description: e.target.value})} placeholder="Optional" />
                </div>
              </div>

              <div className="flex flex-col gap-2 mt-auto pt-4 pb-4 md:pb-0">
                <div className="flex gap-2">
                  <button disabled={isSaving} onClick={() => setShowPaymentModal(false)} className="flex-1 px-3 py-2 bg-slate-100 text-black hover:bg-slate-200 border-2 border-slate-300 text-sm font-medium shadow-sm">
                    Cancel
                  </button>
                  <button onClick={() => handleSavePayment(false)} disabled={!paymentData.amount || isSaving} className="flex-1 px-3 py-2 bg-blue-600 text-white hover:bg-blue-700 border-2 border-blue-700 disabled:opacity-50 text-sm font-medium shadow-md">
                    {isSaving ? 'Saving...' : 'Save'}
                  </button>
                </div>
                {allPersons && allPersons.length > 0 && onNavigateToPerson && (
                  <button onClick={() => handleSavePayment(true)} disabled={!paymentData.amount || isSaving} className="w-full px-3 py-2 bg-emerald-600 text-white hover:bg-emerald-700 border-2 border-emerald-700 disabled:opacity-50 text-sm font-medium shadow-md whitespace-nowrap">
                    {isSaving ? 'Saving...' : 'Save & Next'}
                  </button>
                )}
              </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isFarmer && editingCollection && (
        <EditMilkModal 
          isOpen={!!editingCollection} 
          collection={editingCollection as MilkCollection} 
          onClose={() => setEditingCollection(null)} 
          onSuccess={() => {
            setEditingCollection(null);
            onRefresh();
          }} 
        />
      )}
    </div>
  );
});

export default SharedLedger;
