import { getFirestore, enableMultiTabIndexedDbPersistence } from 'firebase/firestore';
import { app } from './firebase';

export const db = getFirestore(app);

enableMultiTabIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.warn("Multiple tabs open, persistence can only be enabled in one tab at a time.");
  } else if (err.code === 'unimplemented') {
    console.warn("The current browser does not support all of the features required to enable persistence");
  }
});
