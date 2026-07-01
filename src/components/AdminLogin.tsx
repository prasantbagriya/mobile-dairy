import React, { useState } from 'react';
import { useAuth } from '../lib/auth';
import { Milk, ArrowRight, Mail, Lock, AlertCircle, RefreshCw } from 'lucide-react';

export default function AdminLogin() {
  const { login, loginWithEmail, signupWithEmail, resetPassword } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot_password'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      if (mode === 'signup') {
        if (password !== confirmPassword) {
          throw new Error("Passwords do not match");
        }
        await signupWithEmail(email, password);
      } else if (mode === 'forgot_password') {
        await resetPassword(email);
        setSuccessMsg("Password reset email sent! Please check your inbox.");
        setMode('login');
      } else {
        await loginWithEmail(email, password);
      }
    } catch (err: any) {
      console.error("Auth Error", err);
      // Simplify Firebase error messages
      let msg = err.message || "An error occurred";
      if (msg.includes('auth/invalid-credential') || msg.includes('auth/wrong-password')) msg = "Invalid email or password.";
      if (msg.includes('auth/email-already-in-use')) msg = "This email is already registered.";
      if (msg.includes('auth/weak-password')) msg = "Password should be at least 6 characters.";
      if (msg.includes('auth/user-not-found')) msg = "No user found with this email.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white border border-slate-200 overflow-hidden">
        
        {/* Header Section */}
        <div className="bg-blue-600 p-8 text-center relative overflow-hidden">
          <div className="w-16 h-16 bg-white/20 rounded-none flex items-center justify-center mx-auto mb-4 border border-white/30">
            <Milk className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl text-white tracking-tight relative z-10">MilkMaster</h1>
          <p className="text-blue-100 text-sm mt-1 relative z-10">Admin Login</p>
        </div>

        {/* Form Section */}
        <div className="p-8 space-y-6">
          <div>
            <h2 className="text-xl text-black mb-6 text-center">
              {mode === 'login' ? 'Welcome Back' : mode === 'signup' ? 'Create an Account' : 'Reset Password'}
            </h2>

            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-none text-xs flex items-center gap-2 border border-red-100">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="mb-4 p-3 bg-emerald-50 text-emerald-700 rounded-none text-xs border border-emerald-100">
                {successMsg}
              </div>
            )}

            <form onSubmit={handleEmailAuth} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] tracking-widest text-black">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black" />
                  <input id="auto-input-71" name="auto-input-71" 
                    type="email" 
                    required
                    placeholder="you@example.com"
                    className="w-full bg-slate-50 border border-slate-200 rounded-none py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                </div>
              </div>

              {mode !== 'forgot_password' && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] tracking-widest text-black">Password</label>
                    {mode === 'login' && (
                      <button type="button" onClick={() => { setMode('forgot_password'); setError(''); }} className="text-[10px] text-blue-600 hover:text-blue-700">Forgot?</button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black" />
                    <input id="auto-input-72" name="auto-input-72" 
                      type="password" 
                      required
                      placeholder="••••••••"
                      className="w-full bg-slate-50 border border-slate-200 rounded-none py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {mode === 'signup' && (
                <div className="space-y-1">
                  <label className="text-[10px] tracking-widest text-black">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black" />
                    <input id="auto-input-73" name="auto-input-73" 
                      type="password" 
                      required
                      placeholder="••••••••"
                      className="w-full bg-slate-50 border border-slate-200 rounded-none py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-blue-600 text-white rounded-none py-3 flex items-center justify-center gap-2 hover:bg-blue-700 disabled:opacity-70 mt-2 text-sm"
              >
                {loading ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : mode === 'login' ? (
                  <>Sign In <ArrowRight className="w-4 h-4" /></>
                ) : mode === 'signup' ? (
                  'Create Account'
                ) : (
                  'Send Reset Link'
                )}
              </button>
            </form>
          </div>

          {mode === 'login' ? (
            <div className="pt-4 border-t border-slate-100 space-y-4">
              <button 
                onClick={login}
                type="button"
                className="w-full bg-slate-900 text-white py-3 rounded-none flex items-center justify-center gap-3 hover:bg-black"
              >
                <img src="https://www.google.com/favicon.ico" className="w-4 h-4 grayscale brightness-200" alt="Google" />
                Continue with Google
              </button>
              <p className="text-center text-xs text-black ">
                Don't have an account? <button onClick={() => { setMode('signup'); setError(''); }} className="text-blue-600 hover:underline">Sign up</button>
              </p>
            </div>
          ) : (
            <div className="pt-4 border-t border-slate-100 text-center">
              <p className="text-xs text-black ">
                Already have an account? <button onClick={() => { setMode('login'); setError(''); setSuccessMsg(''); }} className="text-blue-600 hover:underline">Log in</button>
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

