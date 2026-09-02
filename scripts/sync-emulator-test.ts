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

function stripReceipts(store: {
  projects: Array<{ expenses: Array<{ receiptDataUrl?: string; receiptFileName?: string }> }>
}) {
  return {
    ...store,
    projects: store.projects.map((p) => ({
      ...p,
      expenses: p.expenses.map((e) =>
        e.receiptDataUrl
          ? { ...e, receiptDataUrl: '', receiptFileName: e.receiptFileName ?? '' }
          : e,
      ),
    })),
  }
}

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
    version: 3,
    activeProjectId: 'p1',
    projects: [
      {
        id: 'p1',
        name: '에뮬 프로젝트',
        expenses: [
          {
            id: 'e1',
            title: '점심',
            amount: 12000,
            receiptDataUrl: 'data:image/jpeg;base64,' + 'X'.repeat(950_000),
            receiptFileName: 'big.jpg',
          },
        ],
      },
    ],
  }

  assert.ok(JSON.stringify(store).length > 900_000)
  const stripped = stripReceipts(store)
  assert.equal(stripped.projects[0].expenses[0].receiptDataUrl, '')
  assert.ok(JSON.stringify(stripped).length < 20_000)

  const updatedAt = Date.now()
  console.log('writing…')
  await Promise.race([
    setDoc(doc(db, 'users', uid, 'data', 'store'), {
      version: 3,
      projects: stripped.projects,
      activeProjectId: stripped.activeProjectId,
      updatedAt,
      updatedAtServer: serverTimestamp(),
    }),
    new Promise((_, rej) => setTimeout(() => rej(new Error('write timeout')), 10000)),
  ])

  const snap = await getDoc(doc(db, 'users', uid, 'data', 'store'))
  assert.equal(snap.exists(), true)
  const data = snap.data()!
  assert.equal(data.projects[0].name, '에뮬 프로젝트')
  assert.equal(data.projects[0].expenses[0].receiptDataUrl, '')
  assert.equal(data.updatedAt, updatedAt)

  console.log('sync-emulator-test: ok', { uid, updatedAt })
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
