import { initializeApp, type FirebaseApp } from 'firebase/app'
import {
  getAuth,
  GoogleAuthProvider,
  signInWithCredential,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  connectAuthEmulator,
  type User,
} from 'firebase/auth'
import {
  initializeFirestore,
  connectFirestoreEmulator,
  type Firestore,
} from 'firebase/firestore'

let app: FirebaseApp | null = null
let db: Firestore | null = null
let persistenceReady: Promise<void> | null = null
let emulatorsConnected = false

function shouldUseEmulators(): boolean {
  return import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true'
}

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

function connectEmulatorsIfNeeded() {
  if (emulatorsConnected || !shouldUseEmulators()) return
  const auth = getAuth(getFirebaseApp())
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  const firestore = initializeFirestore(getFirebaseApp(), {
    experimentalAutoDetectLongPolling: true,
  })
  connectFirestoreEmulator(firestore, '127.0.0.1', 8080)
  db = firestore
  emulatorsConnected = true
}

export function getFirebaseAuth() {
  connectEmulatorsIfNeeded()
  const auth = getAuth(getFirebaseApp())
  // IndexedDB 로컬 지속성 — 새로고침/Electron 재시작 후에도 Firebase 세션 유지
  if (!persistenceReady) {
    persistenceReady = setPersistence(auth, browserLocalPersistence).catch(() => {
      /* 일부 환경(file:// 등)에서 실패할 수 있음 — 기본값으로 계속 */
    })
  }
  return auth
}

export function getFirestoreDb() {
  connectEmulatorsIfNeeded()
  if (!db) {
    // 모바일/셀룰러 네트워크나 일부 프록시 환경에서 Firestore 기본 WebChannel
    // 스트리밍이 막혀 동기화(onSnapshot/getDoc)가 멈추는 문제를 방지하기 위해
    // 롱폴링 자동 감지를 활성화한다.
    db = initializeFirestore(getFirebaseApp(), {
      experimentalAutoDetectLongPolling: true,
    })
  }
  return db
}

/** Google Identity Services JWT → Firebase Auth (클라우드 동기화용) */
export async function linkGoogleCredential(googleIdToken: string): Promise<User> {
  const auth = getFirebaseAuth()
  await persistenceReady
  const credential = GoogleAuthProvider.credential(googleIdToken)
  const result = await signInWithCredential(auth, credential)
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
