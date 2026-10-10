import { siteConfig } from './siteConfig.js';
import { destinations } from './data.js';

// Loaded only if the site selects Firebase; the local Node service stays independent.
const SDK = 'https://www.gstatic.com/firebasejs/9.22.0/';
const INTERESTS = new Set(['culture', 'beach', 'city', 'nature', 'adventure', 'food', 'family', 'wellness']);
const GROUPS = new Set(['solo', 'couple', 'family', 'friends']);
let runtimePromise;
let cachedRuntime;

class AdapterError extends Error {
  constructor(code, message, details = {}) { super(message); this.code = code; this.error = message; Object.assign(this, details); }
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
  if (method === 'POST' && path === '/api/google') {
    if (data.language != null && !['en', 'vi'].includes(data.language)) fail('invalid_input', 'Choose English or Vietnamese.');
    return { language: data.language ?? 'en' };
  }
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
export function waitForInitialAuth(authSdk, auth) {
  return new Promise((resolve, reject) => {
    let unsubscribe;
    let settled = false;
    const finish = (error) => {
      if (settled) return;
      settled = true;
      unsubscribe?.();
      if (error) reject(error); else resolve();
    };
    unsubscribe = authSdk.onAuthStateChanged(auth, () => finish(), finish);
    // Also clean up SDK/test implementations that call the observer inline,
    // before onAuthStateChanged has returned its unsubscribe function.
    if (settled) unsubscribe?.();
  });
}
function runtime() {
  if (cachedRuntime) return cachedRuntime;
  if (!runtimePromise) runtimePromise = (async () => {
    const [appSdk, authSdk, store] = await Promise.all([
      import(`${SDK}firebase-app.js`), import(`${SDK}firebase-auth.js`), import(`${SDK}firebase-firestore.js`)
    ]);
    const app = appSdk.getApps().find(item => item.name === 'vacasia-features') ?? appSdk.initializeApp(siteConfig.firebase, 'vacasia-features');
    const auth = authSdk.getAuth(app);
    const db = store.getFirestore(app);
    await waitForInitialAuth(authSdk, auth);
    cachedRuntime = { auth, authSdk, db, store };
    return cachedRuntime;
  })().catch(error => { runtimePromise = undefined; throw error; });
  return runtimePromise;
}
function requireUser(rt) {
  if (!rt.auth.currentUser) fail('auth_required', 'Sign in to continue.');
  return rt.auth.currentUser;
}
function assertUser(rt, uid) {
  if (rt.auth.currentUser?.uid !== uid) throw new AdapterError('auth_changed', 'The signed-in account changed. Please try again.', { stage: 'auth_state' });
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
  assertUser(rt, uid);
  const snapshots = await rt.store.getDocsFromServer(bookingCollection(rt, uid));
  assertUser(rt, uid);
  return snapshots.docs.map(bookingShape).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
function userShape(user, name = defaultName(user)) { return { id: user.uid, name, email: user.email }; }
function warningShape(error) {
  return { code: error.code, error: error.error, firebaseCode: error.firebaseCode, stage: error.stage };
}
// Auth succeeds independently of Firestore. A missing or unreachable profile must
// never turn a completed signup into a failure or ask the visitor to register again.
async function session(rt, initialName, expectedUid) {
  if (expectedUid !== undefined) assertUser(rt, expectedUid);
  const user = rt.auth.currentUser;
  if (!user) return emptySession();
  const result = { user: userShape(user, initialName ?? defaultName(user)), favorites: [], bookings: [], preferences: null, cloudReady: false };
  try {
    const data = await atStage('firestore_profile', () => ensureProfile(rt, user, initialName));
    result.user = userShape(user, data.name);
    result.favorites = data.favorites;
    result.preferences = data.preferences;
    result.bookings = await atStage('firestore_bookings', () => bookings(rt, user.uid));
    result.cloudReady = true;
  } catch (error) {
    // A result for a previous account is neither an offline session nor a
    // profile-sync warning. Never expose it after another tab signs out/in.
    assertUser(rt, user.uid);
    if (error.code === 'auth_changed') throw error;
    result.syncWarning = warningShape(error);
  }
  assertUser(rt, user.uid);
  return result;
}
// Create once inside a transaction. Retrying after partial signup or signing in
// through Google leaves existing names, favorites, preferences and timestamps intact.
async function ensureProfile(rt, user, initialName) {
  assertUser(rt, user.uid);
  const profile = await rt.store.runTransaction(rt.db, async transaction => {
    assertUser(rt, user.uid);
    const ref = profileRef(rt, user.uid);
    const snapshot = await transaction.get(ref);
    assertUser(rt, user.uid);
    if (snapshot.exists()) return snapshot.data();
    const profile = { name: initialName ?? defaultName(user), email: user.email, favorites: [], preferences: null, createdAt: rt.store.serverTimestamp(), updatedAt: rt.store.serverTimestamp() };
    transaction.set(ref, profile);
    return profile;
  });
  assertUser(rt, user.uid);
  return profile;
}
// Transactions preserve favorites when multiple tabs update the same profile.
async function updateProfile(rt, uid, change) {
  assertUser(rt, uid);
  const user = requireUser(rt);
  const result = await rt.store.runTransaction(rt.db, async transaction => {
    assertUser(rt, uid);
    const ref = profileRef(rt, uid);
    const snapshot = await transaction.get(ref);
    assertUser(rt, uid);
    const profile = snapshot.exists() ? snapshot.data() : { name: defaultName(user), email: user.email, favorites: [], preferences: null, createdAt: rt.store.serverTimestamp() };
    const next = { ...profile, ...change(profile), updatedAt: rt.store.serverTimestamp() };
    transaction.set(ref, next);
    return next;
  });
  assertUser(rt, uid);
  return result;
}
function mapError(error, stage = 'runtime') {
  if (error instanceof AdapterError) {
    if (!error.stage) error.stage = stage;
    return error;
  }
  const firebaseCode = typeof error?.code === 'string' ? error.code : undefined;
  const codes = {
    'auth/email-already-in-use': 'email_exists', 'auth/invalid-email': 'invalid_input', 'auth/weak-password': 'invalid_input',
    'auth/invalid-login-credentials': 'invalid_credentials', 'auth/invalid-credential': 'invalid_credentials', 'auth/user-not-found': 'invalid_credentials', 'auth/wrong-password': 'invalid_credentials', 'auth/user-disabled': 'invalid_credentials',
    'auth/too-many-requests': 'rate_limited', 'auth/network-request-failed': 'offline',
    'auth/operation-not-allowed': 'auth_disabled', 'auth/unauthorized-domain': 'auth_domain', 'auth/invalid-api-key': 'auth_config', 'auth/configuration-not-found': 'auth_config', 'auth/app-not-authorized': 'auth_config',
    'auth/popup-closed-by-user': 'auth_cancelled', 'auth/cancelled-popup-request': 'auth_cancelled', 'auth/popup-blocked': 'auth_popup_blocked',
    'auth/account-exists-with-different-credential': 'auth_provider_conflict', 'auth/operation-not-supported-in-this-environment': 'auth_unsupported', 'auth/web-storage-unsupported': 'auth_unsupported',
    'permission-denied': 'store_permission', 'unavailable': 'store_unavailable', 'deadline-exceeded': 'store_unavailable', 'failed-precondition': 'store_setup', 'not-found': 'store_setup', 'resource-exhausted': 'store_quota', 'unauthenticated': 'auth_required'
  };
  const code = codes[firebaseCode] ?? (error instanceof TypeError && stage === 'runtime' ? 'offline' : 'server_error');
  const messages = {
    email_exists: 'An account already uses this email. Sign in instead.', invalid_credentials: 'The email or password is incorrect.', invalid_input: 'Check the information and try again.', rate_limited: 'Too many attempts. Please try again later.', offline: 'Could not connect. Check your internet connection.',
    auth_disabled: 'This sign-in method is disabled in Firebase Authentication. Enable it for this project.', auth_domain: 'This website domain is not authorized for Google sign-in. Add it in Firebase Authentication settings.', auth_config: 'The Firebase Authentication project or API key is not configured correctly.',
    auth_cancelled: 'Google sign-in was cancelled.', auth_popup_blocked: 'Your browser blocked Google sign-in. Allow popups and try again.', auth_provider_conflict: 'This email uses another sign-in method. Sign in using that method first.', auth_unsupported: 'This browser cannot complete Google sign-in. Allow browser storage or try another browser.',
    store_permission: 'Your account is signed in, but Firestore rules denied access to your travel data. Contact the website owner.', store_unavailable: 'Your account is signed in, but cloud data is temporarily unavailable. Try again when connected.', store_setup: 'Your account is signed in, but the Firestore database needs configuration by the website owner.', store_quota: 'Cloud storage has reached its quota. Please try again later.', auth_required: 'Sign in again to access your cloud data.',
    server_error: 'The service could not complete this request. Please try again.'
  };
  return new AdapterError(code, messages[code], { firebaseCode, stage });
}
async function atStage(stage, operation) {
  try { return await operation(); } catch (error) { throw mapError(error, stage); }
}
const redirectChecks = new WeakMap();
async function finishRedirect(rt) {
  if (!redirectChecks.has(rt)) {
    // Consume only once per page load. A dismissed/failed redirect cannot poison
    // later password login or all subsequent session refreshes.
    const check = atStage('google_redirect', () => rt.authSdk.getRedirectResult(rt.auth));
    redirectChecks.set(rt, check.then(() => null, () => null));
    return check;
  }
  return redirectChecks.get(rt);
}

/** Observe local and cross-tab Firebase account changes without reading private
 * Firestore data. Each notification carries only the current Auth identity. */
export function createFirebaseAuthSubscription(getRuntime) {
  return async function subscribeFirebaseAuth(callback) {
    const rt = await getRuntime();
    return rt.authSdk.onAuthStateChanged(rt.auth, user => callback({ user: user ? userShape(user) : null }));
  };
}
export const subscribeFirebaseAuth = createFirebaseAuthSubscription(runtime);
function redirectSupported(rt, pageOrigin) {
  const authDomain = rt.auth.app?.options?.authDomain ?? siteConfig.firebase.authDomain;
  try {
    // Redirect sign-in uses Firebase's helper iframe. Cross-origin fallback
    // breaks on modern browsers that partition/block third-party storage.
    // A same-origin authDomain requires Firebase Hosting or its documented
    // /__/auth reverse proxy plus an authorized OAuth redirect URI.
    return typeof authDomain === 'string' && pageOrigin === new URL(`https://${authDomain}`).origin;
  } catch { return false; }
}

/** Same response shape as the optional local Node API, backed by Firebase Auth/Firestore. */
export function createFirebaseApi(getRuntime, getPageOrigin = () => globalThis.location?.origin) {
return async function firebaseApi(path, input, method = 'POST', expectedUserId) {
  try {
    method = method.toUpperCase();
    const data = validate(path, input, method); // Reject malformed input before SDK/network access.
    // Once startup has loaded the SDK, start popup sign-in on the click's task
    // without waiting for another initialization/network round trip.
    const pending = getRuntime();
    const rt = pending && typeof pending.then === 'function' ? await pending : pending;
    if (method === 'GET' && path === '/api/health') return { ok: true, mode: 'demo', backend: 'firebase', destinationCount: destinations.length };
    if (method === 'GET' && path === '/api/session') {
      const redirected = await finishRedirect(rt);
      return await session(rt, undefined, redirected?.user?.uid);
    }
    if (method === 'POST' && path === '/api/register') {
      const result = await atStage('auth_register', () => rt.authSdk.createUserWithEmailAndPassword(rt.auth, data.email, data.password));
      assertUser(rt, result.user.uid);
      let profileWarning;
      try { await atStage('auth_profile', () => rt.authSdk.updateProfile(result.user, { displayName: data.name })); }
      catch (error) { profileWarning = warningShape(error); }
      const current = await session(rt, data.name, result.user.uid);
      assertUser(rt, result.user.uid);
      if (profileWarning && !current.syncWarning) current.syncWarning = profileWarning;
      return current;
    }
    if (method === 'POST' && path === '/api/login') {
      const result = await atStage('auth_login', () => rt.authSdk.signInWithEmailAndPassword(rt.auth, data.email, data.password));
      return await session(rt, undefined, result.user.uid);
    }
    if (method === 'POST' && path === '/api/google') {
      rt.auth.languageCode = data.language;
      const provider = new rt.authSdk.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      let credential;
      try { credential = await atStage('google_popup', () => rt.authSdk.signInWithPopup(rt.auth, provider)); }
      catch (error) {
        if (error.firebaseCode !== 'auth/popup-blocked') throw error;
        if (!redirectSupported(rt, getPageOrigin())) throw error;
        // Redirect is reserved for browser-blocked popups; closing a popup is a
        // deliberate cancellation and must never trigger another sign-in flow.
        await atStage('google_redirect', () => rt.authSdk.signInWithRedirect(rt.auth, provider));
        return { redirecting: true };
      }
      return await session(rt, undefined, credential.user.uid);
    }
    if (method === 'POST' && path === '/api/logout') {
      if (expectedUserId !== undefined) assertUser(rt, expectedUserId);
      await atStage('auth_logout', () => rt.authSdk.signOut(rt.auth));
      if (rt.auth.currentUser) throw new AdapterError('auth_changed', 'The signed-in account changed. Please try again.', { stage: 'auth_state' });
      return emptySession();
    }
    if (expectedUserId !== undefined) assertUser(rt, expectedUserId);
    const user = requireUser(rt);
    if (method === 'POST' && path === '/api/profile') {
      const profile = await atStage('firestore_profile', () => updateProfile(rt, user.uid, () => ({ name: data.name })));
      // Firestore is the profile source of truth. Once saved, a secondary Auth
      // display-name failure is a warning, not a false report that saving failed.
      let syncWarning;
      try { assertUser(rt, user.uid); await atStage('auth_profile', () => rt.authSdk.updateProfile(user, { displayName: data.name })); }
      catch (error) { syncWarning = warningShape(error); }
      assertUser(rt, user.uid);
      if (syncWarning) return { user: userShape(user, profile.name), syncWarning };
      return { user: { id: user.uid, name: profile.name, email: user.email } };
    }
    if (method === 'PUT' && path === '/api/favorites') {
      const profile = await atStage('firestore_favorites', () => updateProfile(rt, user.uid, current => ({ favorites: [...current.favorites.filter(id => id !== data.destinationId), ...(data.saved ? [data.destinationId] : [])] })));
      assertUser(rt, user.uid);
      return { favorites: profile.favorites };
    }
    if (method === 'PUT' && path === '/api/preferences') {
      await atStage('firestore_preferences', () => updateProfile(rt, user.uid, () => ({ preferences: data })));
      assertUser(rt, user.uid);
      return { preferences: data };
    }
    if (method === 'POST' && path === '/api/bookings') {
      const random = new Uint8Array(6);
      crypto.getRandomValues(random);
      const id = `VA-${[...random].map(value => value.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
      const ref = rt.store.doc(bookingCollection(rt, user.uid), id);
      const entry = { ...data, visitAt: rt.store.Timestamp.fromDate(new Date(`${data.date}T00:00:00Z`)), status: 'demo-confirmed', createdAt: rt.store.serverTimestamp() };
      // Deployed Firestore rules verify all quantities, dates and totals independently.
      await atStage('firestore_bookings', () => rt.store.runTransaction(rt.db, async transaction => {
        assertUser(rt, user.uid);
        if ((await transaction.get(ref)).exists()) fail('server_error', 'Please retry this reservation.');
        assertUser(rt, user.uid);
        transaction.set(ref, entry);
      }));
      assertUser(rt, user.uid);
      const snapshot = await atStage('firestore_bookings', () => rt.store.getDocFromServer(ref));
      assertUser(rt, user.uid);
      const history = await atStage('firestore_bookings', () => bookings(rt, user.uid));
      assertUser(rt, user.uid);
      return { booking: bookingShape(snapshot), bookings: history };
    }
    if (method === 'DELETE' && path.startsWith('/api/bookings/')) {
      const ref = rt.store.doc(bookingCollection(rt, user.uid), data.id);
      await atStage('firestore_bookings', () => rt.store.runTransaction(rt.db, async transaction => {
        assertUser(rt, user.uid);
        const snapshot = await transaction.get(ref);
        assertUser(rt, user.uid);
        if (!snapshot.exists()) fail('not_found', 'This booking could not be found.');
        if (snapshot.data().status !== 'cancelled') transaction.update(ref, { status: 'cancelled' });
      }));
      assertUser(rt, user.uid);
      const history = await atStage('firestore_bookings', () => bookings(rt, user.uid));
      assertUser(rt, user.uid);
      return { bookings: history };
    }
    fail('not_found', 'This API endpoint could not be found.');
  } catch (error) { throw mapError(error); }
};
}
export const firebaseApi = createFirebaseApi(runtime);
