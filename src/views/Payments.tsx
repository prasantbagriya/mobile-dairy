import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

import { useI18n } from '../lib/i18n';
import { db } from '../lib/db';
import { collection, addDoc, getDocs, query, orderBy, limit, doc, increment, updateDoc, writeBatch, where, deleteDoc } from 'firebase/firestore';
import { Farmer, Customer, Transaction } from '../types';
import { Plus, IndianRupee, ArrowDownCircle, ArrowUpCircle, History, Filter, Check, X, Search } from 'lucide-react';
import dayjs from 'dayjs';
import InfoTooltip from '../components/InfoTooltip';
import { useAuth } from '../lib/auth';

export default function Payments() {
  const { t } = useI18n();
  const { tenantId } = useAuth();
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [approvalTab, setApprovalTab] = useState<'customer' | 'farmer'>('customer');
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState({
    personId: '',
    personType: 'farmer' as 'farmer' | 'customer',
    type: 'debit' as 'credit' | 'debit',
    amount: '',
    date: dayjs().format('YYYY-MM-DD'),
    description: '',
    method: 'Cash'
  });

  useEffect(() => {
    loadData();
  }, [tenantId]);

  async function loadData() {
    setLoading(true);
    const farSnap = await getDocs(query(collection(db, 'farmers'), where('userId', '==', tenantId)));
    setFarmers(farSnap.docs.map(d => ({ id: d.id, ...d.data() } as Farmer)));

    const cusSnap = await getDocs(query(collection(db, 'customers'), where('userId', '==', tenantId)));
    setCustomers(cusSnap.docs.map(d => ({ id: d.id, ...d.data() } as Customer)));

    const transSnap = await getDocs(query(collection(db, 'transactions'), where('userId', '==', tenantId)));
    setTransactions(transSnap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction)));

    const reqSnap = await getDocs(query(collection(db, 'payment_requests'), where('userId', '==', tenantId), where('status', '==', 'pending')));
    setRequests(reqSnap.docs.map(d => ({ id: d.id, ...d.data() })));

    setLoading(false);
  }

  async function handleApproveRequest(req: any) {
    try {
      const batch = writeBatch(db);
      // 1. Mark request as approved
      batch.update(doc(db, 'payment_requests', req.id), { status: 'approved', updatedAt: new Date().toISOString() });

      const isFarmer = !!req.farmerId;
      const personId = isFarmer ? req.farmerId : req.customerId;

      // 2. Create Transaction
      const transRef = doc(collection(db, 'transactions'));
      batch.set(transRef, {
        personId: personId,
        personType: isFarmer ? 'farmer' : 'customer',
        type: isFarmer ? 'debit' : 'credit', // farmer gets paid (debit), customer pays us (credit)
        amount: req.amount,
        date: dayjs().format('YYYY-MM-DD'),
        description: 'Payment via Portal',
        method: req.method,
        createdAt: new Date().toISOString(),
        userId: tenantId
      });

      // 3. Update Balance (decrease balance for both)
      batch.update(doc(db, isFarmer ? 'farmers' : 'customers', personId), { balance: increment(-req.amount) });

      await batch.commit();
      loadData();
      toast.success('Payment request approved!');
    } catch (e) {
      console.error(e);
      toast.error("Error approving request");
    }
  }

  async function handleRejectRequest(reqId: string) {
    if (!confirm('Reject this payment request?')) return;
    try {
      await updateDoc(doc(db, 'payment_requests', reqId), { status: 'rejected', updatedAt: new Date().toISOString() });
      loadData();
      toast.success('Payment request rejected');
    } catch (e) {
      console.error(e);
      toast.error('Error rejecting request');
    }
  }

  async function handleSave() {
    if (!formData.personId || !formData.amount) return;
    try {
      const amountNum = parseFloat(formData.amount);
      const transactionData = {
        ...formData,
        amount: amountNum,
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'transactions'), { ...transactionData, userId: tenantId });

      // Update balance
      // For farmer: credit = we owe them more, debit = we paid them (balance decreases)
      // For customer: debit = they owe us more (advance), credit = they paid us (balance decreases)
      const personRef = doc(db, formData.personType === 'farmer' ? 'farmers' : 'customers', formData.personId);
      let balanceChange = 0;

      if (formData.personType === 'farmer') {
        balanceChange = formData.type === 'debit' ? -amountNum : amountNum;
      } else {
        // Customer side: Debit increases what they owe us (advance), Credit decreases it (payment)
        balanceChange = formData.type === 'debit' ? amountNum : -amountNum;
      }

      await updateDoc(personRef, { balance: increment(balanceChange) });

      setShowForm(false);
      setFormData({ ...formData, amount: '', description: '' });
      loadData();
      toast.success('Transaction recorded successfully!');
    } catch (e) {
      console.error(e);
      toast.error("Payment Error: " + (e as any).message);
    }
  }

  const filteredTransactions = transactions.filter(tr => {
    if (!searchQuery) return true;
    const personName = tr.personType === 'farmer'
      ? farmers.find(f => f.id === tr.personId)?.name
      : customers.find(c => c.id === tr.personId)?.name;
    return personName?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="space-y-4 md:space-y-6 -m-2 md:-m-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">{t('payments')} <InfoTooltip text="Manage incoming money from customers and outgoing to farmers." /></h2>
          <p className="text-black text-xs md:text-sm mt-1">{t('settle_dues_desc')}</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="xl:hidden bg-slate-900 text-white px-3 py-2 text-[10px] uppercase tracking-widest flex items-center gap-1 shrink-0 shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" /> {t('add_new')}
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
        {/* Entry Form - Left Section */}
        <div className={`xl:col-span-4 sticky top-4 ${showForm ? 'block' : 'hidden xl:block'}`}>
          <div className="bg-white rounded-none border border-slate-200 overflow-hidden relative">
            <button
              onClick={() => setShowForm(false)}
              aria-label="Close"
              className="xl:hidden absolute top-4 right-4 text-white hover:text-slate-200 z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="bg-indigo-600 p-4 text-white">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 bg-white/20 rounded-none flex items-center justify-center">
                  <IndianRupee className="w-5 h-5" />
                </div>
                <div className="text-right">
                  <p className="text-[10px]  opacity-60 mb-0.5">{t('total_amount')}</p>
                  <h4 className="text-2xl ">₹ {parseFloat(formData.amount || '0').toLocaleString()}</h4>
                </div>
              </div>
              <h3 className="text-xl ">{t('new_entry')}</h3>
            </div>

            <div className="p-4 space-y-4">
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row p-1 bg-slate-100 rounded-none gap-1 sm:gap-0">
                  <div className={`flex-1 flex justify-center py-2 rounded-none ${formData.personType === 'farmer' ? 'bg-white border border-slate-200' : ''}`}>
                    <button onClick={() => setFormData({ ...formData, personType: 'farmer', personId: '' })} className={`flex items-center justify-center gap-2 text-[10px] whitespace-nowrap w-full ${formData.personType === 'farmer' ? 'text-indigo-600' : 'text-black'}`}>
                      {t('farmer')} <InfoTooltip text="Manage payments with milk suppliers" />
                    </button>
                  </div>
                  <div className={`flex-1 flex justify-center py-2 rounded-none ${formData.personType === 'customer' ? 'bg-white border border-slate-200' : ''}`}>
                    <button onClick={() => setFormData({ ...formData, personType: 'customer', personId: '' })} className={`flex items-center justify-center gap-2 text-[10px] whitespace-nowrap w-full ${formData.personType === 'customer' ? 'text-indigo-600' : 'text-black'}`}>
                      {t('customer')} <InfoTooltip text="Manage payments with milk buyers" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[10px]  text-black tracking-tight block mb-1">{formData.personType === 'farmer' ? t('select_farmer') : t('select_customer')}</label>
                  <select className="w-full bg-slate-50 border border-slate-100 rounded-none px-3 py-3 focus:ring-2 focus:ring-indigo-500 outline-none  text-black appearance-none text-sm" value={formData.personId} onChange={e => setFormData({ ...formData, personId: e.target.value })}>
                    <option value="">{formData.personType === 'farmer' ? t('choose_farmer') : t('choose_customer')}</option>
                    {formData.personType === 'farmer' ? farmers.map(f => <option key={f.id} value={f.id}>{f.name}</option>) : customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>

                  {formData.personId && (
                    <div className="mt-2 p-3 bg-indigo-50/50 border border-indigo-100 flex justify-between items-center">
                      <div>
                        <p className="text-[10px]  text-indigo-400 uppercase tracking-widest mb-0.5">{t('current_balance')}</p>
                        <p className={` text-sm ${(formData.personType === 'farmer' ? farmers.find(f => f.id === formData.personId)?.balance : customers.find(c => c.id === formData.personId)?.balance) >= 0
                          ? 'text-emerald-600' : 'text-red-600'
                          }`}>
                          ₹ {Math.abs((formData.personType === 'farmer' ? farmers.find(f => f.id === formData.personId)?.balance : customers.find(c => c.id === formData.personId)?.balance) || 0).toLocaleString()}
                          {((formData.personType === 'farmer' ? farmers.find(f => f.id === formData.personId)?.balance : customers.find(c => c.id === formData.personId)?.balance) || 0) >= 0 ? ' (Dr)' : ' (Cr)'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px]  text-black uppercase tracking-widest mb-0.5">{t('mobile')}</p>
                        <p className=" text-xs text-black">
                          {formData.personType === 'farmer' ? farmers.find(f => f.id === formData.personId)?.mobile : customers.find(c => c.id === formData.personId)?.mobile}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row p-1 bg-slate-100 rounded-none gap-1 sm:gap-0">
                  <div className={`flex-1 flex justify-center py-2 rounded-none ${formData.type === 'credit' ? 'bg-emerald-500' : ''}`}>
                    <button onClick={() => setFormData({ ...formData, type: 'credit' })} className={`flex items-center justify-center gap-2 text-[10px] whitespace-nowrap w-full ${formData.type === 'credit' ? 'text-white' : 'text-black'}`}>
                      {t('credit')} <InfoTooltip text="Receiving money OR adding balance" />
                    </button>
                  </div>
                  <div className={`flex-1 flex justify-center py-2 rounded-none ${formData.type === 'debit' ? 'bg-red-500' : ''}`}>
                    <button onClick={() => setFormData({ ...formData, type: 'debit' })} className={`flex items-center justify-center gap-2 text-[10px] whitespace-nowrap w-full ${formData.type === 'debit' ? 'text-white' : 'text-black'}`}>
                      {t('debit')} <InfoTooltip text="Paying money OR deducting balance" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px]  text-black tracking-tight block mb-1">{t('amount')}</label>
                    <input type="number" inputMode="decimal" pattern="[0-9]*" placeholder="0.00" className="w-full bg-slate-50 border border-slate-100 rounded-none px-3 py-3 text-lg  text-black" value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-[10px]  text-black tracking-tight block mb-1">{t('date')}</label>
                    <input type="date" className="w-full bg-slate-50 border border-slate-100 rounded-none px-3 py-2.5  text-black text-sm" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
                  </div>
                </div>

                <div>
                  <label className="text-[10px]  text-black tracking-tight block mb-1">{t('method')}</label>
                  <select className="w-full bg-slate-50 border border-slate-100 rounded-none px-3 py-3 focus:ring-2 focus:ring-indigo-500 outline-none  text-black text-sm" value={formData.method} onChange={e => setFormData({ ...formData, method: e.target.value })}>
                    <option value="Cash">{t('cash_payment')}</option>
                    <option value="Bank Transfer">{t('bank_transfer')}</option>
                    <option value="UPI">{t('upi_gpay')}</option>
                  </select>
                </div>

                <input type="text" placeholder={t('note_reference')} className="w-full bg-slate-50 border border-slate-100 rounded-none px-3 py-3 focus:ring-2 focus:ring-indigo-500 outline-none  text-black text-sm" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
              </div>

              <button onClick={handleSave} className="w-full px-4 py-4 rounded-none  bg-slate-900 text-white hover:bg-black flex items-center justify-center gap-2 text-sm">
                <Plus className="w-4 h-4" /> {t('record_transaction')}
              </button>
            </div>
          </div>
        </div>

        {/* History Section - Right Section */}
        <div className={`xl:col-span-8 space-y-4 ${showForm ? 'hidden xl:block' : 'block'}`}>
          {requests.length > 0 && (
            <div className="bg-amber-50 rounded-none border border-amber-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm text-amber-800 flex items-center gap-2 uppercase tracking-widest">
                  <History className="w-4 h-4" /> {t('pending_approvals', 'Pending Approvals')} ({requests.length})
                </h3>
                <div className="flex bg-amber-100/50 rounded-none p-1 border border-amber-200/50">
                  <button
                    onClick={() => setApprovalTab('customer')}
                    className={`px-3 py-1 text-[10px] uppercase tracking-widest font-bold ${approvalTab === 'customer' ? 'bg-white shadow-sm text-amber-900' : 'text-amber-700/70 hover:text-amber-900'}`}
                  >
                    {t('customers')} ({requests.filter(r => !!r.customerId).length})
                  </button>
                  <button
                    onClick={() => setApprovalTab('farmer')}
                    className={`px-3 py-1 text-[10px] uppercase tracking-widest font-bold ${approvalTab === 'farmer' ? 'bg-white shadow-sm text-amber-900' : 'text-amber-700/70 hover:text-amber-900'}`}
                  >
                    {t('farmers')} ({requests.filter(r => !!r.farmerId).length})
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                {requests.filter(r => approvalTab === 'customer' ? !!r.customerId : !!r.farmerId).map(req => (
                  <div key={req.id} className="bg-white p-3 rounded-none flex flex-col sm:flex-row sm:items-center justify-between border border-slate-200 gap-3 sm:gap-0">
                    <div>
                      <p className=" text-sm text-black">
                        {req.customerName || req.farmerName} <span className="text-xs text-black ml-1">{(req.customerMobile || req.farmerMobile) ? `(${req.customerMobile || req.farmerMobile})` : ''}</span>
                        <span className="text-amber-500 text-xs ml-2">₹ {req.amount}</span>
                      </p>
                      <p className="text-[10px]  text-black uppercase tracking-widest">{req.method} • {new Date(req.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="flex gap-2 self-end sm:self-auto">
                      <button onClick={() => handleApproveRequest(req)} className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 p-2  text-[10px] uppercase tracking-widest flex items-center gap-1 border border-emerald-200">
                        <Check className="w-3.5 h-3.5" /> {t('approve', 'Approve')}
                      </button>
                      <button onClick={() => handleRejectRequest(req.id)} className="bg-red-50 text-red-600 hover:bg-red-100 p-2  text-[10px] uppercase tracking-widest flex items-center gap-1 border border-red-200">
                        <X className="w-3.5 h-3.5" /> {t('reject', 'Reject')}
                      </button>
                    </div>
                  </div>
                ))}
                {requests.filter(r => approvalTab === 'customer' ? !!r.customerId : !!r.farmerId).length === 0 && (
                  <p className="text-xs text-amber-700/70 text-center py-2">{t('no_pending_requests', 'No pending requests.')}</p>
                )}
              </div>
            </div>
          )}

          <div className="bg-white rounded-none border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <h3 className="text-lg text-slate-900 flex items-center gap-2 whitespace-nowrap">
                <History className="w-5 h-5 text-indigo-500" />
                {t('full_detail_entries')}
              </h3>
              <div className="relative w-full md:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder={t('search_by_name', 'Search by name...')}
                  className="w-full bg-slate-50 border border-slate-200 rounded-none pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 text-black"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="max-h-[600px] overflow-y-auto overflow-x-auto bg-slate-50 md:bg-white border-t border-slate-100 no-scrollbar">
              {/* Desktop View */}
              <table className="w-full text-left border-collapse whitespace-nowrap hidden md:table">
                <thead className="bg-slate-50/50 text-black uppercase text-[9px] tracking-widest sticky top-0 z-10 backdrop-blur-sm">
                  <tr>
                    <th className="px-4 py-3">{t('date_person')}</th>
                    <th className="px-4 py-3">{t('type_method')}</th>
                    <th className="px-4 py-3 text-right">{t('amount')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredTransactions.map(tr => (
                    <tr key={tr.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="text-xs  text-black">{tr.date}</span>
                          <span className="text-[9px]  text-black mt-0.5">
                            {tr.personType === 'farmer' ? farmers.find(f => f.id === tr.personId)?.name : customers.find(c => c.id === tr.personId)?.name}
                            <span className="ml-2 text-indigo-500">({tr.personType === 'farmer' ? t('farmer') : t('customer')})</span>
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {tr.type === 'debit' ? (
                            <div className="p-1.5 bg-red-50 text-red-500 rounded-none"><ArrowDownCircle className="w-3.5 h-3.5" /></div>
                          ) : (
                            <div className="p-1.5 bg-emerald-50 text-emerald-500 rounded-none"><ArrowUpCircle className="w-3.5 h-3.5" /></div>
                          )}
                          <div className="flex flex-col">
                            <span className={`text-[9px]  ${tr.type === 'debit' ? 'text-red-500' : 'text-emerald-500'}`}>{tr.type === 'debit' ? t('debit_minus', 'Debit (-)') : t('credit_plus', 'Credit (+)')}</span>
                            <span className="text-[9px]  text-black">{tr.method}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`text-xs  font-mono ${tr.type === 'debit' ? 'text-red-600' : 'text-emerald-600'}`}>₹ {tr.amount.toLocaleString()}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Mobile View */}
              <div className="md:hidden divide-y divide-slate-100 max-h-[calc(100vh-220px)] overflow-y-auto no-scrollbar">
                {filteredTransactions.map(tr => {
                  const personName = tr.personType === 'farmer' ? farmers.find(f => f.id === tr.personId)?.name : customers.find(c => c.id === tr.personId)?.name;
                  return (
                    <div key={tr.id} className="bg-white p-4 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        {tr.type === 'debit' ? (
                          <div className="p-2 bg-red-50 text-red-500"><ArrowDownCircle className="w-4 h-4" /></div>
                        ) : (
                          <div className="p-2 bg-emerald-50 text-emerald-500"><ArrowUpCircle className="w-4 h-4" /></div>
                        )}
                        <div>
                          <p className="text-sm text-slate-900 tracking-tight">{personName || 'Unknown'}</p>
                          <p className="text-[10px] text-black mt-0.5">{tr.date} • {tr.method}</p>
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end">
                        <span className={`text-sm font-mono ${tr.type === 'debit' ? 'text-red-600' : 'text-emerald-600'}`}>
                          ₹ {tr.amount.toLocaleString()}
                        </span>
                        <span className={`text-[9px] mt-0.5 ${tr.type === 'debit' ? 'text-red-500' : 'text-emerald-500'}`}>
                          {tr.type === 'debit' ? t('debit_minus', 'Debit (-)') : t('credit_plus', 'Credit (+)')}
                        </span>
                      </div>
                    </div>
                  );
                })}
                {filteredTransactions.length === 0 && (
                  <div className="p-8 text-center text-slate-400 text-xs">{t('no_records_transactions', 'No transactions yet')}</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
