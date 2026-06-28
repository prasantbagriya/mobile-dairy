import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, orderBy, writeBatch, doc, onSnapshot } from 'firebase/firestore';
import { MilkDelivery, Transaction, Customer } from '../types';
import { ArrowLeft, Calendar, FileText, IndianRupee, Printer, Trash2, ChevronLeft, ChevronRight, Settings, X, Info } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isSameMonth, isToday, isSameDay } from 'date-fns';
import toast from 'react-hot-toast';

interface CustomerLedgerProps {
  customer: Customer;
  allCustomers?: Customer[];
  onClose: () => void;
  onRefresh: () => void;
  onNavigateToCustomer?: (c: Customer) => void;
}

import { useAuth } from "../lib/auth";
export default function CustomerLedger({ customer, allCustomers = [], onClose, onRefresh, onNavigateToCustomer }: CustomerLedgerProps) {
  const { tenantId } = useAuth();
  const [allDeliveries, setAllDeliveries] = useState<MilkDelivery[]>([]);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [paymentData, setPaymentData] = useState({
    type: 'credit' as 'credit' | 'debit', // credit = received from customer
    amount: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    method: 'Cash',
    description: ''
  });
  
  const [localBalance, setLocalBalance] = useState(customer.balance || 0);

  useEffect(() => {
    setLocalBalance(customer.balance || 0);
  }, [customer.balance]);

  const dateRange = {
    start: format(startOfMonth(currentMonth), 'yyyy-MM-dd'),
    end: format(endOfMonth(currentMonth), 'yyyy-MM-dd')
  };

  useEffect(() => {
    if (!tenantId) return;
    if (!customer.id) return;
    setLoading(true);

    const delQuery = query(
      collection(db, 'milk_deliveries'),
      where('customerId', '==', customer.id),
      orderBy('date', 'desc')
    );
    const unsubDel = onSnapshot(delQuery, (snap) => {
      setAllDeliveries(snap.docs.map(d => ({ id: d.id, ...d.data() } as MilkDelivery)));
      setLoading(false);
    }, (e) => {
      console.error("Ledger Load Error:", e);
      setLoading(false);
    });

    const transQuery = query(
      collection(db, 'transactions'),
      where('personId', '==', customer.id),
      where('personType', '==', 'customer'),
      orderBy('date', 'desc')
    );
    const unsubTrans = onSnapshot(transQuery, (snap) => {
      setAllTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction)));
    }, (e) => {
      console.error("Trans Load Error:", e);
    });

    return () => {
      unsubDel();
      unsubTrans();
    };
  }, [customer.id, tenantId]);

  const deliveries = allDeliveries.filter(d => d.date >= dateRange.start && d.date <= dateRange.end);
  const transactions = allTransactions.filter(t => t.date >= dateRange.start && t.date <= dateRange.end);

  async function loadHistory() {
    // Kept for interface compatibility but logic uses onSnapshot
  }

  const combinedHistory = [
    ...deliveries.map(d => ({ ...d, entryType: 'delivery' as const })),
    ...transactions.map(t => ({ ...t, entryType: 'transaction' as const }))
  ].sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  async function handleSavePayment(goNext: boolean = false) {
    if (!customer.id || !paymentData.amount || isSaving) return;
    setIsSaving(true);
    try {
      const batch = writeBatch(db);
      const amountNum = parseFloat(paymentData.amount);
      
      const transData: Omit<Transaction, 'id'> = {
        amount: amountNum,
        date: paymentData.date,
        description: paymentData.description || 'Manual Entry',
        method: paymentData.method,
        personId: customer.id,
        personType: 'customer',
        type: paymentData.type,
        createdAt: new Date().toISOString(),
        userId: tenantId
      };
      
      const balanceChange = paymentData.type === 'credit' ? -amountNum : amountNum;
      
      const transRef = doc(collection(db, 'transactions'));
      batch.set(transRef, transData);
      const updateData: any = { balance: localBalance + balanceChange };
      // Fallback for older documents missing required fields to pass Firestore rules
      if (!customer.mobile) updateData.mobile = "0000000000";

      if (paymentData.method === 'Settlement') {
        updateData.lastSettledDate = paymentData.date;
      }

      batch.update(doc(db, 'customers', customer.id), updateData);
      
      await batch.commit();
      setLocalBalance(localBalance + balanceChange);
      setShowPaymentModal(false);
      setPaymentData({ ...paymentData, amount: '', description: '' });
      if (paymentData.method === 'Settlement') {
        toast.success(`Settled successfully for ${customer.name}`);
      } else {
        toast.success(`Payment recorded for ${customer.name}`);
      }
      onRefresh();

      if (goNext && allCustomers && onNavigateToCustomer) {
        const sortedCustomers = [...allCustomers].sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
        const currentIndex = sortedCustomers.findIndex(c => c.id === customer.id);
        if (currentIndex !== -1 && currentIndex < sortedCustomers.length - 1) {
          onNavigateToCustomer(sortedCustomers[currentIndex + 1]);
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
      
      const reverseChange = item.type === 'credit' ? item.amount : -item.amount;
      batch.update(doc(db, 'customers', customer.id!), {
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
  let startDay = 0;
  try {
    daysInMonth = eachDayOfInterval({
      start: startOfMonth(currentMonth),
      end: endOfMonth(currentMonth)
    });
    startDay = startOfMonth(currentMonth).getDay();
  } catch (e) {
    console.error("Calendar Error:", e);
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
                  <h3 className="text-xl md:text-2xl uppercase tracking-tight font-bold">{customer.name}</h3>
                  <p className="text-slate-300 uppercase tracking-widest text-[9px] md:text-[10px] flex items-center gap-2">
                    CUSTOMER LEDGER / PROFILE
                  </p>
                </div>
              </div>
            </div>
            <div className="md:text-right bg-slate-800 p-3 border border-slate-700">
              <p className="text-slate-300 text-[9px] md:text-[10px] uppercase tracking-widest mb-0.5">Current Dues</p>
              <h4 className={`text-2xl font-bold ${localBalance > 0 ? 'text-red-400' : 'text-green-400'}`}>
                ₹ {Math.abs(localBalance).toLocaleString()} <span className="text-sm font-normal">{localBalance > 0 ? '(Dr)' : '(Cr)'}</span>
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
             <p className="text-black text-[10px] uppercase mb-1 tracking-wider">Milk Value</p>
             <p className="text-black text-sm md:text-base font-bold">₹ {deliveries.reduce((sum, d) => sum + (d.amount || 0), 0).toLocaleString()}</p>
          </div>
          <div className="text-right border-l border-slate-200 pl-6">
             <p className="text-black text-[10px] uppercase mb-1 tracking-wider">Payments</p>
             <p className="text-black text-sm md:text-base font-bold">₹ {transactions.reduce((sum, t) => sum + (t.type === 'credit' ? t.amount : -t.amount), 0).toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className="w-full p-0">
        {loading ? (
          <div className="p-12 text-center text-black uppercase tracking-widest text-[10px]">Loading Records...</div>
        ) : viewMode === 'list' ? (
          <>
            <div className="hidden md:block">
              <div className="max-h-[600px] overflow-y-auto overflow-x-auto">
                <table className="w-full text-left border-collapse border border-slate-200">
                <thead className="bg-slate-50 sticky top-0 text-black text-sm font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 border-b border-slate-200">Date</th>
                    <th className="px-6 py-4 border-b border-slate-200">Entry Details</th>
                    <th className="px-6 py-4 border-b border-slate-200 text-center">Qty / Rate</th>
                    <th className="px-6 py-4 border-b border-slate-200 text-right">Debit (+)</th>
                    <th className="px-6 py-4 border-b border-slate-200 text-right">Credit (-)</th>
                    <th className="px-6 py-4 border-b border-slate-200 text-center w-24">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {combinedHistory.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="px-6 py-4 border-b border-slate-200">
                        <div className="flex flex-col">
                            <span className="text-sm text-black">{item.date}</span>
                            <span className="text-xs text-slate-500 capitalize mt-1">{item.entryType === 'delivery' ? (item as any).session : (item as any).method}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 border-b border-slate-200">
                         <div className="flex items-center gap-3">
                            {item.entryType === 'delivery' ? (
                              <div className="p-2 bg-orange-50 text-orange-600 border border-orange-200"><FileText className="w-4 h-4" /></div>
                            ) : (
                              <div className={`p-2 border ${(item as any).method === 'Settlement' ? 'bg-amber-50 text-amber-600 border-amber-200' : (item.type === 'debit' ? 'bg-red-50 text-red-500 border-red-100' : 'bg-emerald-50 text-emerald-500 border-emerald-100')}`}>
                                <IndianRupee className="w-4 h-4" />
                              </div>
                            )}
                            <p className={`text-[12px] capitalize ${(item as any).method === 'Settlement' ? 'text-amber-700 font-bold' : 'text-black'}`}>
                              {item.entryType === 'delivery' ? 'Milk Delivery' : ((item as any).method === 'Settlement' ? 'Account Settlement' : ((item as any).description || 'Payment'))}
                            </p>
                         </div>
                      </td>
                      <td className="px-6 py-4 border-b border-slate-200 text-center">
                        {item.entryType === 'delivery' ? (
                          <div className="flex flex-col items-center bg-orange-50 py-1.5 px-3 w-fit mx-auto border border-orange-200">
                             <span className="text-sm text-orange-950 font-bold">{(item as any).quantity} L</span>
                             <span className="text-xs text-orange-600 mt-0.5 font-bold">@ ₹{(item as any).rate}/L</span>
                          </div>
                        ) : <span className="text-slate-300">-</span>}
                      </td>
                      <td className="px-6 py-4 border-b border-slate-200 text-right font-mono text-sm text-red-500 font-bold">
                        {item.entryType === 'delivery' ? `+ ₹${item.amount || 0}` : (item.type === 'debit' ? `+ ₹${item.amount || 0}` : <span className="text-slate-300">-</span>)}
                      </td>
                      <td className="px-6 py-4 border-b border-slate-200 text-right font-mono text-sm text-emerald-600 font-bold">
                        {item.entryType === 'transaction' && item.type === 'credit' ? `- ₹${item.amount || 0}` : <span className="text-slate-300">-</span>}
                      </td>
                      <td className="px-6 py-4 border-b border-slate-200 text-center flex justify-center gap-2">
                        {item.entryType === 'transaction' && (!customer.lastSettledDate || item.date > customer.lastSettledDate || (item as any).method === 'Settlement') && (
                          <button 
                            onClick={() => handleDeleteTransaction(item as Transaction)}
                            className="p-2 bg-slate-100 hover:bg-red-100 text-red-500 border border-slate-300"
                            title="Delete Transaction"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </div>

            <div className="md:hidden space-y-2 p-0 bg-slate-100 max-h-[600px] overflow-y-auto">
              {combinedHistory.map((item, idx) => (
                <div key={idx} className="bg-white p-4 border-b border-slate-200 flex flex-col gap-3 relative">
                   <div className="flex justify-between items-start">
                     <div>
                       <span className="text-sm text-black font-medium block">{item.date}</span>
                       <span className="text-xs text-slate-500 capitalize mt-0.5 block">{item.entryType === 'delivery' ? (item as any).session : (item as any).method}</span>
                     </div>
                     <div className="text-right">
                        {item.entryType === 'delivery' ? (
                          <span className="text-base font-mono text-red-500 block font-bold">+ ₹{item.amount || 0}</span>
                        ) : (
                          <span className={`text-base font-mono block font-bold ${item.type === 'debit' ? 'text-red-500' : 'text-emerald-600'}`}>
                            {item.type === 'debit' ? '+' : '-'} ₹{item.amount || 0}
                          </span>
                        )}
                        <span className="text-xs text-slate-400 mt-0.5 block">Amount</span>
                     </div>
                   </div>
                   
                   <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                     <div className={`text-[11px] capitalize ${(item as any).method === 'Settlement' ? 'text-amber-600 font-bold' : 'text-black'}`}>
                        {item.entryType === 'delivery' ? 'Milk Delivery' : ((item as any).method === 'Settlement' ? 'Settlement' : ((item as any).description || 'Payment'))}
                     </div>
                     
                     {item.entryType === 'delivery' && (
                       <div className="flex items-center gap-2 bg-orange-50 px-2 py-1 border border-orange-200">
                          <span className="text-xs text-orange-900 font-bold">{(item as any).quantity} L</span>
                          <div className="w-px h-3 bg-orange-300"></div>
                          <span className="text-[9px] text-orange-700 font-bold">₹{(item as any).rate}/L</span>
                       </div>
                     )}
                   </div>
                   
                   {item.entryType === 'transaction' && (!customer.lastSettledDate || item.date > customer.lastSettledDate || (item as any).method === 'Settlement') && (
                     <button 
                       onClick={() => handleDeleteTransaction(item as Transaction)}
                       className="absolute top-2 right-2 p-2 bg-white text-red-500 border border-slate-300"
                     >
                       <Trash2 className="w-3.5 h-3.5" />
                     </button>
                   )}
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="p-0 w-full overflow-hidden">
               <div className="grid grid-cols-7 gap-px bg-slate-200 border border-slate-200">
                 {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                   <div key={i} className="bg-slate-50 p-1 md:p-2 text-center text-[8px] md:text-[10px] uppercase tracking-widest text-black border-b border-slate-200">{d}</div>
                 ))}
                 {Array.from({ length: startDay }).map((_, i) => (
                   <div key={`empty-${i}`} className="bg-slate-50 border border-slate-100 h-[60px] md:h-[100px]"></div>
                 ))}
                 {daysInMonth.map((day, i) => {
                   const dateStr = format(day, 'yyyy-MM-dd');
                   const dayDeliveries = deliveries.filter(d => d.date === dateStr);
                   const totalQty = dayDeliveries.reduce((sum, d) => sum + (d.quantity || 0), 0);
                   const colVol = dayDeliveries.reduce((sum, d) => sum + (d.quantity || 0), 0);
                   const colAmt = dayDeliveries.reduce((sum, d) => sum + (d.amount || 0), 0);
                   const dayTransactions = transactions.filter(t => t.date === dateStr);
                   const payAmt = dayTransactions.reduce((sum, t) => sum + (t.type === 'credit' ? t.amount : -t.amount), 0);
                   
                   return (
                      <div key={i} className={`bg-white min-h-[60px] md:min-h-[80px] p-0.5 md:p-1 overflow-hidden ${!isSameMonth(day, currentMonth) ? 'bg-slate-50 opacity-50' : ''} ${isToday(day) ? 'bg-blue-50/30' : ''}`}>
                       <div className="text-[8px] md:text-[10px] text-slate-400 mb-0.5">{format(day, 'd')}</div>
                       <div className="space-y-0.5">
                           {colVol > 0 && (
                             <div className="text-[7px] md:text-[9px] leading-tight mb-0.5 bg-orange-50 p-0.5 truncate border border-orange-100" title={`Milk: ${colVol}L, ₹${colAmt.toLocaleString()}`}>
                               <div className="text-orange-600 font-bold truncate">{colVol}L</div>
                               <div className="text-slate-600 truncate">₹{colAmt.toLocaleString()}</div>
                             </div>
                           )}
                           {payAmt > 0 && (
                             <div className="text-[7px] md:text-[9px] leading-tight bg-blue-50 p-0.5 truncate border border-blue-100 text-blue-700" title={`Receipt: ₹${payAmt.toLocaleString()}`}>
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
                <div className="flex items-center gap-2 text-[9px]  text-black">
                  <div className="w-3 h-3 bg-orange-50 border border-orange-100"></div> Milk Delivery
                </div>
                <div className="flex items-center gap-2 text-[9px]  text-black">
                  <div className="w-3 h-3 bg-emerald-50 border border-emerald-100"></div> Payment Received
                </div>
                <div className="flex items-center gap-2 text-[9px]  text-black">
                  <div className="w-3 h-3 bg-red-50 border border-red-100"></div> Advance / Refund
                </div>
             </div>
          </>
        )}
        {combinedHistory.length === 0 && !loading && (
          <div className="py-20 text-center text-black  uppercase tracking-widest text-[10px]">No records found for this period.</div>
        )}
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-100 flex items-center justify-center p-0 md:p-4">
          <div className="bg-white w-full h-full md:h-auto md:max-w-md overflow-y-auto border-none md:border border-slate-400 flex flex-col">
            <div className="bg-emerald-600 p-4 text-white flex items-center justify-between border-b border-emerald-700 sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <button onClick={() => setShowPaymentModal(false)} className="p-1 hover:bg-emerald-700 transition-colors">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h3 className="text-lg tracking-tight font-bold">Record Payment - {customer.name}</h3>
              </div>
            </div>
            <div className="p-4 md:p-6 space-y-4 max-w-xl mx-auto mt-2 w-full">
              <div className="flex justify-between items-center p-3 md:p-4 bg-slate-50 border border-slate-200">
                <span className="text-black text-[10px] md:text-xs uppercase tracking-tight font-bold">Current Dues</span>
                <div className="flex items-center gap-2 md:gap-4">
                  <span className={`text-lg md:text-xl font-bold ${localBalance > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                    ₹ {Math.abs(localBalance).toLocaleString()} {localBalance > 0 ? '(Dr)' : '(Cr)'}
                  </span>
                  {localBalance !== 0 && (
                    <button 
                      onClick={() => {
                        setPaymentData({
                          ...paymentData,
                          amount: Math.abs(localBalance).toString(),
                          type: localBalance > 0 ? 'credit' : 'debit',
                          method: 'Settlement',
                          description: 'Full Balance Settlement'
                        });
                      }}
                      className="px-3 py-1.5 md:px-4 md:py-2 bg-emerald-100 text-emerald-800 hover:bg-emerald-200 text-[10px] md:text-xs uppercase tracking-widest border border-emerald-200 font-bold"
                    >
                      Settle All
                    </button>
                  )}
                </div>
              </div>

              <div className="flex bg-slate-100 p-1">
                <button onClick={() => setPaymentData({...paymentData, type: 'credit'})} className={`flex-1 py-2.5 md:py-3 text-[11px] md:text-xs uppercase tracking-widest font-bold border ${paymentData.type === 'credit' ? 'bg-emerald-600 text-white border-emerald-600' : 'text-black bg-transparent border-transparent hover:bg-slate-200'}`}>Received (+)</button>
                <button onClick={() => setPaymentData({...paymentData, type: 'debit'})} className={`flex-1 py-2.5 md:py-3 text-[11px] md:text-xs uppercase tracking-widest font-bold border ${paymentData.type === 'debit' ? 'bg-red-600 text-white border-red-600' : 'text-black bg-transparent border-transparent hover:bg-slate-200'}`}>Paid (-)</button>
              </div>

              <div className="space-y-4 mt-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-black uppercase tracking-widest font-bold block">Amount (₹)</label>
                  <input 
                    type="number" inputMode="decimal" pattern="[0-9]*" 
                    className="w-full text-xl md:text-2xl text-blue-600 border border-slate-300 p-3 md:p-4 outline-none focus:border-blue-500 font-bold" 
                    value={paymentData.amount}
                    onChange={(e) => setPaymentData({...paymentData, amount: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 md:gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-black uppercase tracking-widest font-bold block">Method</label>
                    <select className="w-full border border-slate-300 p-3 md:p-4 outline-none focus:border-blue-500 text-sm font-bold h-[56px] md:h-[68px]" value={paymentData.method} onChange={e => setPaymentData({...paymentData, method: e.target.value})}>
                      <option value="Cash">Cash</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="UPI">UPI</option>
                      <option value="Settlement">Settlement</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-black uppercase tracking-widest font-bold block">Date</label>
                    <input type="date" className="w-full border border-slate-300 p-3 md:p-4 outline-none focus:border-blue-500 text-sm h-[56px] md:h-[68px]" value={paymentData.date} onChange={e => setPaymentData({...paymentData, date: e.target.value})} />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-black uppercase tracking-widest font-bold block">Description / Note</label>
                  <input type="text" className="w-full border border-slate-300 p-3 md:p-4 outline-none focus:border-blue-500 text-sm" value={paymentData.description} onChange={e => setPaymentData({...paymentData, description: e.target.value})} placeholder="Optional" />
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-2 md:pt-4 pb-8 md:pb-0">
                <button disabled={isSaving} onClick={() => setShowPaymentModal(false)} className="flex-1 min-w-[100px] px-3 py-3 md:px-4 md:py-4 bg-slate-100 text-black hover:bg-slate-200 border border-slate-300 text-xs md:text-sm tracking-wide font-bold">
                  Cancel
                </button>
                <button onClick={() => handleSavePayment(false)} disabled={!paymentData.amount || isSaving} className="flex-1 min-w-[120px] px-3 py-3 md:px-4 md:py-4 bg-blue-600 text-white hover:bg-blue-700 border border-blue-700 disabled:opacity-50 text-xs md:text-sm tracking-wide font-bold">
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
                {allCustomers && allCustomers.length > 0 && onNavigateToCustomer && (
                  <button onClick={() => handleSavePayment(true)} disabled={!paymentData.amount || isSaving} className="w-full md:flex-1 md:w-auto px-3 py-3 md:px-4 md:py-4 bg-emerald-600 text-white hover:bg-emerald-700 border border-emerald-700 disabled:opacity-50 text-xs md:text-sm tracking-wide font-bold whitespace-nowrap">
                    {isSaving ? 'Saving...' : 'Save & Next'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
