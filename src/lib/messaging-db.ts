import { doc, setDoc } from 'firebase/firestore';
import { db } from './db';

export async function saveMessagingToken(uid: string, token: string) {
  await setDoc(doc(db, 'user_tokens', uid), {
    token,
    updatedAt: new Date().toISOString()
  }, { merge: true });
}
