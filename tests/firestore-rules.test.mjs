import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { before, after, beforeEach, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

// Run with the Firestore emulator, never a production project. Ordinary unit
// tests skip this suite. See HOSTING.md for the separate emulator command.
const emulatorEnabled = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
describe('Firestore rules (real local emulator)', { skip: !emulatorEnabled }, () => {
  let env, api, assertSucceeds, assertFails;
  const alice = 'rules-alice';
  const bob = 'rules-bob';
  const prices = { kyoto: 3200, tokyo: 3800, bali: 2800, 'ha-long-bay': 4500, 'hoi-an': 1800, bangkok: 2500, phuket: 3500, seoul: 3000, singapore: 4000, 'siem-reap': 3700, kathmandu: 2200, taipei: 2500 };

  before(async () => {
    const dependencyRoot = process.env.VACASIA_FIREBASE_TEST_ROOT || resolve(fileURLToPath(new URL('..', import.meta.url)));
    const require = createRequire(resolve(dependencyRoot, 'package.json'));
    const rulesTesting = require('@firebase/rules-unit-testing');
    api = require('firebase/firestore');
    api.setLogLevel('silent');
    ({ assertSucceeds, assertFails } = rulesTesting);
    const [host, port] = process.env.FIRESTORE_EMULATOR_HOST.split(':');
    assert.ok(['localhost', '127.0.0.1', '::1'].includes(host), 'Rules tests must use a local emulator host.');
    env = await rulesTesting.initializeTestEnvironment({
      projectId: 'demo-vacasia-rules',
      firestore: { host, port: Number(port), rules: await readFile(new URL('../firestore.rules', import.meta.url), 'utf8') }
    });
  });
  after(async () => { await env?.cleanup(); });
  beforeEach(async () => { await env.clearFirestore(); });

  function db(uid = alice, provider = 'password') {
    return env.authenticatedContext(uid, { email: `${uid}@example.com`, firebase: { sign_in_provider: provider } }).firestore();
  }
  function profile(uid = alice, changes = {}) {
    return { name: 'Asia Traveler', email: `${uid}@example.com`, favorites: [], preferences: null, createdAt: api.serverTimestamp(), updatedAt: api.serverTimestamp(), ...changes };
  }
  const profileRef = (store, uid = alice) => api.doc(store, 'vacasiaProfiles', uid);
  const bookingRef = (store, uid = alice, id = 'VA-0123456789AB') => api.doc(store, 'vacasiaProfiles', uid, 'bookings', id);
  const todayISO = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  function booking(changes = {}) {
    const date = todayISO();
    return { destinationId: 'kyoto', date, visitAt: api.Timestamp.fromDate(new Date(`${date}T00:00:00Z`)), adults: 2, children: 1, totalCents: 8320, status: 'demo-confirmed', createdAt: api.serverTimestamp(), notes: '', ...changes };
  }
  async function seedProfile(store = db(), uid = alice) {
    await assertSucceeds(api.setDoc(profileRef(store, uid), profile(uid)));
    return store;
  }

  it('compiles rules and allows email account profiles with server timestamps', async () => {
    const store = await seedProfile();
    const snapshot = await assertSucceeds(api.getDoc(profileRef(store)));
    assert.equal(snapshot.data().email, `${alice}@example.com`);
    assert.ok(snapshot.data().createdAt instanceof api.Timestamp);
  });

  it('allows Google provider profiles and normal profile updates', async () => {
    const store = await seedProfile(db(alice, 'google.com'));
    await assertSucceeds(api.updateDoc(profileRef(store), { name: 'Google Traveler', updatedAt: api.serverTimestamp() }));
    assert.equal((await api.getDoc(profileRef(store))).data().name, 'Google Traveler');
  });

  it('denies unauthenticated reads and writes', async () => {
    await seedProfile();
    const store = env.unauthenticatedContext().firestore();
    await assertFails(api.getDoc(profileRef(store)));
    await assertFails(api.setDoc(profileRef(store, bob), profile(bob)));
    await assertFails(api.getDocs(api.collection(store, 'vacasiaProfiles', alice, 'bookings')));
  });

  it('isolates profiles and prevents collection-wide profile listing', async () => {
    await seedProfile();
    const other = db(bob);
    await assertFails(api.getDoc(profileRef(other)));
    await assertFails(api.setDoc(profileRef(other), profile()));
    await assertFails(api.updateDoc(profileRef(other), { name: 'Intruder', updatedAt: api.serverTimestamp() }));
    await assertFails(api.getDocs(api.collection(db(), 'vacasiaProfiles')));
  });

  it('allows valid favorites, including every catalog destination', async () => {
    const store = await seedProfile();
    await assertSucceeds(api.updateDoc(profileRef(store), { favorites: Object.keys(prices), updatedAt: api.serverTimestamp() }));
  });

  it('rejects unknown, duplicate, malformed and oversized favorites', async () => {
    const store = await seedProfile();
    for (const favorites of [['unknown'], ['kyoto', 'kyoto'], 'kyoto', [...Object.keys(prices), 'kyoto']]) {
      await assertFails(api.updateDoc(profileRef(store), { favorites, updatedAt: api.serverTimestamp() }));
    }
  });

  it('allows valid travel preferences and clearing preferences', async () => {
    const store = await seedProfile();
    await assertSucceeds(api.updateDoc(profileRef(store), { preferences: { budget: 123.45, days: 7, group: 'family', month: 12, interests: ['culture', 'food'] }, updatedAt: api.serverTimestamp() }));
    await assertSucceeds(api.updateDoc(profileRef(store), { preferences: null, updatedAt: api.serverTimestamp() }));
  });

  it('rejects invalid preferences and extra preference fields', async () => {
    const store = await seedProfile();
    const valid = { budget: 80, days: 3, group: 'solo', month: 1, interests: ['food'] };
    for (const preferences of [{ ...valid, budget: 19 }, { ...valid, days: 1.5 }, { ...valid, month: 13 }, { ...valid, group: 'team' }, { ...valid, interests: ['food', 'food'] }, { ...valid, interests: ['unknown'] }, { ...valid, isAdmin: true }]) {
      await assertFails(api.updateDoc(profileRef(store), { preferences, updatedAt: api.serverTimestamp() }));
    }
  });

  it('protects profile email, creation timestamp, required fields and schema', async () => {
    const store = await seedProfile();
    for (const changes of [{ email: `${bob}@example.com` }, { createdAt: api.Timestamp.fromMillis(0) }, { favorites: api.deleteField() }, { admin: true }, { name: 'A\u0000B' }, { name: 'x' }]) {
      await assertFails(api.updateDoc(profileRef(store), { ...changes, updatedAt: api.serverTimestamp() }));
    }
    await assertFails(api.deleteDoc(profileRef(store)));
  });

  it('requires profile email to match the authenticated token', async () => {
    await assertFails(api.setDoc(profileRef(db()), profile(alice, { email: `${bob}@example.com` })));
  });

  it('allows demo reservations for every destination with trusted adult and child totals', async () => {
    const store = db();
    let counter = 0;
    for (const [destinationId, price] of Object.entries(prices)) {
      const id = `VA-${(++counter).toString(16).padStart(12, '0').toUpperCase()}`;
      await assertSucceeds(api.setDoc(bookingRef(store, alice, id), booking({ destinationId, totalCents: price * 2 + Math.round(price * 0.6) })));
    }
    const snapshots = await assertSucceeds(api.getDocs(api.collection(store, 'vacasiaProfiles', alice, 'bookings')));
    assert.equal(snapshots.size, Object.keys(prices).length);
  });

  it('isolates reservation reads, lists, creates and cancellation', async () => {
    await assertSucceeds(api.setDoc(bookingRef(db()), booking()));
    const other = db(bob);
    await assertFails(api.getDoc(bookingRef(other)));
    await assertFails(api.getDocs(api.collection(other, 'vacasiaProfiles', alice, 'bookings')));
    await assertFails(api.setDoc(bookingRef(other, alice, 'VA-111111111111'), booking()));
    await assertFails(api.updateDoc(bookingRef(other), { status: 'cancelled' }));
  });

  it('rejects altered totals, invalid quantities, states, ids and additional fields', async () => {
    const store = db();
    for (const changes of [{ totalCents: 1 }, { adults: 0 }, { adults: 1.5 }, { adults: 12, children: 12 }, { children: -1 }, { destinationId: 'unknown' }, { status: 'paid' }, { notes: 'x'.repeat(501) }, { uid: bob }, { createdAt: api.Timestamp.fromMillis(0) }]) {
      await assertFails(api.setDoc(bookingRef(store), booking(changes)));
    }
    await assertFails(api.setDoc(bookingRef(store, alice, 'custom-booking-id'), booking()));
  });

  it('rejects past, over-horizon, non-midnight and mismatched visit dates', async () => {
    const store = db();
    const past = new Date(`${todayISO()}T00:00:00Z`);
    past.setUTCDate(past.getUTCDate() - 1);
    const future = new Date(`${todayISO()}T00:00:00Z`);
    future.setUTCFullYear(future.getUTCFullYear() + 2);
    future.setUTCDate(future.getUTCDate() + 1);
    for (const date of [past.toISOString().slice(0, 10), future.toISOString().slice(0, 10)]) {
      await assertFails(api.setDoc(bookingRef(store), booking({ date, visitAt: api.Timestamp.fromDate(new Date(`${date}T00:00:00Z`)) })));
    }
    await assertFails(api.setDoc(bookingRef(store), booking({ date: '2026-02-31' })));
    await assertFails(api.setDoc(bookingRef(store), booking({ visitAt: api.Timestamp.fromDate(new Date(`${todayISO()}T12:00:00Z`)) })));
  });

  it('allows exactly the two-year horizon date', async () => {
    const store = db();
    const horizon = new Date(`${todayISO()}T00:00:00Z`);
    horizon.setUTCFullYear(horizon.getUTCFullYear() + 2);
    const date = horizon.toISOString().slice(0, 10);
    await assertSucceeds(api.setDoc(bookingRef(store), booking({ date, visitAt: api.Timestamp.fromDate(horizon) })));
  });

  it('permits cancellation only, while preserving all reservation details', async () => {
    const store = db();
    await assertSucceeds(api.setDoc(bookingRef(store), booking()));
    await assertFails(api.updateDoc(bookingRef(store), { status: 'cancelled', totalCents: 0 }));
    await assertFails(api.updateDoc(bookingRef(store), { status: 'cancelled', notes: 'Changed' }));
    await assertSucceeds(api.updateDoc(bookingRef(store), { status: 'cancelled' }));
    assert.equal((await api.getDoc(bookingRef(store))).data().status, 'cancelled');
    await assertFails(api.updateDoc(bookingRef(store), { status: 'demo-confirmed' }));
    await assertFails(api.deleteDoc(bookingRef(store)));
  });

  it('denies all unspecified collections, including the former users namespace', async () => {
    const store = db();
    await assertFails(api.setDoc(api.doc(store, 'users', alice), { name: 'Traveler' }));
    await assertFails(api.getDoc(api.doc(store, 'users', alice)));
    await assertFails(api.setDoc(api.doc(store, 'public', 'test'), { value: true }));
  });
});
