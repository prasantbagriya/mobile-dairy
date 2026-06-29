import React, { useState, useEffect, useRef, useMemo, Suspense, lazy } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import toast from 'react-hot-toast';
import { useI18n } from '../lib/i18n';
import { db } from '../lib/db';
import { collection, where, addDoc, onSnapshot, updateDoc, deleteDoc, doc, query, orderBy, writeBatch, getDocs } from 'firebase/firestore';
import { Customer } from '../types';
import { Plus, Search, Edit2, Phone, MapPin, FileText, Save, Trash2, X, Power, LayoutGrid, List as ListIcon } from 'lucide-react';
const SharedLedger = lazy(() => import('../components/SharedLedger'));
import { useAuth } from '../lib/auth';
import InfoTooltip from '../components/InfoTooltip';

export default function Customers() {
  const { t } = useI18n();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [currentCustomer, setCurrentCustomer] = useState<Partial<Customer> | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [search, setSearch] = useState("");
  const [contactSearch, setContactSearch] = useState("");
  const [contacts, setContacts] = useState<any[]>([]);
  const [allContactsCache, setAllContactsCache] = useState<any[] | null>(null);
  const [searchingContacts, setSearchingContacts] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    const saved = localStorage.getItem('customersViewMode');
    return (saved as 'grid' | 'list') || 'list';
  });

  useEffect(() => {
    localStorage.setItem('customersViewMode', viewMode);
  }, [viewMode]);
  const { accessToken, user, tenantId, connectGoogle, registerCustomerLogin } = useAuth();
  const tableContainerRef = useRef<HTMLDivElement>(null);

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => (c.name || "").toLowerCase().includes(search.toLowerCase()));
  }, [customers, search]);
  
  const rowVirtualizer = useVirtualizer({
    count: filteredCustomers.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 56,
    overscan: 5
  });

  useEffect(() => {
    if (!tenantId) return;
    setLoading(true);
    const q = query(collection(db, 'customers'), where('userId', '==', tenantId));
    const unsubscribe = onSnapshot(q, (snap) => {
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));
      list.sort((a, b) => {
        const seqA = a.sequence || 0;
        const seqB = b.sequence || 0;
        if (seqA !== seqB) return seqA - seqB;
        return (a.name || "").localeCompare(b.name || "");
      });
      setCustomers(list);
      setLoading(false);
    }, (error) => {
      console.error(error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [tenantId]);

  useEffect(() => {
    if (allContactsCache) {
      if (contactSearch.trim()) {
        const query = contactSearch.toLowerCase().trim();
        const searchDigits = query.replace(/\D/g, '');
        
        const filtered = allContactsCache.filter((c: any) => {
          const name = c.person?.names?.[0]?.displayName?.toLowerCase() || '';
          const phone = c.person?.phoneNumbers?.[0]?.value || '';
          const phoneDigits = phone.replace(/\D/g, '');
          
          if (name.includes(query)) return true;
          if (searchDigits.length > 0 && phoneDigits.includes(searchDigits)) return true;
          if (phone.includes(query)) return true;
          
          return false;
        });
        setContacts(filtered.slice(0, 50));
      } else {
        setContacts(allContactsCache.slice(0, 50));
      }
    }
  }, [contactSearch, allContactsCache]);

  useEffect(() => {
    if (showForm && accessToken && !allContactsCache && !searchingContacts) {
      handleSearchContacts(false, true);
    }
  }, [showForm, accessToken, allContactsCache]);

  const handleSearchContacts = async (forceRefresh = false, isSilent = false) => {
    if (searchingContacts) return;
    setSearchingContacts(true);
    try {
      let fullList = forceRefresh ? null : allContactsCache;
      
      if (!fullList) {
        const url = 'https://people.googleapis.com/v1/people/me/connections?personFields=names,phoneNumbers,photos&pageSize=1000';
        const resp = await fetch(url, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        const data = await resp.json();
        
        if (!resp.ok) {
          if (!isSilent) {
            alert("Google Contacts Error: " + (data.error?.message || "Enable People API in Google Cloud Console."));
          }
          setSearchingContacts(false);
          return;
        }
        
        fullList = (data.connections || []).map((c: any) => ({ person: c }));
        setAllContactsCache(fullList);
      }
    } catch (e: any) {
      console.error(e);
      alert("Failed to load contacts: " + e.message);
    } finally {
      setSearchingContacts(false);
    }
  };

  if (selectedCustomer) {
    return (
      <div className="-m-4 md:-m-6">
        <SharedLedger 
          person={selectedCustomer} 
          type="customer"
          allPersons={customers}
          onClose={() => setSelectedCustomer(null)} 
          onNavigateToPerson={(c) => setSelectedCustomer(c as Customer)}
          onRefresh={() => {
            const updated = customers.find(curr => curr.id === selectedCustomer.id);
            if (updated) setSelectedCustomer(updated);
          }}
        />
      </div>
    );
  }

  async function handleDeactivate() {
    if (!customerToDelete?.id) return;
    try {
      await updateDoc(doc(db, 'customers', customerToDelete.id), { 
        isActive: false, 
        updatedAt: new Date().toISOString() 
      });
      setCustomerToDelete(null);
      toast.success('Customer deactivated');
    } catch (e) { console.error(e); toast.error('Error deactivating'); }
  }

  async function handleHardDelete() {
    if (!customerToDelete?.id) return;
    try {
      await deleteDoc(doc(db, 'customers', customerToDelete.id));
      setCustomerToDelete(null);
      toast.success('Customer deleted');
    } catch (e) { console.error(e); toast.error('Error deleting'); }
  }

  async function handleActivate(c: Customer) {
    if (!c.id) return;
    try {
      await updateDoc(doc(db, 'customers', c.id), { 
        isActive: true, 
        updatedAt: new Date().toISOString() 
      });
      toast.success('Customer activated');
    } catch (e) { console.error(e); toast.error('Error activating'); }
  }

  async function handleSave() {
    if (!currentCustomer?.name) {
      toast.error("Customer Name is required");
      return;
    }
    if (!currentCustomer?.mobile) {
      toast.error("Mobile Number is required");
      return;
    }
    try {
      // Duplicate mobile check
      const currentMobile = currentCustomer?.mobile?.trim();
      if (currentMobile) {
        const farmersQ = query(collection(db, 'farmers'), where('userId', '==', tenantId), where('mobile', '==', currentMobile));
        const customersQ = query(collection(db, 'customers'), where('userId', '==', tenantId), where('mobile', '==', currentMobile));
        
        let farmersSnap, customersSnap;
        try {
          [farmersSnap, customersSnap] = await Promise.all([getDocs(farmersQ), getDocs(customersQ)]);
        } catch(err: any) { throw new Error("getDocs error: " + err.message); }
        
        const isDuplicateFarmer = !farmersSnap.empty;
        const isDuplicateCustomer = customersSnap.docs.some(d => d.id !== currentCustomer.id);
        
        if (isDuplicateFarmer || isDuplicateCustomer) {
          toast.error(`This mobile number is already registered for another ${isDuplicateFarmer ? 'Farmer' : 'Customer'}.`);
          return;
        }
      }

      const now = new Date().toISOString();
      const customerData: any = {};
      
      let targetSeq = parseInt(currentCustomer.sequence as any) || 0;
      if (targetSeq === 0) {
        const maxSeq = customers.reduce((max, c) => Math.max(max, c.sequence || 0), 0);
        targetSeq = maxSeq + 1;
      }

      // Save current customer
      Object.entries(currentCustomer).forEach(([key, value]) => {
        if (value !== undefined && value !== null && key !== 'id') {
          customerData[key] = value;
        }
      });

      if (!customerData.balance) customerData.balance = 0;
      customerData.sequence = targetSeq;
      customerData.defaultRate = parseFloat(customerData.defaultRate as any);
      if (isNaN(customerData.defaultRate)) delete customerData.defaultRate;
      
      customerData.fixedQty = parseFloat(customerData.fixedQty as any);
      if (isNaN(customerData.fixedQty)) delete customerData.fixedQty;
      customerData.updatedAt = now;

      const batch = writeBatch(db);

      // Check for sequence conflict
      const conflict = customers.find(c => c.sequence === targetSeq && c.id !== currentCustomer.id);
      if (conflict) {
        // Automatically shift all customers from targetSeq onwards
        const toShift = customers.filter(c => (c.sequence || 0) >= targetSeq && c.id !== currentCustomer.id);
        for (const c of toShift) {
          batch.update(doc(db, 'customers', c.id!), { sequence: (c.sequence || 0) + 1 });
        }
      }

      let recordId = currentCustomer.id;
      if (currentCustomer.id) {
        batch.update(doc(db, 'customers', currentCustomer.id), customerData);
      } else {
        customerData.createdAt = now;
        customerData.syncPending = true;
        customerData.userId = tenantId;
        const newRef = doc(collection(db, 'customers'));
        recordId = newRef.id;
        batch.set(newRef, customerData);
      }
      
      await batch.commit();

      if (customerData.mobile && recordId) {
        await registerCustomerLogin(customerData.mobile, recordId, customerData.name || '');
      }

      setCurrentCustomer(null);
      setShowForm(false);
      toast.success(currentCustomer.id ? 'Customer updated successfully' : 'Customer registered successfully');
    } catch (e) {
      console.error(e);
      toast.error("Error saving customer: " + (e as any).message);
    }
  }

  if (showForm) {
    return (
      <div className="-m-4 md:-m-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="bg-white w-full min-h-screen overflow-hidden">
          <div className="bg-emerald-600 p-4 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white/20 flex items-center justify-center">
                <Plus className="w-4 h-4" />
              </div>
              <h3 className="text-lg tracking-tight">{currentCustomer?.id ? 'Update Customer Profile' : 'Add New Customer'}</h3>
            </div>
            <button 
              onClick={() => { setShowForm(false); setCurrentCustomer(null); }} 
              className="p-1 hover:bg-white/10 transition-colors flex items-center gap-1 text-sm"
            >
              <X className="w-5 h-5 text-white" /> 
            </button>
          </div>

          <div className="p-4 space-y-4 w-full">
            {/* Contact Search Tool */}
            <div className="p-2 bg-slate-50 border border-slate-200 space-y-2">
              <p className="text-[10px] text-black font-medium leading-none">Import from Google Contacts</p>
              {!accessToken ? (
                <div className="bg-amber-50 p-2 flex items-center justify-between border border-amber-200 overflow-x-auto no-scrollbar">
                  <span className="text-[10px] text-amber-700 whitespace-nowrap">Contacts not linked</span>
                  <button onClick={connectGoogle} className="px-2 py-1 ml-1 bg-amber-600 text-white text-[10px] hover:bg-amber-700 whitespace-nowrap shrink-0">Connect Google</button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Search name or phone..." 
                    className="flex-1 bg-white border border-slate-200 px-2 py-1.5 text-xs focus:outline-none"
                    value={contactSearch}
                    onChange={e => setContactSearch(e.target.value)}
                  />
                  <button 
                    onClick={() => handleSearchContacts(true)}
                    className="bg-slate-900 text-white px-4 py-2 text-[10px] hover:bg-black transition"
                    title="Refresh Contacts"
                  >
                    {searchingContacts ? '...' : 'Refresh'}
                  </button>
                </div>
              )}
              {contacts.length > 0 && (
                <div className="max-h-32 overflow-auto no-scrollbar border-t border-slate-200 mt-2 pt-2 space-y-1">
                  {contacts.map((c, i) => {
                    const name = c.person?.names?.[0]?.displayName || 'No Name';
                    const phone = c.person?.phoneNumbers?.[0]?.value || '';
                    return (
                      <button 
                        key={i}
                        onClick={() => {
                          setCurrentCustomer({...currentCustomer!, name, mobile: phone});
                          setContacts([]);
                          setContactSearch("");
                        }}
                        className="w-full text-left p-2 hover:bg-white text-[10px] border border-transparent hover:border-slate-200 group flex justify-between items-center"
                      >
                        <div>
                          <p className="text-slate-900">{name}</p>
                          <p className="text-black">{phone}</p>
                        </div>
                        <span className="text-emerald-600 opacity-0 group-hover:opacity-100 text-[8px]">Select</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div className="md:col-span-2">
                <label className="text-[10px] text-black font-medium block mb-1">Customer Name</label>
                <input 
                  type="text" 
                  className="w-full bg-slate-50 border border-slate-200 rounded-none px-2 py-1.5 focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-black text-sm"
                  value={currentCustomer?.name || ''}
                  onChange={(e) => setCurrentCustomer({...currentCustomer!, name: e.target.value})}
                  placeholder="Enter full name"
                />
              </div>
              
              <div>
                <label className="text-[10px] text-black font-medium block mb-1">{t('mobile')}</label>
                <input 
                  type="tel" pattern="[0-9]*" inputMode="decimal" maxLength={10}
                  className="w-full bg-slate-50 border border-slate-200 rounded-none px-2 py-1.5 focus:ring-2 focus:ring-emerald-500 outline-none text-black text-sm"
                  value={currentCustomer?.mobile || ''}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, '');
                    setCurrentCustomer({...currentCustomer!, mobile: val});
                  }}
                />
              </div>
              <div>
                <label className="text-[10px] text-black font-medium block mb-1">Route Sequence</label>
                <input 
                  type="number" inputMode="decimal" pattern="[0-9]*" 
                  className="w-full bg-slate-50 border border-slate-200 rounded-none px-2 py-1.5 focus:ring-2 focus:ring-emerald-500 outline-none text-black text-sm"
                  value={currentCustomer?.sequence || ''}
                  onChange={(e) => setCurrentCustomer({...currentCustomer!, sequence: e.target.value as any})}
                />
              </div>

              <div>
                <label className="text-[10px] text-black font-medium block mb-1">Fixed Qty (Liters)</label>
                <input 
                  type="number" inputMode="decimal" pattern="[0-9]*" 
                  className="w-full bg-emerald-50 border border-emerald-100 rounded-none px-2 py-1.5 focus:ring-2 focus:ring-emerald-500 outline-none text-emerald-800 text-sm"
                  value={currentCustomer?.fixedQty || ''}
                  onChange={(e) => setCurrentCustomer({...currentCustomer!, fixedQty: parseFloat(e.target.value) || undefined})}
                />
              </div>
              <div>
                <label className="text-[10px] text-black font-medium block mb-1">Fixed Rate (₹/L)</label>
                <input 
                  type="number" inputMode="decimal" pattern="[0-9]*" 
                  className="w-full bg-slate-100 border border-slate-200 rounded-none px-2 py-1.5 focus:ring-2 focus:ring-emerald-500 outline-none text-black text-sm"
                  value={currentCustomer?.defaultRate || ''}
                  onChange={(e) => setCurrentCustomer({...currentCustomer!, defaultRate: e.target.value as any})}
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-[10px] text-amber-600 font-medium block mb-1">Initial Dues (Opening Balance)</label>
                <input 
                  type="number" inputMode="decimal" pattern="[0-9]*" 
                  className="w-full bg-amber-50 border border-amber-100 rounded-none px-2 py-1.5 focus:ring-2 focus:ring-amber-500 outline-none text-black text-sm"
                  value={currentCustomer?.balance || ''}
                  onChange={(e) => setCurrentCustomer({...currentCustomer!, balance: parseFloat(e.target.value) || 0})}
                  disabled={!!currentCustomer?.id}
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-[10px] text-black font-medium block mb-1">{t('address')}</label>
                <textarea 
                  className="w-full bg-slate-50 border border-slate-200 rounded-none px-2 py-1.5 focus:ring-2 focus:ring-emerald-500 outline-none text-black text-sm min-h-[80px]"
                  value={currentCustomer?.address || ''}
                  onChange={(e) => setCurrentCustomer({...currentCustomer!, address: e.target.value})}
                  placeholder="Delivery address..."
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2 pb-4">
              <button 
                onClick={() => { setShowForm(false); setCurrentCustomer(null); }}
                className="flex-1 px-2 py-3 whitespace-nowrap rounded-none bg-slate-100 text-black hover:bg-slate-200 transition-all text-xs tracking-wide font-medium"
              >
                Cancel
              </button>
              <button onClick={handleSave} style={{ flex: 2 }} className="px-2 py-3 whitespace-nowrap rounded-none bg-slate-900 text-white hover:bg-black transition-all flex items-center justify-center gap-2 text-xs tracking-wide font-medium">
                <Save className="w-4 h-4 shrink-0" /> {currentCustomer?.id ? 'Update Customer' : 'Register Customer'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const searchAndToggleUI = (className: string) => (
    <div className={`bg-white p-2 rounded-none border border-slate-100 items-center justify-between gap-2 px-4 ${className}`}>
      <div className="flex-1 flex items-center gap-2 min-w-[200px]">
        <Search className="w-4 h-4 text-black" />
        <input 
          type="text" 
          placeholder="Search..." 
          className="flex-1 bg-transparent py-1.5 focus:outline-none text-black  placeholder:text-slate-300 text-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="flex items-center gap-1 border-l border-slate-100 pl-3">
        <button 
          onClick={() => setViewMode('grid')}
          className={`p-1.5 rounded-none transition-colors ${viewMode === 'grid' ? 'bg-slate-100 text-slate-900' : 'text-black hover:text-black hover:bg-slate-50'}`}
          title="Grid View"
        >
          <LayoutGrid className="w-4 h-4" />
        </button>
        <button 
          onClick={() => setViewMode('list')}
          className={`p-1.5 rounded-none transition-colors ${viewMode === 'list' ? 'bg-slate-100 text-slate-900' : 'text-black hover:text-black hover:bg-slate-50'}`}
          title="List View"
        >
          <ListIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 md:gap-4">
        <div className="min-w-0">
          <h2 className="text-xl md:text-2xl text-slate-900 tracking-tight flex items-center gap-1.5 md:gap-2 truncate">{t('customers')} <InfoTooltip text="Manage your regular milk buyers and their accounts." /></h2>
          <p className="text-black text-[9px] md:text-[10px] tracking-widest mt-0.5 truncate">{customers.length} retail customers</p>
        </div>
        {searchAndToggleUI("hidden md:flex flex-1 max-w-md mx-4")}

        <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
          <button 
            onClick={() => {
              setCurrentCustomer({});
              setShowForm(true);
            }}
            className="flex items-center gap-1 md:gap-2 bg-slate-900 text-white px-2.5 py-1.5 md:px-3 text-[10px] md:text-[11px] tracking-tight hover:bg-black whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t('addCustomer')}</span>
            <span className="sm:hidden">{t('add_new')}</span>
          </button>
          <button 
            onClick={() => {}}
            className="p-1.5 bg-white border border-slate-200 text-black hover:text-emerald-600 transition-colors"
            title="Refresh List"
          >
            <Search className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 items-start">
        {/* Customer List Section */}
        <div className="space-y-4">
          {/* Search Bar - Mobile Only */}
          {searchAndToggleUI("flex md:hidden")}

          {(() => {
            if (viewMode === 'grid') {
              return (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-4">
                  {filteredCustomers.map(customer => {
                const isDeactivated = customer.isActive === false;
                return (
                <div 
                  key={customer.id}
                  className={`bg-white p-2.5 md:p-4 rounded-none border border-slate-100 transition-shadow group relative overflow-hidden flex flex-col justify-between ${isDeactivated ? 'opacity-75 grayscale' : ''}`}
                >
                  <div className="flex items-start justify-between mb-2 md:mb-3">
                    <div className="flex items-center gap-1.5 md:gap-2 overflow-hidden">
                      <div className={`w-8 h-8 md:w-10 md:h-10 shrink-0 rounded-none flex items-center justify-center text-xs md:text-sm font-bold ${isDeactivated ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                        #{customer.sequence || '?'}
                      </div>
                      <div className="truncate">
                        <h3 className="text-slate-900 text-xs md:text-sm font-bold truncate">{customer.name}</h3>
                        {isDeactivated && <span className="text-[8px] md:text-[10px] text-red-600 tracking-widest">Deactivated</span>}
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-1 md:space-y-2 mb-3 md:mb-4">
                    <div className="flex items-center gap-1.5 md:gap-2 text-black text-[9px] md:text-xs">
                      <Phone className="w-3 h-3 md:w-4 md:h-4 text-slate-300 shrink-0" />
                      <span className="truncate">{customer.mobile}</span>
                    </div>
                    <div className="flex items-center gap-1.5 md:gap-2 text-black text-[9px] md:text-xs">
                      <MapPin className="w-3 h-3 md:w-4 md:h-4 text-slate-300 shrink-0" />
                      <span className="truncate">{customer.address || "N/A"}</span>
                    </div>
                  </div>

                  <div className="mt-auto">
                    <div className="flex items-center justify-between mb-2 md:mb-3">
                      <div className="flex flex-col">
                        <span className={`text-[10px] md:text-xs font-bold ${customer.balance > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                          ₹{customer.balance}
                        </span>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        {isDeactivated ? (
                          <button onClick={() => handleActivate(customer)} className="p-1 text-emerald-600 hover:bg-emerald-50 border border-emerald-100" title="Turn On"><Power className="w-3 h-3" /></button>
                        ) : (
                          <>
                            <button onClick={() => { setCurrentCustomer(customer); setShowForm(true); }} className="p-1 text-black hover:text-blue-600 hover:bg-blue-50 border border-slate-100"><Edit2 className="w-3 h-3" /></button>
                            <button onClick={() => setCustomerToDelete(customer)} className="p-1 text-black hover:text-red-600 hover:bg-red-50 border border-slate-100"><Trash2 className="w-3 h-3" /></button>
                          </>
                        )}
                      </div>
                    </div>

                    <button 
                      onClick={() => setSelectedCustomer(customer)}
                      className="w-full py-1.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-none flex items-center justify-center gap-1.5 border border-emerald-700"
                    >
                      <FileText className="w-3 h-3" />
                      <span className="text-[9px] tracking-widest font-bold">Full Detail</span>
                    </button>
                  </div>
                </div>
              )})}
            </div>
              );
            }

            return (
            <div ref={tableContainerRef} className="bg-white border border-slate-100 overflow-auto no-scrollbar h-[calc(100vh-200px)] min-h-[400px]">
              <table className="w-full xl:w-max text-left border-collapse min-w-[800px] relative">
                <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-100 shadow-sm">
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-2 md:px-6 py-3 md:py-4 text-[10px] text-black font-semibold capitalize tracking-widest whitespace-nowrap">{t('seq_no')}</th>
                    <th className="px-2 md:px-6 py-3 md:py-4 text-[10px] text-black font-semibold capitalize tracking-widest whitespace-nowrap">{t('customer')}</th>
                    <th className="px-2 md:px-6 py-3 md:py-4 text-[10px] text-black font-semibold capitalize tracking-widest whitespace-nowrap">{t("contact")}</th>
                    <th className="px-2 md:px-6 py-3 md:py-4 text-[10px] text-black font-semibold capitalize tracking-widest whitespace-nowrap">{t('fixed_rate')}</th>
                    <th className="px-2 md:px-6 py-3 md:py-4 text-[10px] text-black font-semibold capitalize tracking-widest text-right whitespace-nowrap">{t('balance')}</th>
                    <th className="px-2 md:px-6 py-3 md:py-4 text-[10px] text-black font-semibold capitalize tracking-widest text-center whitespace-nowrap">{t("actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(() => {
                    const virtualItems = rowVirtualizer.getVirtualItems();
                    const paddingTop = virtualItems.length > 0 ? virtualItems[0].start : 0;
                    const paddingBottom = virtualItems.length > 0
                      ? rowVirtualizer.getTotalSize() - virtualItems[virtualItems.length - 1].end
                      : 0;

                    return (
                      <>
                        {paddingTop > 0 && <tr><td style={{ height: `${paddingTop}px` }} colSpan={6} /></tr>}
                        {virtualItems.map((virtualRow) => {
                          const customer = filteredCustomers[virtualRow.index];
                          const isDeactivated = customer.isActive === false;
                          return (
                            <tr key={customer.id} 
                              className={`hover:bg-slate-50 transition-colors ${isDeactivated ? 'opacity-75 grayscale bg-slate-50/50' : ''}`}
                            >
                              <td className="px-2 md:px-6 py-2.5 md:py-4 whitespace-nowrap">
                                <span className="text-xs text-black">#{customer.sequence || '?'}</span>
                              </td>
                              <td className="px-2 md:px-6 py-2.5 md:py-4 whitespace-nowrap">
                                <div className="flex items-center gap-2 md:gap-3">
                                  <div className={`w-8 h-8 md:w-10 md:h-10 flex items-center justify-center text-sm font-medium ${isDeactivated ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-700'}`}>
                                    {(customer.name || "?").charAt(0)}
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-sm font-medium text-slate-900">{customer.name}</span>
                                    {isDeactivated && <span className="text-[10px] text-red-600 font-medium">Deactivated</span>}
                                  </div>
                                </div>
                              </td>
                              <td className="px-2 md:px-6 py-2.5 md:py-4 whitespace-nowrap">
                                <div className="flex flex-col gap-1">
                                  <span className="text-xs text-slate-700 flex items-center gap-1"><Phone className="w-3 h-3"/> {customer.mobile}</span>
                                  <span className="text-[10px] text-slate-500 flex items-center gap-1"><MapPin className="w-3 h-3"/> {customer.address || 'N/A'}</span>
                                </div>
                              </td>
                              <td className="px-2 md:px-6 py-2.5 md:py-4 whitespace-nowrap">
                                <span className="text-xs font-medium text-slate-700">₹ {customer.defaultRate || 'NAV'}/L</span>
                              </td>
                              <td className="px-2 md:px-6 py-2.5 md:py-4 whitespace-nowrap text-right">
                                <span className={`text-sm font-bold ${customer.balance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                  ₹ {customer.balance}
                                </span>
                              </td>
                              <td className="px-2 md:px-6 py-2.5 md:py-4 whitespace-nowrap text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <button 
                                    onClick={() => setSelectedCustomer(customer)}
                                    className="p-1.5 text-blue-600 hover:bg-blue-50 transition-colors"
                                    title="Full Detail"
                                  >
                                    <FileText className="w-4 h-4" />
                                  </button>
                                  {isDeactivated ? (
                                    <button 
                                      onClick={() => handleActivate(customer)}
                                      className="p-1.5 text-emerald-600 hover:bg-emerald-50 transition-colors"
                                      title="Turn On"
                                    >
                                      <Power className="w-4 h-4" />
                                    </button>
                                  ) : (
                                    <>
                                      <button 
                                        onClick={() => {
                                          setCurrentCustomer(customer);
                                          setShowForm(true);
                                        }}
                                        className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                        title="Edit"
                                      >
                                        <Edit2 className="w-4 h-4" />
                                      </button>
                                      <button 
                                        onClick={() => setCustomerToDelete(customer)}
                                        className="p-1.5 text-slate-600 hover:text-red-600 hover:bg-red-50 transition-colors"
                                        title="Delete"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                        {paddingBottom > 0 && <tr><td style={{ height: `${paddingBottom}px` }} colSpan={6} /></tr>}
                      </>
                    );
                  })()}
                </tbody>
              </table>
            </div>
            );
          })()}

          {customers.length === 0 && (
            <div className="py-12 text-center bg-white border border-slate-100 rounded-none">
               <MapPin className="w-10 h-10 text-slate-200 mx-auto mb-3" />
               <p className="text-black  text-xs tracking-widest">{t('no_records')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Delete / Deactivate Modal */}
        {customerToDelete && (
          <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md max-h-[90vh] overflow-y-auto border border-slate-200 flex flex-col">
              <div className="bg-red-600 p-4 text-white flex items-center justify-between">
                <h3 className="text-lg  tracking-tight">Delete Profile?</h3>
                <button onClick={() => setCustomerToDelete(null)} className="p-1 hover:bg-white/10">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-3">
                <p className="text-sm  text-black">
                  Are you sure you want to delete <span className="text-black">{customerToDelete.name}</span>?
                  You can keep their data but hide their profile by deactivating them.
                </p>

                <div className="space-y-3">
                  <button 
                    onClick={handleDeactivate}
                    className="w-full flex items-center justify-between px-2 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-300  transition-colors group"
                  >
                    <div className="flex flex-col text-left">
                       <span className="text-xs tracking-widest mb-0.5">Deactivate Profile</span>
                       <span className="text-[10px] text-black ">Keep data but hide from menus</span>
                    </div>
                    <Power className="w-4 h-4 text-black group-hover:text-black" />
                  </button>

                  <button 
                    onClick={handleHardDelete}
                    className="w-full flex items-center justify-between px-2 py-1.5 bg-red-50 hover:bg-red-100 text-red-900 border border-red-200  transition-colors group"
                  >
                    <div className="flex flex-col text-left">
                       <span className="text-xs tracking-widest mb-0.5">Permanently Delete</span>
                       <span className="text-[10px] text-red-500 ">Wipe completely from database</span>
                    </div>
                    <Trash2 className="w-4 h-4 text-red-400 group-hover:text-red-600" />
                  </button>
                </div>

                <button 
                  onClick={() => setCustomerToDelete(null)}
                  className="w-full px-2 py-1.5 text-black  hover:bg-slate-50 tracking-widest text-xs"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}


