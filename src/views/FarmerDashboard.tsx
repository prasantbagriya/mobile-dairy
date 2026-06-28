import { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { db } from '../lib/firebase';
import { collection, query, where, orderBy, onSnapshot, doc } from 'firebase/firestore';
import { Farmer, MilkCollection, Transaction } from '../types';
import { Milk, IndianRupee, MapPin, Phone, ArrowUpRight, ArrowDownRight, Clock, Home, FileText, User, LogOut, Printer, Plus, X, Info } from 'lucide-react';

export default function FarmerDashboard() {
  const { logout, farmerId, user, tenantId } = useAuth();
  const [activeTab, setActiveTab] = useState<'home' | 'ledger' | 'profile'>('home');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'milk' | 'payment'>('all');
  const [farmerData, setFarmerData] = useState<Farmer | null>(null);
  const [collections, setCollections] = useState<MilkCollection[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [showPaymentInfo, setShowPaymentInfo] = useState(false);

  useEffect(() => {
    if (!farmerId) return;

    // Fetch Farmer Profile
    const farmerUnsub = onSnapshot(doc(db, 'farmers', farmerId), (docSnap) => {
      if (docSnap.exists()) {
        setFarmerData({ id: docSnap.id, ...docSnap.data() } as Farmer);
      }
    });

    // Fetch Milk Collections
    const collectionsQuery = query(
      collection(db, 'milk_collections'),
      where('farmerId', '==', farmerId)
    );
    const collectionsUnsub = onSnapshot(collectionsQuery, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as MilkCollection));
      data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.session.localeCompare(a.session));
      setCollections(data); 
    });

    // Fetch Transactions
    const txQuery = query(
      collection(db, 'transactions'),
      where('personId', '==', farmerId),
      where('personType', '==', 'farmer')
    );
    const txUnsub = onSnapshot(txQuery, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction));
      data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setTransactions(data);
    });

    // Fetch Pending Requests
    const rQuery = query(
      collection(db, 'payment_requests'),
      where('farmerId', '==', farmerId)
    );
    const requestsUnsub = onSnapshot(rQuery, (snap) => {
      const rData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Sort in memory to avoid index requirements
      rData.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setRequests(rData);
    });

    setLoading(false);

    return () => {
      farmerUnsub();
      collectionsUnsub();
      txUnsub();
      requestsUnsub();
    };
  }, [farmerId]);

  if (loading || !farmerData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  const submitPaymentRequest = async () => {
    if (!paymentAmount || isNaN(Number(paymentAmount)) || Number(paymentAmount) <= 0) {
      alert("Please enter a valid amount");
      return;
    }
    
    try {
      // Import addDoc if not already imported (it's not imported at the top, but we'll use addDoc directly)
      // Actually we need to ensure addDoc is imported, let's just use it, we have it in firebase/firestore? No, let's just make sure.
      // Wait, addDoc is not imported in FarmerDashboard.tsx! We should import it. Let me fix the import first.
      const { addDoc } = await import('firebase/firestore');
      await addDoc(collection(db, 'payment_requests'), {
        farmerId: farmerId,
        farmerName: farmerData?.name,
        farmerMobile: farmerData?.mobile,
        amount: Number(paymentAmount),
        method: paymentMethod,
        status: 'pending',
        createdAt: new Date().toISOString(),
        userId: tenantId
      });
      setShowPaymentForm(false);
      setPaymentAmount('');
      alert("Payment receipt reported! It will reflect in your balance once the Dairy approves it.");
    } catch (e) {
      console.error(e);
      alert("Failed to submit request.");
    }
  };

  const pendingAmount = requests.filter(r => r.status === 'pending').reduce((sum, r) => sum + r.amount, 0);

  const combinedHistory = [
    ...collections.map(c => ({ ...c, entryType: 'collection' as const })),
    ...transactions.map(t => ({ ...t, entryType: 'transaction' as const }))
  ].filter(item => {
    if (startDate && item.date < startDate) return false;
    if (endDate && item.date > endDate) return false;
    if (filterType === 'milk' && item.entryType !== 'collection') return false;
    if (filterType === 'payment' && item.entryType !== 'transaction') return false;
    return true;
  }).sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  return (
    <div className="h-dvh bg-slate-50 md:flex overflow-hidden w-full">
      
      {/* Desktop Sidebar */}
      <div className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 fixed h-full z-30">
        <div className="p-6 bg-emerald-800 text-white relative border-b border-emerald-900">
           <div className="relative z-10">
             <div className="w-12 h-12 bg-emerald-700 flex items-center justify-center border border-emerald-600 mb-4">
               <Milk className="w-6 h-6 text-white" />
             </div>
             <h2 className="text-xl font-bold">{farmerData.name}</h2>
             <p className="text-emerald-100 text-[10px] uppercase tracking-widest mt-1">Farmer Portal</p>
           </div>
         </div>
         <div className="flex-1 p-4 space-y-2">
           <button onClick={() => setActiveTab('home')} className={`w-full flex items-center gap-3 px-4 py-3 border ${activeTab === 'home' ? 'bg-emerald-50 text-emerald-800 border-emerald-200 font-bold' : 'text-black border-transparent hover:bg-slate-100'}`}>
             <Home className="w-5 h-5" /> Dashboard
           </button>
           <button onClick={() => setActiveTab('ledger')} className={`w-full flex items-center gap-3 px-4 py-3 border ${activeTab === 'ledger' ? 'bg-emerald-50 text-emerald-800 border-emerald-200 font-bold' : 'text-black border-transparent hover:bg-slate-100'}`}>
             <FileText className="w-5 h-5" /> Full Detail
           </button>
           <button onClick={() => setActiveTab('profile')} className={`w-full flex items-center gap-3 px-4 py-3 border ${activeTab === 'profile' ? 'bg-emerald-50 text-emerald-800 border-emerald-200 font-bold' : 'text-black border-transparent hover:bg-slate-100'}`}>
             <User className="w-5 h-5" /> My Profile
           </button>
         </div>
         <div className="p-4 border-t border-slate-200">
           <button onClick={logout} className="w-full flex items-center gap-3 px-4 py-3 border border-transparent text-black hover:bg-red-50 hover:text-red-600 font-bold">
             <LogOut className="w-5 h-5" /> Logout
           </button>
         </div>
       </div>

       {/* Mobile Bottom Nav */}
       <div className="md:hidden fixed bottom-0 left-0 w-full bg-white border-t border-slate-200 z-40 flex justify-around p-2 pb-safe">
         <button onClick={() => setActiveTab('home')} className={`flex flex-col items-center p-2 ${activeTab === 'home' ? 'text-emerald-800 font-bold' : 'text-black'}`}>
           <div className={`p-1.5 ${activeTab === 'home' ? 'bg-emerald-50 border border-emerald-200' : ''}`}><Home className="w-5 h-5" /></div>
           <span className="text-[9px] mt-1">Home</span>
         </button>
         <button onClick={() => setActiveTab('ledger')} className={`flex flex-col items-center p-2 ${activeTab === 'ledger' ? 'text-emerald-800 font-bold' : 'text-black'}`}>
           <div className={`p-1.5 ${activeTab === 'ledger' ? 'bg-emerald-50 border border-emerald-200' : ''}`}><FileText className="w-5 h-5" /></div>
           <span className="text-[9px] mt-1">Full Detail</span>
         </button>
         <button onClick={() => setActiveTab('profile')} className={`flex flex-col items-center p-2 ${activeTab === 'profile' ? 'text-emerald-800 font-bold' : 'text-black'}`}>
           <div className={`p-1.5 ${activeTab === 'profile' ? 'bg-emerald-50 border border-emerald-200' : ''}`}><User className="w-5 h-5" /></div>
           <span className="text-[9px] mt-1">Profile</span>
         </button>
       </div>

       {/* Main Content Area */}
       <div className="flex-1 md:ml-64 min-w-0 w-full h-dvh overflow-y-auto overflow-x-hidden pb-24 md:pb-8 custom-scrollbar">
         {/* Mobile Header (Shows when not on profile) */}
         <div className="md:hidden bg-emerald-800 p-6 text-white relative overflow-hidden mb-6 border-b border-emerald-900">
           <div className="relative z-10 flex justify-between items-start">
              <div>
                <p className="text-emerald-100 mb-1 uppercase tracking-widest text-[10px]">Welcome</p>
                <h1 className="text-2xl font-bold">{farmerData.name}</h1>
              </div>
              <button onClick={logout} className="p-2 bg-emerald-700 border border-emerald-600"><LogOut className="w-5 h-5" /></button>
           </div>
         </div>

        <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
          
            {/* TAB: HOME */}
            {activeTab === 'home' && (
              <div className="space-y-6">
                
                {/* Balance Card */}
                <div className="bg-white p-6 border border-slate-200 relative">
                  <div className="relative z-10">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-xs text-black uppercase tracking-widest">Current Balance</span>
                      <span className={`text-[10px] uppercase tracking-widest px-3 py-1.5 border ${farmerData.balance >= 0 ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                        {farmerData.balance >= 0 ? 'To Receive' : 'To Pay'}
                      </span>
                    </div>
                    <h2 className="text-4xl md:text-5xl text-black font-bold">₹{Math.abs(farmerData.balance).toLocaleString()}</h2>
                    
                    {pendingAmount > 0 && (
                      <p className="text-xs text-black mt-4 flex items-center gap-1 bg-slate-50 p-2 border border-slate-200 w-fit">
                        <Clock className="w-3 h-3 text-emerald-500" />
                        ₹ {pendingAmount} receipt approval pending
                      </p>
                    )}
                  </div>
                  
                  <div className="mt-6 flex gap-3 relative z-10">
                    <button onClick={() => setShowPaymentForm(true)} className="flex-1 bg-emerald-600 text-white py-3 border border-emerald-700 flex items-center justify-center gap-2 hover:bg-emerald-700 font-bold">
                      <IndianRupee className="w-5 h-5" /> Report Payment Received
                    </button>
                    <button onClick={() => setActiveTab('ledger')} className="px-4 py-3 bg-slate-100 text-black border border-slate-200 hover:bg-slate-200 font-bold">
                      History
                    </button>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  {/* Recent Collections Summary */}
                  <div>
                    <div className="flex justify-between items-center mb-3 px-2">
                      <h3 className="text-xs text-black uppercase tracking-widest font-bold">Recent Collections</h3>
                      <button onClick={() => setActiveTab('ledger')} className="text-[10px] text-emerald-600 uppercase tracking-widest font-bold">View All</button>
                    </div>
                    <div className="bg-white p-2 border border-slate-200 max-h-[300px] overflow-y-auto custom-scrollbar">
                      {collections.slice(0, 15).map(c => (
                        <div key={c.id} className="p-3 flex justify-between items-center border-b border-slate-200 hover:bg-slate-50">
                           <div className="flex items-center gap-3">
                             <div className={`w-10 h-10 border flex items-center justify-center shrink-0 ${c.session === 'morning' ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-indigo-50 text-indigo-600 border-indigo-200'}`}>
                               <Clock className="w-5 h-5" />
                             </div>
                             <div>
                               <p className="text-sm text-black font-bold">{new Date(c.date).toLocaleDateString()}</p>
                               <p className="text-[9px] text-slate-500 uppercase tracking-widest">{c.session}</p>
                             </div>
                           </div>
                           <div className="text-right shrink-0">
                             <p className="text-emerald-600 font-bold">{c.quantity.toFixed(1)} L</p>
                             <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">₹{c.amount.toFixed(2)}</p>
                           </div>
                        </div>
                      ))}
                      {collections.length === 0 && <p className="p-4 text-center text-sm text-slate-500">No recent collections.</p>}
                    </div>
                  </div>

                  {/* Recent Payments Summary */}
                  <div>
                    <div className="flex justify-between items-center mb-3 px-2">
                      <h3 className="text-xs text-black uppercase tracking-widest font-bold">Recent Detail</h3>
                      <button onClick={() => setActiveTab('ledger')} className="text-[10px] text-emerald-600 uppercase tracking-widest font-bold">View All</button>
                    </div>
                    <div className="bg-white p-2 border border-slate-200 max-h-[300px] overflow-y-auto custom-scrollbar">
                      {transactions.slice(0, 15).map(t => (
                        <div key={t.id} className="p-3 flex justify-between items-center border-b border-slate-200 hover:bg-slate-50">
                           <div className="flex items-center gap-3">
                             <div className={`w-10 h-10 border flex items-center justify-center shrink-0 ${t.type === 'credit' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                               {t.type === 'credit' ? <ArrowDownRight className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                             </div>
                             <div>
                               <p className="text-sm text-black font-bold truncate w-32">{t.description || (t.type === 'credit' ? 'Received' : 'Given')}</p>
                               <p className="text-[9px] text-slate-500 uppercase tracking-widest">{new Date(t.date).toLocaleDateString()}</p>
                             </div>
                           </div>
                           <div className="text-right shrink-0">
                             <p className={`font-bold ${t.type === 'credit' ? 'text-emerald-600' : 'text-red-600'}`}>{t.type === 'credit' ? '+' : '-'}₹{t.amount}</p>
                           </div>
                        </div>
                      ))}
                      {transactions.length === 0 && <p className="p-4 text-center text-sm text-slate-500">No recent transactions.</p>}
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* TAB: LEDGER */}
            {activeTab === 'ledger' && (
              <div className="space-y-4">
                <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 px-2">
                  <h2 className="text-xl text-black font-bold">Complete Detail</h2>
                  <div className="flex flex-col md:flex-row flex-wrap items-stretch md:items-center gap-2">
                    <select 
                      value={filterType} 
                      onChange={(e) => setFilterType(e.target.value as any)}
                      className="w-full md:w-auto bg-white border border-slate-300 px-3 py-2 text-xs text-black outline-none focus:border-emerald-600 font-bold"
                    >
                      <option value="all">All Records</option>
                      <option value="milk">Only Milk</option>
                      <option value="payment">Only Payments</option>
                    </select>
                    <div className="flex items-center gap-2 w-full md:w-auto">
                      <input 
                        type="date" 
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="flex-1 bg-white border border-slate-300 px-3 py-2 text-xs text-black outline-none focus:border-emerald-600"
                      />
                      <span className="text-black text-xs font-bold">to</span>
                      <input 
                        type="date" 
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="flex-1 bg-white border border-slate-300 px-3 py-2 text-xs text-black outline-none focus:border-emerald-600"
                      />
                    </div>
                    <button onClick={() => window.print()} className="w-full md:w-auto justify-center bg-emerald-50 text-emerald-700 px-4 py-2 border border-emerald-200 text-xs flex items-center gap-2 hover:bg-emerald-100 font-bold">
                      <Printer className="w-4 h-4" /> <span>Print Report</span>
                    </button>
                  </div>
                </div>

                {/* Report Summary */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
                  <div className="bg-emerald-50 p-4 border border-emerald-200 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-emerald-600 mb-1">Total Milk Given</p>
                      <p className="text-xl text-emerald-800 font-bold">
                        {combinedHistory.filter(item => item.entryType === 'collection').reduce((sum, item) => sum + Number((item as any).quantity || 0), 0).toFixed(1)} L
                      </p>
                    </div>
                    <div className="w-10 h-10 bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center justify-center">
                      <Milk className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="bg-amber-50 p-4 border border-amber-200 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-amber-600 mb-1">Total Payment Recv</p>
                      <p className="text-xl text-amber-800 font-bold">
                        ₹{combinedHistory.filter(item => item.entryType === 'transaction' && (item as any).type === 'debit').reduce((sum, item) => sum + Number((item as any).amount || 0), 0).toFixed(2)}
                      </p>
                    </div>
                    <div className="w-10 h-10 bg-amber-100 text-amber-700 border border-amber-200 flex items-center justify-center">
                      <IndianRupee className="w-5 h-5" />
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse border border-slate-200">
                      <thead>
                        {filterType === 'milk' ? (
                          <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase text-black tracking-widest font-bold">
                            <th className="p-2 md:p-4 border-b border-slate-200">Date / Session</th>
                            <th className="p-2 md:p-4 text-center border-b border-slate-200">Quantity (L)</th>
                            <th className="p-2 md:p-4 text-right border-b border-slate-200">Rate (₹)</th>
                            <th className="p-2 md:p-4 text-right border-b border-slate-200">Total (₹)</th>
                          </tr>
                        ) : filterType === 'payment' ? (
                          <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase text-black tracking-widest font-bold">
                            <th className="p-2 md:p-4 border-b border-slate-200">Date</th>
                            <th className="p-2 md:p-4 text-center border-b border-slate-200">Method</th>
                            <th className="p-2 md:p-4 text-right border-b border-slate-200">Type</th>
                            <th className="p-2 md:p-4 text-right border-b border-slate-200">Amount (₹)</th>
                          </tr>
                        ) : (
                          <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase text-black tracking-widest font-bold">
                            <th className="p-2 md:p-4 whitespace-nowrap border-b border-slate-200">Date / Detail</th>
                            <th className="p-2 md:p-4 text-center whitespace-nowrap border-b border-slate-200">Qty (L)</th>
                            <th className="p-2 md:p-4 text-center whitespace-nowrap border-b border-slate-200">Fat/SNF</th>
                            <th className="p-2 md:p-4 text-center whitespace-nowrap border-b border-slate-200">Rate (₹)</th>
                            <th className="p-2 md:p-4 text-right whitespace-nowrap border-b border-slate-200">Amount (₹)</th>
                          </tr>
                        )}
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {combinedHistory.map((item, idx) => {
                           if (filterType === 'milk') {
                             return (
                               <tr key={idx} className="hover:bg-slate-50">
                                 <td className="p-2 md:p-4 whitespace-nowrap border-b border-slate-200">
                                   <div className="flex items-center gap-2">
                                     <p className="text-xs md:text-sm text-black">{item.date}</p>
                                     <p className="text-[9px] md:text-[10px] text-slate-500 font-bold">{(item as any).session}</p>
                                   </div>
                                 </td>
                                 <td className="p-2 md:p-4 text-center text-black whitespace-nowrap text-xs md:text-sm font-bold">{(item as any).quantity} L</td>
                                 <td className="p-2 md:p-4 text-center text-black whitespace-nowrap text-[10px] md:text-xs">{(item as any).fat}/{(item as any).snf}</td>
                                 <td className="p-2 md:p-4 text-right text-black whitespace-nowrap text-xs md:text-sm">₹{(item as any).rate}</td>
                                 <td className="p-2 md:p-4 text-right text-emerald-700 whitespace-nowrap text-xs md:text-sm font-bold">₹{(item as any).amount}</td>
                               </tr>
                             );
                           }

                           if (filterType === 'payment') {
                             return (
                               <tr key={idx} className="hover:bg-slate-50">
                                 <td className="p-2 md:p-4 whitespace-nowrap border-b border-slate-200">
                                   <div className="flex items-center gap-2">
                                     <p className="text-xs md:text-sm text-black">{item.date}</p>
                                     <p className="text-[9px] md:text-[10px] text-slate-500 font-bold">{(item as any).description || 'Payment'}</p>
                                   </div>
                                 </td>
                                 <td className="p-2 md:p-4 text-center text-black whitespace-nowrap text-xs md:text-sm font-bold">{(item as any).method || 'Cash'}</td>
                                 <td className="p-2 md:p-4 text-right text-black whitespace-nowrap text-xs md:text-sm">{(item as any).type}</td>
                                 <td className="p-2 md:p-4 text-right text-amber-700 whitespace-nowrap text-xs md:text-sm font-bold">₹{(item as any).amount}</td>
                               </tr>
                             );
                           }

                           return (
                             <tr key={idx} className="hover:bg-slate-50">
                               <td className="p-2 md:p-4 whitespace-nowrap border-b border-slate-200">
                                 <div className="flex items-center gap-2">
                                   <p className="text-xs md:text-sm text-black">{item.date}</p>
                                   <p className="text-[9px] md:text-[10px] text-slate-500 font-bold">
                                     {item.entryType === 'collection' ? `(Milk • ${(item as any).session})` : `(Received • ${(item as any).method || 'Cash'})`}
                                   </p>
                                 </div>
                               </td>
                               <td className="p-2 md:p-4 text-center text-black whitespace-nowrap text-xs md:text-sm font-bold">
                                 {item.entryType === 'collection' ? `${(item as any).quantity} L` : '-'}
                               </td>
                               <td className="p-2 md:p-4 text-center text-black whitespace-nowrap text-[10px] md:text-xs">
                                 {item.entryType === 'collection' ? `${(item as any).fat}/${(item as any).snf}` : '-'}
                               </td>
                               <td className="p-2 md:p-4 text-center text-black whitespace-nowrap text-xs md:text-sm">
                                 {item.entryType === 'collection' ? `₹${(item as any).rate}` : '-'}
                               </td>
                               <td className="p-2 md:p-4 text-right whitespace-nowrap text-xs md:text-sm font-bold">
                                 {item.entryType === 'collection' ? (
                                   <span className="text-emerald-700 font-bold">₹{(item as any).amount}</span>
                                 ) : (
                                   <span className="text-red-600 font-bold">₹{(item as any).amount}</span>
                                 )}
                               </td>
                             </tr>
                           );
                        })}
                        {combinedHistory.length === 0 && (
                          <tr><td colSpan={5} className="p-8 text-center text-slate-500 border-b border-slate-200">No history available.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: PROFILE */}
            {activeTab === 'profile' && (
              <div className="space-y-4 md:space-y-6">
                <h2 className="text-xl text-black px-2 font-bold">My Profile</h2>
                
                <div className="bg-white p-4 md:p-6 border border-slate-200 space-y-4">
                  <div className="flex items-center gap-4 border-b border-slate-200 pb-4">
                    <div className="w-16 h-16 bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                      <User className="w-8 h-8" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-slate-500">Registered Name</p>
                      <h3 className="text-xl text-black font-bold">{farmerData.name}</h3>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div className="bg-slate-50 p-4 border border-slate-200">
                      <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1 flex items-center gap-1 font-bold"><Phone className="w-3 h-3"/> Mobile Number</p>
                      <p className="text-black font-bold">{farmerData.mobile}</p>
                    </div>
                    <div className="bg-slate-50 p-4 border border-slate-200">
                      <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1 flex items-center gap-1 font-bold"><IndianRupee className="w-3 h-3"/> Default Rate</p>
                      <p className="text-black font-bold">₹{farmerData.defaultRate || 0} / L</p>
                    </div>
                    <div className="bg-slate-50 p-4 border border-slate-200 md:col-span-2">
                      <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1 font-bold">Bank Details</p>
                      <p className="text-black font-bold">{farmerData.bankDetails || 'Not Provided'}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
        </div>
      </div>

      {/* Payment Received Modal */}
      {showPaymentForm && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-end md:items-center justify-center md:p-4">
          <div className="bg-white w-full h-dvh md:h-auto md:max-w-sm border border-slate-400 pb-safe overflow-y-auto flex flex-col">
            <div className="p-4 space-y-4 flex-1">
              <div className="flex justify-between items-center relative">
                <div className="flex items-center gap-2">
                  <h3 className="text-xl text-black font-bold">Report Received Payment</h3>
                  <button onClick={() => setShowPaymentInfo(!showPaymentInfo)} className="p-1 hover:bg-slate-100">
                    <Info className="w-5 h-5 text-black" />
                  </button>
                </div>
                <button onClick={() => setShowPaymentForm(false)} className="p-2 bg-slate-50 border border-slate-200 text-black hover:text-black"><X className="w-4 h-4"/></button>
                
                {showPaymentInfo && (
                  <div className="absolute left-0 top-full mt-2 w-full p-3 pr-8 bg-slate-800 text-white text-xs leading-relaxed border border-slate-700 z-60">
                    If you have received money from the dairy (e.g. cash advance or settlement), report it here. Your balance will be updated once the admin approves it.
                    <button onClick={() => setShowPaymentInfo(false)} className="absolute top-2 right-2 p-1 text-slate-400 hover:text-white bg-slate-700 rounded-sm">
                       <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] text-slate-500 uppercase tracking-widest block mb-2 font-bold">Amount Received</label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black" />
                    <input 
                      type="number" inputMode="decimal" pattern="[0-9]*" 
                      placeholder="0"
                      className="w-full bg-slate-50 border border-slate-300 py-3 pl-10 pr-4 text-xl text-black focus:outline-none focus:border-emerald-600 font-bold"
                      value={paymentAmount}
                      onChange={e => setPaymentAmount(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-slate-500 uppercase tracking-widest block mb-2 font-bold">Payment Method</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['Cash', 'Bank Transfer', 'UPI'].map(method => (
                      <button
                        key={method}
                        onClick={() => setPaymentMethod(method)}
                        className={`py-2 text-xs md:text-sm font-bold border ${paymentMethod === method ? 'bg-emerald-600 text-white border-emerald-700' : 'bg-slate-50 text-black border-slate-200'}`}
                      >
                        {method}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button 
                onClick={submitPaymentRequest}
                className="w-full bg-slate-900 text-white py-3 text-sm flex items-center justify-center gap-2 hover:bg-black border border-slate-950 font-bold mt-6"
              >
                <Plus className="w-5 h-5" /> Submit Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
