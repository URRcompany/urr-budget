/**
 * Firebase Emulator 통합 테스트 (Auth + Firestore) — 앱 모듈 비의존.
 */
import assert from 'node:assert/strict'
import { initializeApp } from 'firebase/app'
import { connectAuthEmulator, getAuth, signInAnonymously } from 'firebase/auth'
import {
  connectFirestoreEmulator,
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore'

async function main() {
  const app = initializeApp({
    apiKey: 'fake-api-key',
    authDomain: 'localhost',
    projectId: 'demo-urr-reelbudget',
  })
  const auth = getAuth(app)
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  const db = getFirestore(app)
  connectFirestoreEmulator(db, '127.0.0.1', 8080)

  console.log('signing in…')
  const cred = await Promise.race([
    signInAnonymously(auth),
    new Promise((_, rej) => setTimeout(() => rej(new Error('auth timeout')), 10000)),
  ]) as Awaited<ReturnType<typeof signInAnonymously>>
  const uid = cred.user.uid
  console.log('uid', uid)

  const store = {
    version: 4,
    activeProjectId: 'p1',
    projects: [
      {
        id: 'p1',
        name: '에뮬 프로젝트',
        client: '',
        date: '2026-10-01',
        createdAt: new Date().toISOString(),
        entries: [
          { id: 'e1', kind: 'income', title: '계약금', amount: 1_000_000, date: '2026-10-01' },
          { id: 'e2', kind: 'labor', title: '김촬영', amount: 300_000, date: '2026-10-02' },
        ],
      },
    ],
  }

  const updatedAt = Date.now()
  const ref = doc(db, 'users', uid, 'data', 'storeV4')
  console.log('writing…')
  await Promise.race([
    setDoc(ref, { ...store, updatedAt, updatedAtServer: serverTimestamp() }),
    new Promise((_, rej) => setTimeout(() => rej(new Error('write timeout')), 10000)),
  ])

  const snap = await getDoc(ref)
  assert.equal(snap.exists(), true)
  const data = snap.data()!
  assert.equal(data.version, 4)
  assert.equal(data.projects[0].name, '에뮬 프로젝트')
  assert.equal(data.projects[0].entries.length, 2)
  assert.equal(data.updatedAt, updatedAt)

  console.log('sync-emulator-test: ok', { uid, updatedAt })
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
