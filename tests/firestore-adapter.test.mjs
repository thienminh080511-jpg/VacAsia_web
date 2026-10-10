import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { before, after, beforeEach, afterEach, describe, it } from 'node:test';
import { createFirebaseApi } from '../server/firebaseAdapter.js';

const enabled = Boolean(process.env.FIRESTORE_EMULATOR_HOST && process.env.FIREBASE_AUTH_EMULATOR_HOST);
describe('Firebase adapter (real local Auth and Firestore emulators)', { skip: !enabled }, () => {
  const projectId = 'demo-vacasia-rules';
  let appSdk, authSdk, store, env;
  const apps = [];
  before(async () => {
    const dependencyRoot = process.env.VACASIA_FIREBASE_TEST_ROOT || fileURLToPath(new URL('..', import.meta.url));
    const require = createRequire(resolve(dependencyRoot, 'package.json'));
    appSdk = require('firebase/app');
    authSdk = require('firebase/auth');
    store = require('firebase/firestore');
    store.setLogLevel('silent');
    const rulesTesting = require('@firebase/rules-unit-testing');
    for (const endpoint of [process.env.FIRESTORE_EMULATOR_HOST, process.env.FIREBASE_AUTH_EMULATOR_HOST]) {
      assert.ok(['localhost', '127.0.0.1'].includes(endpoint.split(':')[0]), 'Integration tests must use local emulators.');
    }
    const [host, port] = process.env.FIRESTORE_EMULATOR_HOST.split(':');
    env = await rulesTesting.initializeTestEnvironment({ projectId, firestore: { host, port: Number(port) } });
  });
  beforeEach(async () => {
    await env.clearFirestore();
    const response = await fetch(`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/emulator/v1/projects/${projectId}/accounts`, { method: 'DELETE' });
    assert.ok(response.ok, 'Local Auth emulator reset succeeds.');
  });
  afterEach(async () => {
    for (const rt of apps.splice(0)) {
      await authSdk.signOut(rt.auth);
      await store.terminate(rt.db);
      await appSdk.deleteApp(rt.app);
    }
  });
  after(async () => { await env?.cleanup(); });

  function runtime(name = `vacasia-${Date.now()}-${Math.random()}`) {
    const app = appSdk.initializeApp({ projectId, apiKey: 'demo-api-key', authDomain: 'localhost' }, name);
    const auth = authSdk.initializeAuth(app, { persistence: authSdk.inMemoryPersistence });
    authSdk.connectAuthEmulator(auth, `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}`, { disableWarnings: true });
    const db = store.getFirestore(app);
    const [host, port] = process.env.FIRESTORE_EMULATOR_HOST.split(':');
    store.connectFirestoreEmulator(db, host, Number(port));
    const rt = { app, auth, db, store, authSdk: { ...authSdk, getRedirectResult: async () => null } };
    apps.push(rt);
    return rt;
  }
  const todayISO = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

  it('registers an email account and persists favorites, preferences, reservations and cancellation through the adapter', async () => {
    const rt = runtime();
    const api = createFirebaseApi(() => rt);
    const registered = await api('/api/register', { name: 'Email Traveler', email: 'email-traveler@example.com', password: 'Example-password-42' });
    assert.equal(registered.cloudReady, true);
    assert.equal(registered.user.name, 'Email Traveler');
    assert.equal(registered.syncWarning, undefined);
    const uid = registered.user.id;
    const ref = store.doc(rt.db, 'vacasiaProfiles', uid);
    const initial = (await store.getDocFromServer(ref)).data();
    assert.equal(initial.email, 'email-traveler@example.com');
    assert.ok(initial.createdAt instanceof store.Timestamp);

    assert.deepEqual((await api('/api/favorites', { destinationId: 'bali', saved: true }, 'PUT')).favorites, ['bali']);
    const preferences = { budget: 150, days: 5, group: 'couple', month: 4, interests: ['beach', 'food'] };
    assert.deepEqual((await api('/api/preferences', preferences, 'PUT')).preferences, preferences);
    const reserved = await api('/api/bookings', { destinationId: 'bali', date: todayISO(), adults: 2, children: 1, notes: 'Window seat if possible.' });
    assert.equal(reserved.booking.total, 72.8);
    assert.equal(reserved.booking.status, 'demo-confirmed');
    assert.equal(reserved.bookings.length, 1);
    const cancelled = await api(`/api/bookings/${reserved.booking.id}`, undefined, 'DELETE');
    assert.equal(cancelled.bookings[0].status, 'cancelled');
    // Repeating cancellation is idempotent at the adapter layer.
    assert.equal((await api(`/api/bookings/${reserved.booking.id}`, undefined, 'DELETE')).bookings[0].status, 'cancelled');
    await api('/api/logout');
    assert.equal(rt.auth.currentUser, null);
    const returned = await api('/api/login', { email: 'email-traveler@example.com', password: 'Example-password-42' });
    assert.equal(returned.cloudReady, true);
    assert.deepEqual(returned.favorites, ['bali']);
    assert.deepEqual(returned.preferences, preferences);
    assert.equal(returned.bookings[0].status, 'cancelled');
    assert.equal((await store.getDocFromServer(ref)).data().createdAt.toMillis(), initial.createdAt.toMillis());
  });

  it('creates a Google-provider profile and retains cloud data on repeated Google sign-in', async () => {
    const rt = runtime();
    // Firebase documents literal JSON credentials for local emulator IDP tests.
    // The SDK exchanges this test-only credential with the actual Auth emulator.
    const credential = authSdk.GoogleAuthProvider.credential(JSON.stringify({ sub: 'vacasia-google-traveler', email: 'google-traveler@example.com', email_verified: true, name: 'Google Traveler' }));
    rt.authSdk.signInWithPopup = (auth) => authSdk.signInWithCredential(auth, credential);
    const api = createFirebaseApi(() => rt, () => 'http://localhost');
    const signedIn = await api('/api/google', { language: 'en' });
    assert.equal(signedIn.cloudReady, true);
    assert.equal(signedIn.user.email, 'google-traveler@example.com');
    assert.equal(rt.auth.currentUser.providerData[0].providerId, 'google.com');
    await api('/api/favorites', { destinationId: 'kyoto', saved: true }, 'PUT');
    await api('/api/profile', { name: 'Returning Traveler' });
    const ref = store.doc(rt.db, 'vacasiaProfiles', signedIn.user.id);
    const createdAt = (await store.getDocFromServer(ref)).data().createdAt.toMillis();
    await api('/api/logout');
    const returned = await api('/api/google', { language: 'vi' });
    assert.equal(returned.cloudReady, true);
    assert.equal(returned.user.name, 'Returning Traveler');
    assert.deepEqual(returned.favorites, ['kyoto']);
    assert.equal(rt.auth.languageCode, 'vi');
    assert.equal((await store.getDocFromServer(ref)).data().createdAt.toMillis(), createdAt);
  });

  it('repairs a missing profile after an earlier Auth-only signup and keeps accounts isolated', async () => {
    const rt = runtime();
    const result = await authSdk.createUserWithEmailAndPassword(rt.auth, 'repair@example.com', 'Example-password-42');
    await authSdk.updateProfile(result.user, { displayName: 'Recovered Traveler' });
    const api = createFirebaseApi(() => rt);
    const recovered = await api('/api/session', undefined, 'GET');
    assert.equal(recovered.cloudReady, true);
    assert.equal(recovered.user.name, 'Recovered Traveler');
    const other = runtime();
    await authSdk.createUserWithEmailAndPassword(other.auth, 'other@example.com', 'Example-password-42');
    await assert.rejects(store.getDocFromServer(store.doc(other.db, 'vacasiaProfiles', result.user.uid)), { code: 'permission-denied' });
    await assert.rejects(store.updateDoc(store.doc(other.db, 'vacasiaProfiles', result.user.uid), { favorites: ['tokyo'], updatedAt: store.serverTimestamp() }), { code: 'permission-denied' });
  });
});
