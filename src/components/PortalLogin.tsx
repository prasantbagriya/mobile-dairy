import React, { useState } from 'react';
import { useAuth } from '../lib/auth';
import { Milk, ArrowRight, Lock, AlertCircle, RefreshCw, Phone, Store } from 'lucide-react';

export default function PortalLogin({ role }: { role: 'farmer' | 'customer' }) {
  const { loginAsFarmer, loginAsCustomer } = useAuth();
  const [mobile, setMobile] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isFarmer = role === 'farmer';
  const bgColor = isFarmer ? 'bg-emerald-600' : 'bg-orange-600';
  const hoverBgColor = isFarmer ? 'hover:bg-emerald-700' : 'hover:bg-orange-700';
  const lightBgColor = isFarmer ? 'text-emerald-100' : 'text-orange-100';
  const title = isFarmer ? 'Farmer Portal' : 'Customer Portal';
  const loginTitle = isFarmer ? 'Farmer Login' : 'Customer Login';
  const Icon = isFarmer ? Milk : Store;

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (pin.length !== 4) {
        throw new Error("PIN must be 4 digits.");
      }
      if (isFarmer) {
        await loginAsFarmer(mobile, pin);
      } else {
        await loginAsCustomer(mobile, pin);
      }
    } catch (err: any) {
      console.error("Auth Error", err);
      let msg = err.message || "An error occurred";
      if (msg.includes('auth/invalid-credential') || msg.includes('auth/wrong-password')) {
        msg = "Invalid Mobile Number or PIN.";
      }
      if (msg.includes('auth/user-not-found')) {
        msg = isFarmer ? "Farmer not registered." : "Customer not registered.";
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white border border-slate-200 overflow-hidden">
        
        {/* Header Section */}
        <div className={`${bgColor} p-8 text-center relative overflow-hidden`}>
          <div className="w-16 h-16 bg-white/20 rounded-none flex items-center justify-center mx-auto mb-4 border border-white/30">
            <Icon className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl text-white tracking-tight relative z-10">MilkMaster</h1>
          <p className={`${lightBgColor} text-sm mt-1 relative z-10`}>{title}</p>
        </div>

        {/* Form Section */}
        <div className="p-8 space-y-6">
          <div>
            <h2 className="text-xl text-black mb-6 text-center">
              {loginTitle}
            </h2>

            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-none text-xs flex items-center gap-2 border border-red-100">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleAuth} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] tracking-widest text-black">Mobile Number</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black" />
                  <input 
                    type="tel" pattern="[0-9]*" 
                    required
                    maxLength={10}
                    placeholder="9876543210"
                    className="w-full bg-slate-50 border border-slate-200 rounded-none py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-transparent"
                    value={mobile}
                    onChange={e => {
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      setMobile(val);
                    }}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] tracking-widest text-black">4-Digit PIN</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black" />
                  <input 
                    type="password" 
                    required
                    maxLength={4}
                    placeholder="••••"
                    className="w-full bg-slate-50 border border-slate-200 rounded-none py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-transparent tracking-widest"
                    value={pin}
                    onChange={e => setPin(e.target.value)}
                  />
                </div>
                <p className="text-[10px] text-black text-center mt-2">PIN is the first 4 digits of your mobile number.</p>
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className={`w-full ${bgColor} text-white rounded-none py-3 flex items-center justify-center gap-2 ${hoverBgColor} disabled:opacity-70 mt-2 text-sm`}
              >
                {loading ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <>Sign In <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
