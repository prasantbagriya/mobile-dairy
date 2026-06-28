import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider, signOut, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, updateProfile, signInWithCredential } from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { auth, secondaryAuth } from './firebase';
import { Role, AdminConfig } from '../types';

interface AuthContextType {
  user: User | null | { uid: string; email: string; displayName: string };
  role: Role | 'farmer' | 'customer' | null;
  loading: boolean;
  accessToken: string | null;
  tenantId: string | null;
  farmerId: string | null;
  customerId: string | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  loginWithEmail: (e: string, p: string) => Promise<void>;
  signupWithEmail: (e: string, p: string) => Promise<void>;
  resetPassword: (e: string) => Promise<void>;
  connectGoogle: () => Promise<void>;
  registerFarmerLogin: (mobile: string, farmerId: string, farmerName: string) => Promise<void>;
  loginAsFarmer: (mobile: string, pin: string) => Promise<void>;
  registerCustomerLogin: (mobile: string, customerId: string, customerName: string) => Promise<void>;
  loginAsCustomer: (mobile: string, pin: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<Role | 'farmer' | 'customer' | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [farmerId, setFarmerId] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState<string | null>(null);

  useEffect(() => {
    const savedToken = localStorage.getItem('g_token');
    const savedTime = localStorage.getItem('g_token_time');
    if (savedToken && savedTime && (Date.now() - parseInt(savedTime) < 3500000)) {
      setAccessToken(savedToken);
    } else {
      localStorage.removeItem('g_token');
      localStorage.removeItem('g_token_time');
    }

    getRedirectResult(auth).then(result => {
      if (result) {
        const credential = GoogleAuthProvider.credentialFromResult(result);
        if (credential?.accessToken) {
          setAccessToken(credential.accessToken);
          localStorage.setItem('g_token', credential.accessToken);
          localStorage.setItem('g_token_time', Date.now().toString());
        }
      }
    }).catch(console.error);

    const unsubscribe = onAuthStateChanged(auth, async (u) => {

      setUser(u);
      if (u) {
        const { fetchAndSetRole } = await import('./auth-role');
        await fetchAndSetRole(u, setRole, setTenantId, setFarmerId, setCustomerId, signOut, auth, setUser, setLoading);
      } else {
        setRole(null);
        setAccessToken(null);
        setTenantId(null);
        setFarmerId(null);
        setCustomerId(null);
      }
      setLoading(false);
    });

    // Removed bypass on mount

    return unsubscribe;
  }, []);

  const login = async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        const nativeResult = await FirebaseAuthentication.signInWithGoogle();
        if (!nativeResult.credential?.idToken) throw new Error("No ID token returned from Native Google Sign In");
        const credential = GoogleAuthProvider.credential(nativeResult.credential.idToken);
        await signInWithCredential(auth, credential);
        if (nativeResult.credential?.accessToken) {
          setAccessToken(nativeResult.credential.accessToken);
          localStorage.setItem('g_token', nativeResult.credential.accessToken);
          localStorage.setItem('g_token_time', Date.now().toString());
        }
        window.location.href = '/dashboard';
      } else {
        const provider = new GoogleAuthProvider();
        try {
          const result = await signInWithPopup(auth, provider);
          const credential = GoogleAuthProvider.credentialFromResult(result);
          if (credential?.accessToken) {
            setAccessToken(credential.accessToken);
            localStorage.setItem('g_token', credential.accessToken);
            localStorage.setItem('g_token_time', Date.now().toString());
          }
          window.location.href = '/dashboard';
        } catch (popupErr: any) {
          if (popupErr.code === 'auth/cancelled-popup-request' || popupErr.code === 'auth/popup-blocked') {
            await signInWithRedirect(auth, provider);
          } else {
            throw popupErr;
          }
        }
      }
    } catch (err: any) {
      console.error("Full Google Login Error:", err);
      if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') {
        alert(`Google Login Failed:\nCode: ${err.code || 'UNKNOWN'}\nMessage: ${err.message || err}`);
      }
    }
  };

  const connectGoogle = async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        const nativeResult = await FirebaseAuthentication.signInWithGoogle({
          scopes: ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/contacts']
        } as any);
        if (!nativeResult.credential?.idToken) throw new Error("No ID token returned from Native Google Sign In");
        const credential = GoogleAuthProvider.credential(nativeResult.credential.idToken);
        await signInWithCredential(auth, credential);
        if (nativeResult.credential?.accessToken) {
          setAccessToken(nativeResult.credential.accessToken);
          localStorage.setItem('g_token', nativeResult.credential.accessToken);
          localStorage.setItem('g_token_time', Date.now().toString());
        }
      } else {
        const provider = new GoogleAuthProvider();
        provider.addScope('https://www.googleapis.com/auth/spreadsheets');
        provider.addScope('https://www.googleapis.com/auth/contacts');
        // prompt consent removed to avoid repeated permission requests
        try {
          const result = await signInWithPopup(auth, provider);
          const credential = GoogleAuthProvider.credentialFromResult(result);
          if (credential?.accessToken) {
            setAccessToken(credential.accessToken);
            localStorage.setItem('g_token', credential.accessToken);
            localStorage.setItem('g_token_time', Date.now().toString());
          }
        } catch (popupErr: any) {
          if (popupErr.code === 'auth/cancelled-popup-request' || popupErr.code === 'auth/popup-blocked') {
            await signInWithRedirect(auth, provider);
          } else {
            throw popupErr;
          }
        }
      }
    } catch (e: any) {
      console.error("Error connecting to Google:", e);
      if (e.code !== 'auth/popup-closed-by-user' && e.code !== 'auth/cancelled-popup-request') {
        alert("Google Connection Failed:\n" + (e.message || e));
      }
    }
  };

  const logout = async () => {
    localStorage.removeItem('bypass_admin');
    await signOut(auth);
    setUser(null);
    setRole(null);
    setTenantId(null);
    setFarmerId(null);
    setCustomerId(null);
    window.location.href = '/';
  };

  const loginWithEmail = async (e: string, p: string) => {
    await signInWithEmailAndPassword(auth, e, p);
  };

  const signupWithEmail = async (e: string, p: string) => {
    await createUserWithEmailAndPassword(auth, e, p);
  };

  const resetPassword = async (e: string) => {
    await sendPasswordResetEmail(auth, e);
  };

  const registerFarmerLogin = async (mobile: string, farmerRecordId: string, farmerName: string) => {
    if (!tenantId) return;
    const pin = mobile.substring(0, 4);
    const firebasePassword = pin + "MM2024";
    const email = `${mobile}@milkmaster.local`;

    try {
      // Create user silently using secondary auth
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, firebasePassword);

      // Add admin_configs record to grant farmer access
      const { doc, setDoc } = await import('firebase/firestore');
      const { db } = await import('./db');
      await setDoc(doc(db, 'admin_configs', userCredential.user.uid), {
        email: email,
        role: 'farmer',
        tenantId: tenantId,
        farmerId: farmerRecordId,
        displayName: farmerName,
        createdAt: new Date().toISOString()
      });
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        // Farmer auth already exists, update config just in case
        // Note: we don't have the UID easily if they already exist, 
        // but typically they are created exactly once during registration.
        console.log("Farmer login already registered for this mobile.");
      } else {
        console.error("Failed to register farmer login:", err);
      }
    }
  };

  const loginAsFarmer = async (mobile: string, pin: string) => {
    const email = `${mobile}@milkmaster.local`;
    const firebasePassword = pin + "MM2024";
    await signInWithEmailAndPassword(auth, email, firebasePassword);
  };

  const registerCustomerLogin = async (mobile: string, customerRecordId: string, customerName: string) => {
    if (!tenantId) return;
    const pin = mobile.substring(0, 4);
    const firebasePassword = pin + "MM2024";
    const email = `c_${mobile}@milkmaster.local`; // prefix to avoid conflict with farmer

    try {
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, firebasePassword);

      const { doc, setDoc } = await import('firebase/firestore');
      const { db } = await import('./db');
      await setDoc(doc(db, 'admin_configs', userCredential.user.uid), {
        email: email,
        role: 'customer',
        tenantId: tenantId,
        customerId: customerRecordId,
        displayName: customerName,
        createdAt: new Date().toISOString()
      });
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        console.log("Customer login already registered for this mobile.");
      } else {
        console.error("Failed to register customer login:", err);
      }
    }
  };

  const loginAsCustomer = async (mobile: string, pin: string) => {
    const email = `c_${mobile}@milkmaster.local`;
    const firebasePassword = pin + "MM2024";
    await signInWithEmailAndPassword(auth, email, firebasePassword);
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, accessToken, tenantId, farmerId, customerId, login, logout, loginWithEmail, signupWithEmail, resetPassword, connectGoogle, registerFarmerLogin, loginAsFarmer, registerCustomerLogin, loginAsCustomer }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
