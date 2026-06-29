import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from './db';
import { Role } from '../types';

export async function fetchAndSetRole(
  u: any, 
  setRole: (r: any) => void, 
  setTenantId: (t: any) => void, 
  setFarmerId: (f: any) => void, 
  setCustomerId: (c: any) => void,
  signOut: any,
  auth: any,
  setUser: any,
  setLoading: any
) {
  try {
    const docRef = doc(db, 'admin_configs', u.uid);
    let docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data() as any;
      const isSuperAdmin = u.email?.toLowerCase().trim() === 'prashantbagriya7877@gmail.com';
      if (isSuperAdmin && data.role !== 'admin') {
        await setDoc(docRef, { ...data, role: 'admin' });
        setRole('admin');
      } else {
        setRole(data.role);
      }
      setTenantId(data.tenantId || u.uid);
      if (data.role === 'farmer') {
        setFarmerId(data.farmerId);
      } else if (data.role === 'customer') {
        setCustomerId(data.customerId);
      }
    } else {
      const emailId = u.email ? u.email.trim().toLowerCase() : '';
      const emailRef = doc(db, 'admin_configs', emailId);
      const emailSnap = await getDoc(emailRef);

      if (emailSnap.exists()) {
        const preRegData = emailSnap.data();
        await setDoc(docRef, {
          email: u.email!,
          role: preRegData.role,
          displayName: u.displayName || preRegData.displayName || '',
          createdAt: preRegData.createdAt || new Date().toISOString(),
          linkedAt: new Date().toISOString(),
          tenantId: preRegData.tenantId || u.uid
        });
        await deleteDoc(emailRef);
        setRole(preRegData.role);
        setTenantId(preRegData.tenantId || u.uid);
      } else {
        if (u.email && u.email.endsWith('@milkmaster.local')) {
          await signOut(auth);
          setRole(null);
          setUser(null);
          setLoading(false);
          return;
        }

        const newAdmin = {
          email: u.email || 'unknown',
          role: 'admin' as Role,
          displayName: u.displayName || 'Dairy Owner',
          createdAt: new Date().toISOString(),
          tenantId: u.uid
        };
        await setDoc(docRef, newAdmin);
        setRole('admin');
        setTenantId(u.uid);
      }
    }
  } catch (e: any) {
    console.error("Auth error:", e);
    if (u.email && u.email.endsWith('@milkmaster.local')) {
      alert("Error loading profile: " + e.message + "\n\n(If it says Permission Denied, please make sure the rules were published correctly in Firebase Console!)");
    }
    setRole('operator'); 
    setTenantId(u.uid);
  }
}
