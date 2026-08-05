import { initializeApp, type FirebaseApp } from 'firebase/app'
import {
  getAuth,
  GoogleAuthProvider,
  signInWithCredential,
  signOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

let app: FirebaseApp | null = null

export function isCloudSyncConfigured(): boolean {
  return Boolean(
    import.meta.env.VITE_FIREBASE_API_KEY?.trim() &&
      import.meta.env.VITE_FIREBASE_PROJECT_ID?.trim(),
  )
}

function getFirebaseApp(): FirebaseApp {
  if (!app) {
    app = initializeApp({
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
    })
  }
  return app
}

export function getFirebaseAuth() {
  return getAuth(getFirebaseApp())
}

export function getFirestoreDb() {
  return getFirestore(getFirebaseApp())
}

/** Google Identity Services JWT → Firebase Auth (클라우드 동기화용) */
export async function linkGoogleCredential(googleIdToken: string): Promise<User> {
  const credential = GoogleAuthProvider.credential(googleIdToken)
  const result = await signInWithCredential(getFirebaseAuth(), credential)
  return result.user
}

export async function signOutFirebase(): Promise<void> {
  if (!isCloudSyncConfigured()) return
  await signOut(getFirebaseAuth())
}

export function watchFirebaseUser(
  callback: (user: User | null) => void,
): () => void {
  if (!isCloudSyncConfigured()) {
    callback(null)
    return () => {}
  }
  return onAuthStateChanged(getFirebaseAuth(), callback)
}

export async function waitForFirebaseUser(): Promise<User | null> {
  if (!isCloudSyncConfigured()) return null
  const auth = getFirebaseAuth()
  if (auth.currentUser) return auth.currentUser
  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, (user) => {
      unsub()
      resolve(user)
    })
  })
}
