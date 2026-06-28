import { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { db } from '../lib/firebase';
import { collection, query, where, orderBy, getDocs, doc, getDoc, addDoc, limit } from 'firebase/firestore';
import { Milk, IndianRupee, MapPin, Phone, ArrowRight, CheckCircle2, History, CreditCard, X, Plus, RefreshCw, Copy, Download, QrCode, ArrowDownRight, ArrowUpRight, Home, FileText, User, LogOut, Printer, Info } from 'lucide-react';
import { Customer, Transaction, MilkDelivery } from '../types';

export default function CustomerDashboard() {
  const { user, customerId, tenantId, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'home' | 'ledger' | 'profile'>('home');
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [deliveries, setDeliveries] = useState<MilkDelivery[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [paymentConfig, setPaymentConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'milk' | 'payment'>('all');
  const [toastMessage, setToastMessage] = useState('');
  const [showPaymentInfo, setShowPaymentInfo] = useState(false);

  useEffect(() => {
    if (!customerId) return;
    loadDashboard();
  }, [customerId]);

  useEffect(() => {
    if (showPaymentInfo) {
      const timer = setTimeout(() => setShowPaymentInfo(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [showPaymentInfo]);

  async function loadDashboard() {
    try {
      setLoading(true);
      // Load Customer Profile
      const cDoc = await getDoc(doc(db, 'customers', customerId!));
      if (cDoc.exists()) {
        setCustomer({ id: cDoc.id, ...cDoc.data() } as Customer);
      }

      // Load Payment Config
      const configDoc = await getDoc(doc(db, 'business_settings', `payment_config_${tenantId}`));
      if (configDoc.exists()) {
        setPaymentConfig(configDoc.data());
      }

      // Load Recent Deliveries
      const dQ = query(
        collection(db, 'milk_deliveries'), 
        where('customerId', '==', customerId)
      );
      const dSnap = await getDocs(dQ);
      const delData = dSnap.docs.map(d => ({ id: d.id, ...d.data() } as MilkDelivery));
      delData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setDeliveries(delData);

      // Load Recent Transactions
      const tQ = query(
        collection(db, 'transactions'),
        where('personId', '==', customerId),
        where('personType', '==', 'customer')
      );
      const tSnap = await getDocs(tQ);
      const txData = tSnap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction));
      txData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setTransactions(txData);

      // Load Pending Payment Requests
      const rQ = query(
        collection(db, 'payment_requests'),
        where('customerId', '==', customerId),
        orderBy('createdAt', 'desc'),
        limit(5)
      );
      const rSnap = await getDocs(rQ);
      setRequests(rSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      setLoading(false);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  }

  const submitPaymentRequest = async () => {
    if (!paymentAmount || isNaN(Number(paymentAmount)) || Number(paymentAmount) <= 0) {
      alert("Please enter a valid amount");
      return;
    }
    
    try {
      await addDoc(collection(db, 'payment_requests'), {
        customerId: customerId,
        customerName: customer?.name,
        customerMobile: customer?.mobile,
        amount: Number(paymentAmount),
        method: paymentMethod,
        status: 'pending',
        createdAt: new Date().toISOString(),
        userId: tenantId
      });
      setShowPaymentForm(false);
      setPaymentAmount('');
      loadDashboard();
      alert("Payment request submitted! It will reflect in your balance once the Dairy approves it.");
    } catch (e) {
      console.error(e);
      alert("Failed to submit request.");
    }
  };

  const handleUpiPayment = async () => {
    if (!paymentAmount || isNaN(Number(paymentAmount)) || Number(paymentAmount) <= 0) {
      alert("Please enter a valid amount");
      return;
    }
    
    if (!paymentConfig?.upiId) {
      alert("Admin has not set up a UPI ID yet.");
      return;
    }

    try {
      await addDoc(collection(db, 'payment_requests'), {
        customerId: customerId,
        customerName: customer?.name,
        customerMobile: customer?.mobile,
        amount: Number(paymentAmount),
        method: 'UPI',
        status: 'pending',
        createdAt: new Date().toISOString(),
        userId: tenantId
      });
      
      const payeeName = encodeURIComponent(paymentConfig.payeeName || 'Dairy Admin');
      const upiUrl = `upi://pay?pa=${paymentConfig.upiId}&pn=${payeeName}&am=${paymentAmount}&cu=INR`;
      
      setShowPaymentForm(false);
      setPaymentAmount('');
      loadDashboard();
      
      window.location.href = upiUrl;

    } catch (e) {
      console.error(e);
      alert("Failed to initiate payment.");
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    if (text) {
      navigator.clipboard.writeText(text);
      setToastMessage(`${label} Copied Successfully!`);
      setTimeout(() => setToastMessage(''), 3000);
    }
  };

  const downloadQr = () => {
    if (paymentConfig?.qrCodeImage) {
      const a = document.createElement('a');
      a.href = paymentConfig.qrCodeImage;
      a.download = 'Dairy_QR_Code.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center  text-orange-500">Loading your portal...</div>;
  }

  if (!customer) {
    return <div className="p-8 text-center text-red-500 ">Error loading profile.</div>;
  }

  const pendingAmount = requests.filter(r => r.status === 'pending').reduce((sum, r) => sum + r.amount, 0);

  const combinedHistory = [
    ...deliveries.map(c => ({ ...c, entryType: 'delivery' as const })),
    ...transactions.map(t => ({ ...t, entryType: 'transaction' as const }))
  ].filter(item => {
    if (startDate && item.date < startDate) return false;
    if (endDate && item.date > endDate) return false;
    if (filterType === 'milk' && item.entryType !== 'delivery') return false;
    if (filterType === 'payment' && item.entryType !== 'transaction') return false;
    return true;
  }).sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  return (
    <div className="h-dvh bg-slate-50 md:flex overflow-hidden w-full">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-6 py-3 border border-slate-800 flex items-center gap-2 text-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          {toastMessage}
        </div>
      )}
      
      {/* Desktop Sidebar */}
      <div className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 fixed h-full z-30">
        <div className="p-4 bg-slate-900 text-white relative">
           <div className="relative z-10">
             <div className="w-12 h-12 bg-slate-800 flex items-center justify-center border border-slate-700 mb-4">
               <Milk className="w-6 h-6 text-white" />
             </div>
             <h2 className="text-xl font-bold">{customer.name}</h2>
             <p className="text-orange-100 text-[10px] uppercase tracking-widest mt-1">Customer Portal</p>
           </div>
        </div>
        <div className="flex-1 p-4 space-y-2">
          <button onClick={() => setActiveTab('home')} className={`w-full flex items-center gap-3 px-4 py-3 border ${activeTab === 'home' ? 'bg-orange-50 text-orange-600' : 'text-black border-transparent hover:bg-slate-50'}`}>
            <Home className="w-5 h-5" /> Dashboard
          </button>
          <button onClick={() => setActiveTab('ledger')} className={`w-full flex items-center gap-3 px-4 py-3 border ${activeTab === 'ledger' ? 'bg-orange-50 text-orange-600 border-orange-200' : 'text-black border-transparent hover:bg-slate-50'}`}>
            <FileText className="w-5 h-5" /> Full Detail
          </button>
          <button onClick={() => setActiveTab('profile')} className={`w-full flex items-center gap-3 px-4 py-3 border ${activeTab === 'profile' ? 'bg-orange-50 text-orange-600 border-orange-200 font-bold' : 'text-black border-transparent hover:bg-slate-50'}`}>
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
        <button onClick={() => setActiveTab('home')} className={`flex flex-col items-center p-2 ${activeTab === 'home' ? 'text-orange-600 font-bold' : 'text-black'}`}>
          <div className={`p-1.5 ${activeTab === 'home' ? 'bg-orange-50 border border-orange-200' : ''}`}><Home className="w-5 h-5" /></div>
          <span className="text-[9px] mt-1">Home</span>
        </button>
        <button onClick={() => setActiveTab('ledger')} className={`flex flex-col items-center p-2 ${activeTab === 'ledger' ? 'text-orange-600 font-bold' : 'text-black'}`}>
          <div className={`p-1.5 ${activeTab === 'ledger' ? 'bg-orange-50 border border-orange-200' : ''}`}><FileText className="w-5 h-5" /></div>
          <span className="text-[9px] mt-1">Full Detail</span>
        </button>
        <button onClick={() => setActiveTab('profile')} className={`flex flex-col items-center p-2 ${activeTab === 'profile' ? 'text-orange-600 font-bold' : 'text-black'}`}>
          <div className={`p-1.5 ${activeTab === 'profile' ? 'bg-orange-50 border border-orange-200' : ''}`}><User className="w-5 h-5" /></div>
          <span className="text-[9px] mt-1">Profile</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 md:ml-64 min-w-0 w-full h-dvh overflow-y-auto overflow-x-hidden pb-24 md:pb-8 custom-scrollbar">
        {/* Mobile Header (Shows when not on profile) */}
        <div className="md:hidden bg-slate-900 p-4 text-white relative overflow-hidden mb-6 border-b border-slate-950">
          <div className="relative z-10 flex justify-between items-start">
             <div>
               <p className="text-orange-100 mb-1 uppercase tracking-widest text-[10px]">Welcome</p>
               <h1 className="text-2xl font-bold">{customer.name}</h1>
             </div>
             <button onClick={logout} className="p-2 bg-slate-800 border border-slate-700"><LogOut className="w-5 h-5" /></button>
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
                      <span className="text-xs text-black uppercase tracking-widest">Outstanding Balance</span>
                      <span className={`text-[10px] uppercase tracking-widest px-3 py-1.5 border ${customer.balance > 0 ? 'bg-red-50 text-red-600 border-red-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>
                        {customer.balance > 0 ? 'To Pay' : 'Advance'}
                      </span>
                    </div>
                    <h2 className="text-4xl md:text-5xl text-black font-bold">₹{Math.abs(customer.balance).toLocaleString()}</h2>
                    
                    {pendingAmount > 0 && (
                      <p className="text-xs text-black mt-4 flex items-center gap-1 bg-slate-50 p-2 border border-slate-200 w-fit">
                        <RefreshCw className="w-3 h-3 animate-spin text-orange-500" />
                        ₹ {pendingAmount} payment approval pending
                      </p>
                    )}
                  </div>
                  
                  <div className="mt-6 flex gap-3 relative z-10">
                    <button onClick={() => setShowPaymentForm(true)} className="flex-1 bg-orange-500 text-white py-3 border border-orange-600 flex items-center justify-center gap-2 hover:bg-orange-600 font-bold">
                      <CreditCard className="w-5 h-5" /> Pay Now
                    </button>
                    <button onClick={() => setActiveTab('ledger')} className="px-4 py-3 bg-slate-100 text-black border border-slate-200 hover:bg-slate-200 font-bold">
                      History
                    </button>
                  </div>
                </div>

                {/* Payment Config in Home */}
                {paymentConfig && (paymentConfig.upiId || paymentConfig.qrCodeImage) && (
                  <div className="bg-white p-6 border border-slate-200 mt-6">
                    <h3 className="text-xs text-black uppercase tracking-widest mb-4 font-bold">Dairy Payment Details</h3>
                    
                    <div className="flex flex-col md:flex-row gap-6 items-start">
                      {paymentConfig.qrCodeImage && (
                        <div className="flex flex-col items-center gap-3">
                          <div className="p-3 border border-slate-200 bg-slate-50">
                            <img src={paymentConfig.qrCodeImage} alt="Scan to Pay" className="w-48 h-48 md:w-56 md:h-56 object-contain" />
                          </div>
                          <button 
                            onClick={downloadQr}
                            className="text-[10px] uppercase tracking-widest text-orange-600 bg-orange-50 px-4 py-2 border border-orange-200 flex items-center gap-2 hover:bg-orange-100 font-bold"
                          >
                            <Download className="w-4 h-4" /> Download QR
                          </button>
                        </div>
                      )}

                      {paymentConfig.upiId && (
                        <div className="w-full md:max-w-sm bg-slate-50 p-4 border border-slate-200">
                          <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                              <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Payee Name</p>
                              <p className="text-black font-bold">{paymentConfig.payeeName || 'Dairy Admin'}</p>
                            </div>
                            {paymentConfig.payeeMobile && (
                              <div>
                                <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Mobile Number</p>
                                <div className="flex items-center gap-2">
                                  <p className="text-black font-bold">{paymentConfig.payeeMobile}</p>
                                  <button onClick={() => copyToClipboard(paymentConfig.payeeMobile!, 'Mobile Number')} className="p-1 bg-white border border-slate-200 text-black hover:text-orange-600">
                                    <Copy className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                          
                          <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">UPI ID</p>
                          <div className="flex items-center justify-between bg-white p-3 border border-slate-200">
                            <p className="font-mono text-sm text-black font-bold">{paymentConfig.upiId}</p>
                            <button onClick={() => copyToClipboard(paymentConfig.upiId!, 'UPI ID')} className="p-2 bg-slate-50 border border-slate-200 text-black hover:text-orange-600">
                              <Copy className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="grid md:grid-cols-2 gap-6 mt-6">
                  {/* Recent Deliveries Summary */}
                  <div>
                    <div className="flex justify-between items-center mb-3 px-2">
                      <h3 className="text-xs text-black uppercase tracking-widest font-bold">Recent Milk Received</h3>
                      <button onClick={() => setActiveTab('ledger')} className="text-[10px] text-orange-600 uppercase tracking-widest font-bold">View All</button>
                    </div>
                    <div className="bg-white p-2 border border-slate-200 max-h-[300px] overflow-y-auto custom-scrollbar">
                      {deliveries.slice(0, 15).map(d => (
                        <div key={d.id} className="p-3 flex justify-between items-center border-b border-slate-200 hover:bg-slate-50">
                           <div className="flex items-center gap-3">
                             <div className={`w-10 h-10 border flex items-center justify-center shrink-0 ${d.shift === 'Morning' ? 'bg-amber-50 text-amber-500 border-amber-200' : 'bg-indigo-50 text-indigo-500 border-indigo-200'}`}>
                               <Milk className="w-5 h-5" />
                             </div>
                             <div>
                               <p className="text-sm text-black font-bold">{d.date}</p>
                               <p className="text-[9px] text-slate-500 uppercase tracking-widest">{d.shift}</p>
                             </div>
                           </div>
                           <div className="text-right shrink-0">
                             <p className="text-orange-600 font-bold">{d.quantity} L</p>
                             <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold font-mono">₹{d.totalAmount}</p>
                           </div>
                        </div>
                      ))}
                      {deliveries.length === 0 && <p className="p-4 text-center text-sm text-slate-500">No recent deliveries.</p>}
                    </div>
                  </div>

                  {/* Recent Payments Summary */}
                  <div>
                    <div className="flex justify-between items-center mb-3 px-2">
                      <h3 className="text-xs text-black uppercase tracking-widest font-bold">Recent Payments</h3>
                      <button onClick={() => setActiveTab('ledger')} className="text-[10px] text-orange-600 uppercase tracking-widest font-bold">View All</button>
                    </div>
                    <div className="bg-white p-2 border border-slate-200 max-h-[300px] overflow-y-auto custom-scrollbar">
                      {transactions.slice(0, 15).map(t => (
                        <div key={t.id} className="p-3 flex justify-between items-center border-b border-slate-200 hover:bg-slate-50">
                           <div className="flex items-center gap-3">
                             <div className={`w-10 h-10 border flex items-center justify-center shrink-0 ${t.type === 'credit' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                               {t.type === 'credit' ? <ArrowDownRight className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                             </div>
                             <div>
                               <p className="text-sm text-black font-bold">{t.date}</p>
                               <p className="text-[9px] text-slate-500 uppercase tracking-widest">{t.method}</p>
                             </div>
                           </div>
                           <div className="text-right shrink-0">
                             <p className={`font-bold ${t.type === 'debit' ? 'text-red-500' : 'text-emerald-500'}`}>{t.type === 'debit' ? '-' : '+'}₹{t.amount}</p>
                           </div>
                        </div>
                      ))}
                      {transactions.length === 0 && <p className="p-4 text-center text-sm text-slate-500">No recent payments.</p>}
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
                      className="w-full md:w-auto bg-white border border-slate-300 px-3 py-2 text-xs text-black outline-none focus:border-orange-500 font-bold"
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
                        className="flex-1 bg-white border border-slate-300 px-3 py-2 text-xs text-black outline-none focus:border-orange-500"
                      />
                      <span className="text-black text-xs font-bold">to</span>
                      <input 
                        type="date" 
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="flex-1 bg-white border border-slate-300 px-3 py-2 text-xs text-black outline-none focus:border-orange-500"
                      />
                    </div>
                    <button onClick={() => window.print()} className="w-full md:w-auto justify-center bg-orange-50 text-orange-600 px-4 py-2 border border-orange-200 text-xs flex items-center gap-2 hover:bg-orange-100 font-bold">
                      <Printer className="w-4 h-4" /> <span>Print Report</span>
                    </button>
                  </div>
                </div>

                {/* Report Summary */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
                  <div className="bg-orange-50 p-4 border border-orange-200 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-orange-500 mb-1">Total Milk Taken</p>
                      <p className="text-xl text-orange-600 font-bold">
                        {combinedHistory.filter(item => item.entryType === 'delivery').reduce((sum, item) => sum + Number((item as any).quantity || 0), 0).toFixed(1)} L
                      </p>
                    </div>
                    <div className="w-10 h-10 bg-orange-100 text-orange-500 border border-orange-200 flex items-center justify-center">
                      <Milk className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="bg-emerald-50 p-4 border border-emerald-200 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-emerald-500 mb-1">Total Payment Given</p>
                      <p className="text-xl text-emerald-600 font-bold">
                        ₹{combinedHistory.filter(item => item.entryType === 'transaction' && (item as any).type === 'credit').reduce((sum, item) => sum + Number((item as any).amount || 0), 0).toFixed(2)}
                      </p>
                    </div>
                    <div className="w-10 h-10 bg-emerald-100 text-emerald-600 border border-emerald-200 flex items-center justify-center">
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
                            <th className="p-2 md:p-4 border-b border-slate-200">Date / Shift</th>
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
                                     <p className="text-[9px] md:text-[10px] text-slate-500 font-bold">{(item as any).shift}</p>
                                   </div>
                                 </td>
                                 <td className="p-2 md:p-4 text-center text-black whitespace-nowrap text-xs md:text-sm font-bold">{(item as any).quantity} L</td>
                                 <td className="p-2 md:p-4 text-right text-black whitespace-nowrap text-xs md:text-sm">₹{(item as any).rate}</td>
                                 <td className="p-2 md:p-4 text-right text-red-600 whitespace-nowrap text-xs md:text-sm font-bold">₹{(item as any).totalAmount}</td>
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
                                 <td className="p-2 md:p-4 text-center text-black whitespace-nowrap text-xs md:text-sm font-bold">{(item as any).method}</td>
                                 <td className="p-2 md:p-4 text-right text-black whitespace-nowrap text-xs md:text-sm">{(item as any).type}</td>
                                 <td className="p-2 md:p-4 text-right text-emerald-700 whitespace-nowrap text-xs md:text-sm font-bold">₹{(item as any).amount}</td>
                               </tr>
                             );
                           }

                           return (
                             <tr key={idx} className="hover:bg-slate-50">
                               <td className="p-2 md:p-4 whitespace-nowrap border-b border-slate-200">
                                 <div className="flex items-center gap-2">
                                   <p className="text-xs md:text-sm text-black">{item.date}</p>
                                   <p className="text-[9px] md:text-[10px] text-slate-500 font-bold">
                                     {item.entryType === 'delivery' ? `(Milk • ${(item as any).shift})` : `(Paid • ${(item as any).method || 'Cash'})`}
                                   </p>
                                 </div>
                               </td>
                               <td className="p-2 md:p-4 text-center text-black whitespace-nowrap text-xs md:text-sm font-bold">
                                 {item.entryType === 'delivery' ? `${(item as any).quantity} L` : '-'}
                               </td>
                               <td className="p-2 md:p-4 text-center text-black whitespace-nowrap text-xs md:text-sm">
                                 {item.entryType === 'delivery' ? `₹${(item as any).rate}` : '-'}
                               </td>
                               <td className="p-2 md:p-4 text-right whitespace-nowrap text-xs md:text-sm font-bold">
                                 {item.entryType === 'delivery' ? (
                                   <span className="text-red-600 font-bold">₹{(item as any).totalAmount}</span>
                                 ) : (
                                   <span className="text-emerald-700 font-bold">₹{(item as any).amount}</span>
                                 )}
                               </td>
                             </tr>
                           );
                        })}
                        {combinedHistory.length === 0 && (
                          <tr><td colSpan={4} className="p-8 text-center text-slate-500 border-b border-slate-200">No history available.</td></tr>
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
                    <div className="w-16 h-16 bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-500">
                      <User className="w-8 h-8" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-slate-500">Registered Name</p>
                      <h3 className="text-xl text-black font-bold">{customer.name}</h3>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div className="bg-slate-50 p-4 border border-slate-200">
                      <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1 flex items-center gap-1 font-bold"><Phone className="w-3 h-3"/> Mobile Number</p>
                      <p className="text-black font-bold">{customer.mobile}</p>
                    </div>
                    <div className="bg-slate-50 p-4 border border-slate-200">
                      <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1 flex items-center gap-1 font-bold"><MapPin className="w-3 h-3"/> Address</p>
                      <p className="text-black font-bold">{customer.address || 'Not Provided'}</p>
                    </div>
                    <div className="bg-slate-50 p-4 border border-slate-200">
                      <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1 font-bold">Village</p>
                      <p className="text-black font-bold">{customer.village || 'Not Provided'}</p>
                    </div>
                  </div>
                </div>

              </div>
            )}
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentForm && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-end md:items-center justify-center md:p-4">
          <div className="bg-white w-full h-dvh md:h-auto md:max-w-sm border border-slate-400 pb-safe overflow-y-auto flex flex-col">
            <div className="p-4 space-y-4 flex-1">
              <div className="flex justify-between items-center relative">
                <div className="flex items-center gap-2">
                  <h3 className="text-xl text-black font-bold">Report Payment</h3>
                  <button onClick={() => setShowPaymentInfo(!showPaymentInfo)} className="p-1 hover:bg-slate-100">
                    <Info className="w-5 h-5 text-black" />
                  </button>
                </div>
                <button onClick={() => setShowPaymentForm(false)} className="p-2 bg-slate-50 border border-slate-200 text-black hover:text-black"><X className="w-4 h-4"/></button>
                
                {showPaymentInfo && (
                  <div className="absolute left-0 top-full mt-2 w-full p-3 pr-8 bg-slate-800 text-white text-xs leading-relaxed border border-slate-700 z-60">
                    If you have paid your dues to the dairy, report it here. Your balance will be updated once approved.
                    <button onClick={() => setShowPaymentInfo(false)} className="absolute top-2 right-2 p-1 text-slate-400 hover:text-white bg-slate-700 rounded-sm">
                       <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] text-slate-500 uppercase tracking-widest block mb-2 font-bold">Amount Paid</label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black" />
                    <input 
                      type="number" inputMode="decimal" pattern="[0-9]*" 
                      placeholder="0"
                      className="w-full bg-slate-50 border border-slate-300 py-3 pl-10 pr-4 text-xl text-black focus:outline-none focus:border-orange-500 font-bold"
                      value={paymentAmount}
                      onChange={e => setPaymentAmount(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-slate-500 uppercase tracking-widest block mb-2 font-bold">Payment Method</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['UPI', 'Cash'].map(method => (
                      <button
                        key={method}
                        onClick={() => setPaymentMethod(method)}
                        className={`py-2 text-xs md:text-sm font-bold border ${paymentMethod === method ? 'bg-orange-500 text-white border-orange-600' : 'bg-slate-50 text-black border-slate-200'}`}
                      >
                        {method}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {paymentMethod === 'UPI' && paymentConfig?.upiId ? (
                <div className="space-y-3 pt-2">
                  <div className="bg-orange-50 p-3 border border-orange-200 text-left">
                    <p className="text-[9px] uppercase tracking-widest text-orange-600 mb-0.5 font-bold">Paying To</p>
                    <p className="text-orange-950 font-bold">{paymentConfig.payeeName || 'Dairy Admin'}</p>
                    <p className="text-xs text-orange-700 font-mono mt-0.5">UPI/Mobile: {paymentConfig.payeeMobile || paymentConfig.upiId}</p>
                  </div>
                  <button 
                    onClick={handleUpiPayment}
                    className="w-full bg-orange-500 text-white py-3 text-sm flex items-center justify-center gap-2 hover:bg-orange-600 border border-orange-600 font-bold"
                  >
                    <IndianRupee className="w-5 h-5" /> Pay via UPI App (PhonePe/GPay)
                  </button>
                  <p className="text-center text-[10px] text-slate-500 uppercase tracking-widest font-bold">OR</p>
                  <button 
                    onClick={submitPaymentRequest}
                    className="w-full bg-slate-100 text-black border border-slate-200 py-2.5 flex items-center justify-center gap-2 hover:bg-slate-200 text-xs font-bold"
                  >
                    I have already paid manually, just report it
                  </button>
                </div>
              ) : (
                <button 
                  onClick={submitPaymentRequest}
                  className="w-full bg-slate-900 text-white py-3 text-sm flex items-center justify-center gap-2 hover:bg-black border border-slate-950 font-bold mt-2"
                >
                  <Plus className="w-5 h-5" /> Submit Request
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
