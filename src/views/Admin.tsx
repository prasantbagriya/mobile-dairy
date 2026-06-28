import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { db } from '../lib/db';
import { collection, setDoc, getDocs, deleteDoc, doc, query, where, getDoc } from 'firebase/firestore';
import { useI18n } from '../lib/i18n';
import { useAuth } from '../lib/auth';
import { Plus, Trash2, Save, UserPlus, Shield, ShieldCheck, ShieldAlert, X, Upload, IndianRupee } from 'lucide-react';
import InfoTooltip from '../components/InfoTooltip';
import Sync from './Sync';

export default function Admin() {
  const { t } = useI18n();
  const { user: currentUser , tenantId } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    role: 'operator' as 'admin' | 'manager' | 'operator'
  });

  const [upiId, setUpiId] = useState('');
  const [payeeName, setPayeeName] = useState('');
  const [payeeMobile, setPayeeMobile] = useState('');
  const [qrCodeImage, setQrCodeImage] = useState('');
  const [savingPaymentConfig, setSavingPaymentConfig] = useState(false);

  useEffect(() => {
    loadUsers();
    loadPaymentConfig();
  }, [tenantId]);

  async function loadUsers() {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, 'admin_configs'), where('tenantId', '==', tenantId)));
      const rawList = snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
      
      const list = rawList.filter(u => ['admin', 'manager', 'operator'].includes(u.role));
      
      // If current user is not in the list, add a mock entry for them so they see themselves
      if (!list.find(u => u.email === currentUser?.email)) {
        list.unshift({
          id: currentUser?.uid,
          email: currentUser?.email,
          displayName: currentUser?.displayName || 'Primary Admin',
          role: 'admin',
          tenantId: tenantId
        });
      }
      setUsers(list);
    } catch (e) {
      console.error("Error loading user configurations:", e);
    } finally {
      setLoading(false);
    }
  }

  async function loadPaymentConfig() {
    if (!tenantId) return;
    try {
      const docRef = doc(db, 'business_settings', `payment_config_${tenantId}`);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setUpiId(data.upiId || '');
        setPayeeName(data.payeeName || '');
        setPayeeMobile(data.payeeMobile || '');
        setQrCodeImage(data.qrCodeImage || '');
      }
    } catch(e) {
      console.error("Error loading payment config:", e);
    }
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500000) {
        alert("Image is too large. Please upload an image under 500KB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setQrCodeImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const savePaymentConfig = async () => {
    setSavingPaymentConfig(true);
    try {
      await setDoc(doc(db, 'business_settings', `payment_config_${tenantId}`), {
        upiId,
        payeeName,
        payeeMobile,
        qrCodeImage,
        tenantId,
        userId: tenantId,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      toast.success("Payment settings saved successfully!");
    } catch(e) {
      console.error(e);
      toast.error("Error saving payment settings.");
    }
    setSavingPaymentConfig(false);
  }

  async function handleSave() {
    if (!formData.email || !formData.name) {
      toast.error("Email and Name are required");
      return;
    }
    
    // Normalise email
    const cleanEmail = formData.email.trim().toLowerCase();
    
    try {
      // Create user config keyed by email address as the document ID
      await setDoc(doc(db, 'admin_configs', cleanEmail), {
        email: cleanEmail,
        displayName: formData.name.trim(),
        role: formData.role,
        tenantId: tenantId,
        createdAt: new Date().toISOString()
      });
      
      setFormData({ email: '', name: '', role: 'operator' });
      setShowForm(false);
      loadUsers();
      toast.success('User added successfully!');
    } catch (e) {
      console.error(e);
      toast.error("Error adding user: " + (e as any).message);
    }
  }

  async function handleDelete(id: string, email: string) {
    if (email === 'prashantbagriya7877@gmail.com' || id === 'guest-admin' || email === currentUser?.email) {
      toast.error("Cannot revoke access for primary administrative or current logged in account.");
      return;
    }

    if (!confirm(`Are you sure you want to revoke access for ${email}?`)) return;

    try {
      await deleteDoc(doc(db, 'admin_configs', id));
      loadUsers();
      toast.success('User access revoked');
    } catch (e) {
      console.error(e);
      toast.error("Error deleting user configuration: " + (e as any).message);
    }
  }

  const getRoleBadge = (role: string) => {
    switch(role) {
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-red-50 text-red-700 text-[9px]   tracking-wider border border-red-100">
            <ShieldAlert className="w-3 h-3" /> {t('admin_badge')}
          </span>
        );
      case 'manager':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-blue-50 text-blue-700 text-[9px]   tracking-wider border border-blue-100">
            <ShieldCheck className="w-3 h-3" /> {t('manager_badge')}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-slate-50 text-black text-[9px]   tracking-wider border border-slate-200">
            <Shield className="w-3 h-3" /> {t('operator_badge')}
          </span>
        );
    }
  };

  if (showForm) {
    return (
      <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => setShowForm(false)} className="p-2 bg-slate-100 hover:bg-slate-200 text-black rounded-none transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="square" strokeLinejoin="miter" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
          </button>
          <h2 className="text-2xl text-slate-900 tracking-tight flex items-center gap-2"><UserPlus className="w-6 h-6 text-blue-600" /> {t('register_new_user')}</h2>
        </div>

        <div className="bg-white border border-slate-200 p-6 max-w-2xl">
          <div className="space-y-4">
             <div>
                <label className="text-xs text-black tracking-widest block mb-1.5 uppercase">{t('user_email')}</label>
                <input 
                  type="email" 
                  className="w-full bg-slate-50 border border-slate-200 rounded-none px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none text-black text-sm"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="e.g. employee@gmail.com"
                />
             </div>
             <div>
                <label className="text-xs text-black tracking-widest block mb-1.5 uppercase">{t('display_name')}</label>
                <input 
                  type="text" 
                  className="w-full bg-slate-50 border border-slate-200 rounded-none px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none text-black text-sm"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g. Rahul Sharma"
                />
             </div>
             <div>
                <label className="text-xs text-black tracking-widest block mb-1.5 uppercase">{t('role_designation')}</label>
                <select 
                  className="w-full bg-slate-50 border border-slate-200 rounded-none px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none text-black text-sm"
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value as any})}
                >
                  <option value="operator">{t('role_operator')}</option>
                  <option value="manager">{t('role_manager')}</option>
                  <option value="admin">{t('role_admin')}</option>
                </select>
             </div>
          </div>
          
          <div className="mt-8 flex gap-3">
             <button onClick={() => setShowForm(false)} className="flex-1 py-3 text-slate-700 bg-slate-100 hover:bg-slate-200 text-sm transition-colors tracking-widest font-medium">{t('cancel_caps')}</button>
             <button onClick={handleSave} className="flex-1 py-3 bg-slate-900 text-white hover:bg-black rounded-none text-sm transition-colors flex items-center justify-center gap-2 tracking-widest font-medium">
                <Save className="w-4 h-4" /> {t('save_access')}
             </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl text-slate-900 tracking-tight flex items-center gap-2">{t('admin')} <InfoTooltip text={t('manage_user_access')} /></h2>
          <p className="text-black text-[10px] tracking-widest mt-0.5">{t('manage_user_access')}</p>
        </div>
        <button 
          onClick={() => setShowForm(true)} 
          className="shrink-0 whitespace-nowrap bg-slate-900 text-white px-3 py-2 text-[10px] md:px-4 md:py-2 md:text-xs rounded-none uppercase tracking-widest flex items-center justify-center gap-1.5 hover:bg-black w-auto"
        >
          <UserPlus className="w-3.5 h-3.5 md:w-4 md:h-4" /> {t('add_user')}
        </button>
      </div>

      {/* Users List */}
      <div className="bg-white rounded-none border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-50 flex items-center justify-between">
          <h3 className="text-[10px]   tracking-widest text-slate-900 leading-none">{t('registered_users')}</h3>
          <span className="bg-slate-100 px-2 py-0.5 rounded-none text-[9px]   text-black">{users.length} {t('active_profiles')}</span>
        </div>
        <div className="overflow-x-auto text-xs">
          {loading ? (
             <div className="p-12 text-center text-black   tracking-widest">{t('loading_users')}</div>
          ) : users.length === 0 ? (
            <div className="p-12 text-center text-black   tracking-widest">{t('no_users_registered')}</div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-[9px]   text-black tracking-widest border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">{t('user_name')}</th>
                  <th className="px-6 py-4">{t('email_id')}</th>
                  <th className="px-6 py-4">{t('role_access')}</th>
                  <th className="px-6 py-4 text-center">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-black">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4  text-slate-900">{u.displayName || t('pending_login')}</td>
                    <td className="px-6 py-4  text-black font-mono">{u.email}</td>
                    <td className="px-6 py-4">{getRoleBadge(u.role)}</td>
                    <td className="px-6 py-4 text-center">
                      {!(u.email === 'prashantbagriya7877@gmail.com' || u.id === 'guest-admin' || u.email === currentUser?.email) ? (
                        <button 
                          onClick={() => handleDelete(u.id, u.email)}
                          className="p-1.5 text-black hover:text-red-600 hover:bg-red-50 rounded-none border border-slate-200"
                          title={t('revoke_access')}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <span className="text-[8px]  text-slate-300  tracking-widest">{t('protected')}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Payment Configuration */}
      <div className="bg-white rounded-none border border-slate-200 overflow-hidden mt-6">
        <div className="p-4 border-b border-slate-50 flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-50 flex items-center justify-center">
            <IndianRupee className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <h3 className="text-sm  text-slate-900  tracking-tight">{t('customer_payment_settings')}</h3>
            <p className="text-[10px]  text-black  tracking-widest mt-0.5">{t('configure_upi')}</p>
          </div>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-[10px]  text-black  tracking-widest block mb-2">{t('payee_name')}</label>
              <input 
                type="text" 
                className="w-full bg-slate-50 border border-slate-200 rounded-none px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none text-black text-sm mb-4"
                value={payeeName}
                onChange={(e) => setPayeeName(e.target.value)}
                placeholder="e.g. Milk Master Pro"
              />

              <label className="text-[10px]  text-black  tracking-widest block mb-2">{t('mobile_optional')}</label>
              <input 
                type="tel" pattern="[0-9]*" 
                className="w-full bg-slate-50 border border-slate-200 rounded-none px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none text-black text-sm mb-4"
                value={payeeMobile}
                onChange={(e) => setPayeeMobile(e.target.value)}
                placeholder="e.g. 9876543210"
              />

              <label className="text-[10px]  text-black  tracking-widest block mb-2">{t('your_upi_id')}</label>
              <input 
                type="text" 
                className="w-full bg-slate-50 border border-slate-200 rounded-none px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none text-black text-sm"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="e.g. 9876543210@paytm"
              />
            </div>
            
            <div>
              <label className="text-[10px]  text-black  tracking-widest block mb-2">{t('qr_code_image')}</label>
              <div className="flex items-start gap-4">
                {qrCodeImage ? (
                  <div className="relative group">
                    <img src={qrCodeImage} alt="QR Code" className="w-24 h-24 object-contain border border-slate-200 p-1" />
                    <button 
                      onClick={() => setQrCodeImage('')}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <label className="w-24 h-24 border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-black hover:text-blue-500 hover:border-blue-500 cursor-pointer bg-slate-50">
                    <Upload className="w-6 h-6 mb-1" />
                    <span className="text-[8px]   tracking-wider text-center px-2">{t('upload_qr')}</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  </label>
                )}
                <div className="flex-1 text-xs text-black mt-2">
                  <p className="">{t('instructions')}</p>
                  <ul className="list-disc list-inside mt-1 space-y-1 text-[10px]  tracking-wider">
                    <li>{t('upi_instruction_1')}</li>
                    <li>{t('upi_instruction_2')}</li>
                    <li>{t('upi_instruction_3')}</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end pt-4 border-t border-slate-50">
            <button 
              onClick={savePaymentConfig}
              disabled={savingPaymentConfig}
              className="bg-blue-600 text-white px-6 py-3 rounded-none  text-xs tracking-wider  flex items-center gap-2 hover:bg-blue-700 disabled:opacity-70"
            >
              <Save className="w-4 h-4" /> {savingPaymentConfig ? t('saving') : t('save_settings')}
            </button>
          </div>
        </div>
      </div>
      
      {/* Cloud Sync Configuration */}
      <div className="mt-6">
        <Sync />
      </div>
    </div>
  );
}
