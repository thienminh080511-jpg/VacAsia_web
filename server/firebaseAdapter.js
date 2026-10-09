import { siteConfig } from './siteConfig.js';
import { destinations } from './data.js';

// Loaded only if the site selects Firebase; the local Node service stays independent.
const SDK = 'https://www.gstatic.com/firebasejs/9.22.0/';
const INTERESTS = new Set(['culture', 'beach', 'city', 'nature', 'adventure', 'food', 'family', 'wellness']);
const GROUPS = new Set(['solo', 'couple', 'family', 'friends']);
let runtimePromise;

class AdapterError extends Error {
  constructor(code, message) { super(message); this.code = code; this.error = message; }
}
const fail = (code, message) => { throw new AdapterError(code, message); };
const emptySession = () => ({ user: null, favorites: [], bookings: [], preferences: null });
function nameValue(value) {
  const name = typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
  if (name.length < 2 || name.length > 60 || /[\x00-\x1f\x7f]/.test(name)) fail('invalid_input', 'Enter a name between 2 and 60 characters.');
  return name;
}
function emailValue(value) {
  const email = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail('invalid_input', 'Enter a valid email address.');
  return email;
}
function passwordValue(value) {
  if (typeof value !== 'string' || value.length < 8 || value.length > 128) fail('invalid_input', 'Use a password between 8 and 128 characters.');
  return value;
}
function dateValue(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) fail('invalid_date', 'Choose a valid visit date.');
  const date = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) fail('invalid_date', 'Choose a valid visit date.');
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const max = new Date(`${today}T00:00:00Z`);
  max.setUTCFullYear(max.getUTCFullYear() + 2);
  if (value < today || value > max.toISOString().slice(0, 10)) fail('invalid_date', 'Choose today or a date within the next two years.');
  return value;
}
function preferencesValue(input) {
  if (typeof input.budget !== 'number' || !Number.isFinite(input.budget) || input.budget < 20 || input.budget > 1000 || !Number.isInteger(input.days) || input.days < 1 || input.days > 30 || !GROUPS.has(input.group) || !Number.isInteger(input.month) || input.month < 1 || input.month > 12 || !Array.isArray(input.interests) || input.interests.length > 8 || input.interests.some(item => !INTERESTS.has(item))) fail('invalid_input', 'Enter a valid daily budget, trip length, group, month and interests.');
  return { budget: Math.round(input.budget * 100) / 100, days: input.days, group: input.group, month: input.month, interests: [...new Set(input.interests)] };
}
function validate(path, input, method) {
  if (input != null && (typeof input !== 'object' || Array.isArray(input))) fail('invalid_input', 'Send a request object.');
  const data = input ?? {};
  if (method === 'GET' && ['/api/session', '/api/health'].includes(path)) return data;
  if (method === 'POST' && path === '/api/register') return { name: nameValue(data.name), email: emailValue(data.email), password: passwordValue(data.password) };
  if (method === 'POST' && path === '/api/login') return { email: emailValue(data.email), password: passwordValue(data.password) };
  if (method === 'POST' && path === '/api/logout') return {};
  if (method === 'POST' && path === '/api/profile') return { name: nameValue(data.name) };
  if (method === 'PUT' && path === '/api/preferences') return preferencesValue(data);
  if (method === 'PUT' && path === '/api/favorites') {
    if (!destinations.some(item => item.id === data.destinationId)) fail('invalid_destination', 'Choose an available destination.');
    if (typeof data.saved !== 'boolean') fail('invalid_input', 'Specify whether the destination should be saved.');
    return { destinationId: data.destinationId, saved: data.saved };
  }
  if (method === 'POST' && path === '/api/bookings') {
    const destination = destinations.find(item => item.id === data.destinationId);
    if (!destination) fail('invalid_destination', 'Choose an available destination.');
    const date = dateValue(data.date);
    if (!Number.isInteger(data.adults) || data.adults < 1 || data.adults > 12 || !Number.isInteger(data.children) || data.children < 0 || data.children > 12 || data.adults + data.children > 20) fail('invalid_quantity', 'Choose 1–12 adults and 0–12 children, with at most 20 travelers.');
    if (data.notes != null && (typeof data.notes !== 'string' || data.notes.length > 500)) fail('invalid_input', 'Keep visit notes within 500 characters.');
    const cents = Math.round(destination.ticketPrice * 100);
    return { destinationId: destination.id, date, adults: data.adults, children: data.children, totalCents: cents * data.adults + Math.round(cents * 0.6) * data.children, notes: (data.notes ?? '').trim() };
  }
  if (method === 'DELETE' && /^\/api\/bookings\/[A-Za-z0-9_-]{1,100}$/.test(path)) return { id: path.split('/').pop() };
  fail('not_found', 'This API endpoint could not be found.');
}
async function runtime() {
  if (!runtimePromise) runtimePromise = (async () => {
    const [appSdk, authSdk, store] = await Promise.all([
      import(`${SDK}firebase-app.js`), import(`${SDK}firebase-auth.js`), import(`${SDK}firebase-firestore.js`)
    ]);
    const app = appSdk.getApps().find(item => item.name === 'vacasia-features') ?? appSdk.initializeApp(siteConfig.firebase, 'vacasia-features');
    const auth = authSdk.getAuth(app);
    const db = store.getFirestore(app);
    await new Promise((resolve, reject) => {
      let unsubscribe;
      unsubscribe = authSdk.onAuthStateChanged(auth, () => { unsubscribe?.(); resolve(); }, reject);
    });
    return { auth, authSdk, db, store };
  })().catch(error => { runtimePromise = undefined; throw error; });
  return runtimePromise;
}
function requireUser(rt) {
  if (!rt.auth.currentUser) fail('auth_required', 'Sign in to continue.');
  return rt.auth.currentUser;
}
function defaultName(user) {
  try { return nameValue(user.displayName || user.email?.split('@')[0]); } catch { return 'Traveler'; }
}
function profileRef(rt, uid) { return rt.store.doc(rt.db, 'vacasiaProfiles', uid); }
function bookingCollection(rt, uid) { return rt.store.collection(rt.db, 'vacasiaProfiles', uid, 'bookings'); }
function timestampISO(value) {
  if (value && typeof value.toDate === 'function') return value.toDate().toISOString();
  return typeof value === 'string' ? value : new Date(0).toISOString();
}
function bookingShape(snapshot) {
  const data = snapshot.data();
  return { id: snapshot.id, destinationId: data.destinationId, date: data.date, adults: data.adults, children: data.children, total: data.totalCents / 100, status: data.status, createdAt: timestampISO(data.createdAt), notes: data.notes ?? '' };
}
async function bookings(rt, uid) {
  const snapshots = await rt.store.getDocsFromServer(bookingCollection(rt, uid));
  return snapshots.docs.map(bookingShape).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
async function session(rt) {
  const user = rt.auth.currentUser;
  if (!user) return emptySession();
  const [snapshot, history] = await Promise.all([rt.store.getDocFromServer(profileRef(rt, user.uid)), bookings(rt, user.uid)]);
  const data = snapshot.exists() ? snapshot.data() : {};
  return { user: { id: user.uid, name: data.name ?? defaultName(user), email: user.email }, favorites: data.favorites ?? [], bookings: history, preferences: data.preferences ?? null };
}
// Transactions preserve favorites when multiple tabs update the same profile.
async function updateProfile(rt, uid, change) {
  const user = requireUser(rt);
  return rt.store.runTransaction(rt.db, async transaction => {
    const ref = profileRef(rt, uid);
    const snapshot = await transaction.get(ref);
    const profile = snapshot.exists() ? snapshot.data() : { name: defaultName(user), email: user.email, favorites: [], preferences: null, createdAt: rt.store.serverTimestamp() };
    const next = { ...profile, ...change(profile), updatedAt: rt.store.serverTimestamp() };
    transaction.set(ref, next);
    return next;
  });
}
function mapError(error) {
  if (error instanceof AdapterError) return error;
  const codes = {
    'auth/email-already-in-use': 'email_exists', 'auth/invalid-email': 'invalid_input', 'auth/weak-password': 'invalid_input',
    'auth/invalid-login-credentials': 'invalid_credentials', 'auth/invalid-credential': 'invalid_credentials', 'auth/user-not-found': 'invalid_credentials', 'auth/wrong-password': 'invalid_credentials', 'auth/user-disabled': 'invalid_credentials',
    'auth/too-many-requests': 'rate_limited', 'auth/network-request-failed': 'offline', 'unavailable': 'offline',
    'auth/operation-not-allowed': 'firebase_setup', 'auth/unauthorized-domain': 'firebase_setup', 'auth/invalid-api-key': 'firebase_setup', 'auth/configuration-not-found': 'firebase_setup',
    'permission-denied': 'firebase_setup', 'failed-precondition': 'firebase_setup'
  };
  const code = codes[error?.code] ?? (error instanceof TypeError ? 'offline' : 'server_error');
  const messages = { email_exists: 'An account already uses this email.', invalid_credentials: 'The email or password is incorrect.', invalid_input: 'Check the information and try again.', rate_limited: 'Too many attempts. Please try again later.', offline: 'Could not connect. Check your internet connection.', firebase_setup: 'Firebase must be configured for this website. See HOSTING.md.', server_error: 'The service could not complete this request. Please try again.' };
  return new AdapterError(code, messages[code]);
}

/** Same response shape as the optional local Node API, backed by Firebase Auth/Firestore. */
export async function firebaseApi(path, input, method = 'POST') {
  try {
    method = method.toUpperCase();
    const data = validate(path, input, method); // Reject malformed input before SDK/network access.
    const rt = await runtime();
    if (method === 'GET' && path === '/api/health') return { ok: true, mode: 'demo', backend: 'firebase', destinationCount: destinations.length };
    if (method === 'GET' && path === '/api/session') return await session(rt);
    if (method === 'POST' && path === '/api/register') {
      const result = await rt.authSdk.createUserWithEmailAndPassword(rt.auth, data.email, data.password);
      await rt.authSdk.updateProfile(result.user, { displayName: data.name });
      await updateProfile(rt, result.user.uid, () => ({ name: data.name }));
      return await session(rt);
    }
    if (method === 'POST' && path === '/api/login') {
      await rt.authSdk.signInWithEmailAndPassword(rt.auth, data.email, data.password);
      return await session(rt);
    }
    if (method === 'POST' && path === '/api/logout') {
      await rt.authSdk.signOut(rt.auth);
      return emptySession();
    }
    const user = requireUser(rt);
    if (method === 'POST' && path === '/api/profile') {
      const profile = await updateProfile(rt, user.uid, () => ({ name: data.name }));
      await rt.authSdk.updateProfile(user, { displayName: data.name });
      return { user: { id: user.uid, name: profile.name, email: user.email } };
    }
    if (method === 'PUT' && path === '/api/favorites') {
      const profile = await updateProfile(rt, user.uid, current => ({ favorites: [...current.favorites.filter(id => id !== data.destinationId), ...(data.saved ? [data.destinationId] : [])] }));
      return { favorites: profile.favorites };
    }
    if (method === 'PUT' && path === '/api/preferences') {
      await updateProfile(rt, user.uid, () => ({ preferences: data }));
      return { preferences: data };
    }
    if (method === 'POST' && path === '/api/bookings') {
      const random = new Uint8Array(6);
      crypto.getRandomValues(random);
      const id = `VA-${[...random].map(value => value.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
      const ref = rt.store.doc(bookingCollection(rt, user.uid), id);
      const entry = { ...data, visitAt: rt.store.Timestamp.fromDate(new Date(`${data.date}T00:00:00Z`)), status: 'demo-confirmed', createdAt: rt.store.serverTimestamp() };
      // Deployed Firestore rules verify all quantities, dates and totals independently.
      await rt.store.runTransaction(rt.db, async transaction => {
        if ((await transaction.get(ref)).exists()) fail('server_error', 'Please retry this reservation.');
        transaction.set(ref, entry);
      });
      const snapshot = await rt.store.getDocFromServer(ref);
      return { booking: bookingShape(snapshot), bookings: await bookings(rt, user.uid) };
    }
    if (method === 'DELETE' && path.startsWith('/api/bookings/')) {
      const ref = rt.store.doc(bookingCollection(rt, user.uid), data.id);
      await rt.store.runTransaction(rt.db, async transaction => {
        const snapshot = await transaction.get(ref);
        if (!snapshot.exists()) fail('not_found', 'This booking could not be found.');
        if (snapshot.data().status !== 'cancelled') transaction.update(ref, { status: 'cancelled' });
      });
      return { bookings: await bookings(rt, user.uid) };
    }
    fail('not_found', 'This API endpoint could not be found.');
  } catch (error) { throw mapError(error); }
}
