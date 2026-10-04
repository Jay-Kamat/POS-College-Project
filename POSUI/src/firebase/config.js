import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDummyKeyForLocalDevAndTesting123456",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "pos-billing-prod.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "pos-billing-prod",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "pos-billing-prod.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "102938475610",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:102938475610:web:abcdef123456"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
