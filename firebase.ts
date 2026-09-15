import { FirebaseApp, initializeApp } from 'firebase/app';
import { Auth, getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { Firestore, getFirestore, doc, getDocFromServer } from 'firebase/firestore';
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    firestoreDatabaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID,
};

export const isFirebaseConfigured = Boolean(
    firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.appId
);
export const isLocalPreviewMode = import.meta.env.DEV && !isFirebaseConfigured;

export let app: FirebaseApp | null = null;
export let db: Firestore | null = null;
export let auth: Auth | null = null;
export let googleProvider: GoogleAuthProvider | null = null;

if (isFirebaseConfigured) {
    app = initializeApp(firebaseConfig);
    db = firebaseConfig.firestoreDatabaseId
        ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
        : getFirestore(app);
    auth = getAuth(app);
    googleProvider = new GoogleAuthProvider();
}

export const loginWithGoogle = async () => {
    if (!auth || !googleProvider) {
        throw new Error('Firebase nie jest skonfigurowany w tym środowisku.');
    }
    try {
        await signInWithPopup(auth, googleProvider);
    } catch (error) {
        console.error("Login failed:", error);
        throw error;
    }
};

export const logout = async () => {
    if (!auth) return;
    try {
        await signOut(auth);
    } catch (error) {
        console.error("Logout failed:", error);
    }
};

export async function testConnection() {
  if (!db) return;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error: any) {
    if (error?.message?.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
