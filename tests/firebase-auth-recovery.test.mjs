import test from 'node:test';
import assert from 'node:assert/strict';
import { createFirebaseApi, createFirebaseAuthSubscription, waitForInitialAuth } from '../server/firebaseAdapter.js';

// A stateful, in-memory SDK boundary exercises the actual adapter. It has no
// network client or project configuration and never touches live Firebase users.
const fault = code => Object.assign(new Error('SDK error'), { code, customData: { token: 'never expose tokens' } });
const copy = data => structuredClone(data);
const credentials = { name: 'Ada Traveler', email: 'ada@example.com', password: 'correct-horse-99' };
function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}
function fixture(origin = 'https://vacasia-27c13.firebaseapp.com') {
  const state = { accounts: new Map(), profiles: new Map(), faults: {}, calls: [], writes: 0, listeners: new Set() };
  // Keep the mock OAuth host independent of the delivered live project config.
  const auth = { currentUser: null, app: { options: { authDomain: 'vacasia-27c13.firebaseapp.com' } } };
  state.setUser = user => { auth.currentUser = user; for (const listener of state.listeners) listener(user); };
  const raise = label => { if (state.faults[label]) throw fault(state.faults[label]); };
  const snapshot = (ref, data) => ({ id: ref.path.split('/').at(-1), exists: () => data != null, data: () => copy(data) });
  const reference = (...parts) => ({ path: parts.map(item => typeof item === 'string' ? item : item.path).join('/') });
  const authSdk = {
    onAuthStateChanged(auth, listener) {
      state.listeners.add(listener); listener(auth.currentUser);
      return () => state.listeners.delete(listener);
    },
    async createUserWithEmailAndPassword(auth, email, password) {
      state.calls.push('register'); raise('register');
      if (state.accounts.has(email)) throw fault('auth/email-already-in-use');
      const user = { uid: `user-${state.accounts.size + 1}`, email, displayName: null };
      state.accounts.set(email, { user, password }); state.setUser(user);
      return { user };
    },
    async signInWithEmailAndPassword(auth, email, password) {
      state.calls.push('login'); raise('login');
      const account = state.accounts.get(email);
      if (!account || account.password !== password) throw fault('auth/invalid-credential');
      state.setUser(account.user); return { user: account.user };
    },
    async updateProfile(user, value) { state.calls.push('authProfile'); raise('authProfile'); Object.assign(user, value); },
    async signOut() { state.setUser(null); },
    GoogleAuthProvider: class { setCustomParameters(value) { this.parameters = value; } },
    async signInWithPopup(auth, provider) {
      state.calls.push('popup'); state.provider = provider; raise('popup');
      state.setUser({ uid: 'google-user', email: 'ada@gmail.com', displayName: 'Ada Google' });
      return { user: auth.currentUser };
    },
    async signInWithRedirect() { state.calls.push('redirect'); raise('redirect'); },
    async getRedirectResult(auth) {
      state.calls.push('redirectResult'); raise('redirectResult');
      if (!state.redirectUser) return null;
      state.setUser(state.redirectUser);
      return { user: auth.currentUser };
    }
  };
  const store = {
    doc: (_db, ...parts) => reference(...parts),
    collection: (_db, ...parts) => reference(...parts),
    serverTimestamp: () => 'server-time',
    async runTransaction(_db, handler) {
      raise('profile');
      const run = async () => {
        const pending = [];
        const transaction = {
          get: async ref => {
            const data = state.profiles.get(ref.path);
            state.profileReadEntered?.resolve();
            if (state.profileReadGate) await state.profileReadGate;
            return snapshot(ref, data);
          },
          set: (ref, data) => pending.push([ref.path, copy(data)]),
          update: (ref, patch) => pending.push([ref.path, { ...state.profiles.get(ref.path), ...copy(patch) }])
        };
        return { value: await handler(transaction), pending };
      };
      let result = await run();
      if (state.concurrentProfile) {
        // Firestore retries a transaction if another tab creates the document
        // between read and commit. The winning account data must survive.
        const [path, data] = state.concurrentProfile;
        state.profiles.set(path, data); state.concurrentProfile = null;
        result = await run();
      }
      for (const [path, data] of result.pending) { state.profiles.set(path, data); state.writes++; }
      return result.value;
    },
    async getDocsFromServer() {
      state.bookingReadEntered?.resolve();
      if (state.bookingReadGate) await state.bookingReadGate;
      raise('bookings'); return { docs: state.bookingDocs ?? [] };
    }
  };
  const rt = { auth, authSdk, store, db: {} };
  const api = createFirebaseApi(() => rt, () => origin);
  return { api, state, rt };
}

test('signup succeeds even when rules deny profile creation; later login repairs it', async () => {
  const { api, state, rt } = fixture();
  state.faults.profile = 'permission-denied';
  const partial = await api('/api/register', credentials);
  assert.equal(partial.user.email, credentials.email);
  assert.equal(partial.user.name, credentials.name);
  assert.equal(partial.cloudReady, false);
  assert.deepEqual(partial.syncWarning, {
    code: 'store_permission', error: 'Your account is signed in, but Firestore rules denied access to your travel data. Contact the website owner.', firebaseCode: 'permission-denied', stage: 'firestore_profile'
  });
  assert.equal(state.accounts.size, 1);
  assert.equal(rt.auth.currentUser.uid, partial.user.id);
  assert.equal(state.writes, 0);
  await assert.rejects(api('/api/register', credentials), error => error.code === 'email_exists' && error.stage === 'auth_register');
  delete state.faults.profile;
  await api('/api/logout', {});
  const recovered = await api('/api/login', credentials);
  assert.equal(recovered.user.id, partial.user.id);
  assert.equal(recovered.user.name, credentials.name);
  assert.equal(recovered.cloudReady, true);
  assert.equal(recovered.syncWarning, undefined);
  assert.equal(state.accounts.size, 1);
  assert.equal(state.writes, 1);
  const document = state.profiles.get(`vacasiaProfiles/${partial.user.id}`);
  assert.deepEqual(document.favorites, []);
  assert.equal(document.email, credentials.email);
  assert.deepEqual(Object.keys(document).sort(), ['name', 'email', 'favorites', 'preferences', 'createdAt', 'updatedAt'].sort());
});

test('an Auth display-name failure does not erase completed signup or the requested profile name', async () => {
  const { api, state, rt } = fixture();
  state.faults.authProfile = 'auth/network-request-failed';
  const result = await api('/api/register', credentials);
  assert.equal(result.user.name, credentials.name);
  assert.equal(result.cloudReady, true);
  assert.equal(result.syncWarning.stage, 'auth_profile');
  assert.equal(result.syncWarning.code, 'offline');
  assert.equal(rt.auth.currentUser.displayName, null);
  assert.equal(state.profiles.get(`vacasiaProfiles/${result.user.id}`).name, credentials.name);
  const restored = await api('/api/session', undefined, 'GET');
  assert.equal(restored.user.name, credentials.name);
  assert.equal(state.accounts.size, 1);
  assert.equal(state.writes, 1);
});

test('repeated login/session and transaction retries preserve saved account data', async () => {
  const { api, state, rt } = fixture();
  rt.auth.currentUser = { uid: 'existing', email: 'ada@example.com', displayName: 'Provider name' };
  const saved = { name: 'My custom name', email: rt.auth.currentUser.email, favorites: ['kyoto'], preferences: { budget: 120, days: 6, group: 'solo', month: 4, interests: ['food'] }, createdAt: 'original-created', updatedAt: 'original-updated' };
  state.concurrentProfile = ['vacasiaProfiles/existing', copy(saved)];
  const first = await api('/api/session', undefined, 'GET');
  const second = await api('/api/session', undefined, 'GET');
  assert.equal(first.user.name, saved.name);
  assert.deepEqual(second.favorites, saved.favorites);
  assert.deepEqual(second.preferences, saved.preferences);
  assert.deepEqual(state.profiles.get('vacasiaProfiles/existing'), saved);
  assert.equal(state.writes, 0);
  assert.equal(state.calls.filter(call => call === 'redirectResult').length, 1);
});

test('Firestore booking-history failure keeps loaded profile and reports its actual stage', async () => {
  const { api, state } = fixture();
  await api('/api/register', credentials);
  const profile = [...state.profiles.values()][0];
  profile.favorites = ['kyoto'];
  state.faults.bookings = 'unavailable';
  const result = await api('/api/session', undefined, 'GET');
  assert.deepEqual(result.favorites, ['kyoto']);
  assert.equal(result.cloudReady, false);
  assert.equal(result.syncWarning.code, 'store_unavailable');
  assert.equal(result.syncWarning.firebaseCode, 'unavailable');
  assert.equal(result.syncWarning.stage, 'firestore_bookings');
});

test('provider disabled, domain unauthorized, invalid credentials and database faults remain distinct', async t => {
  for (const [sdkCode, expectedCode, source, stage] of [
    ['auth/operation-not-allowed', 'auth_disabled', 'register', 'auth_register'],
    ['auth/configuration-not-found', 'auth_config', 'register', 'auth_register'],
    ['auth/invalid-api-key', 'auth_config', 'register', 'auth_register'],
    ['auth/unauthorized-domain', 'auth_domain', 'popup', 'google_popup'],
    ['auth/account-exists-with-different-credential', 'auth_provider_conflict', 'popup', 'google_popup'],
    ['auth/network-request-failed', 'offline', 'register', 'auth_register'],
    ['auth/invalid-credential', 'invalid_credentials', 'login', 'auth_login']
  ]) await t.test(sdkCode, async () => {
    const { api, state } = fixture(); state.faults[source] = sdkCode;
    const path = source === 'popup' ? '/api/google' : `/api/${source}`;
    await assert.rejects(api(path, source === 'popup' ? {} : credentials), error => {
      assert.equal(error.code, expectedCode); assert.equal(error.firebaseCode, sdkCode); assert.equal(error.stage, stage);
      assert.equal(error.customData, undefined); assert.doesNotMatch(error.error, /never expose/); return true;
    });
    assert.equal(state.writes, 0);
  });
  for (const [sdkCode, expectedCode] of [['permission-denied', 'store_permission'], ['failed-precondition', 'store_setup'], ['unavailable', 'store_unavailable'], ['resource-exhausted', 'store_quota']]) await t.test(sdkCode, async () => {
    const { api, state } = fixture(); state.faults.profile = sdkCode;
    const result = await api('/api/register', credentials);
    assert.equal(result.user.email, credentials.email);
    assert.equal(result.syncWarning.code, expectedCode);
    assert.equal(result.syncWarning.firebaseCode, sdkCode);
    assert.equal(result.cloudReady, false);
  });
});

test('Google popup begins synchronously with warm SDK and creates a UID-owned profile', async () => {
  const { api, state, rt } = fixture();
  const pending = api('/api/google', { language: 'vi' });
  assert.deepEqual(state.calls, ['popup']);
  const result = await pending;
  assert.equal(rt.auth.languageCode, 'vi');
  assert.deepEqual(state.provider.parameters, { prompt: 'select_account' });
  assert.equal(result.user.id, 'google-user');
  assert.equal(result.user.name, 'Ada Google');
  assert.equal(result.cloudReady, true);
  assert.equal(state.profiles.get('vacasiaProfiles/google-user').email, 'ada@gmail.com');
});

test('only blocked popups fall back to redirect; deliberately cancelled popups stay cancelled', async t => {
  await t.test('blocked popup', async () => {
    const { api, state } = fixture(); state.faults.popup = 'auth/popup-blocked';
    assert.deepEqual(await api('/api/google', {}), { redirecting: true });
    assert.deepEqual(state.calls, ['popup', 'redirect']);
    assert.equal(state.writes, 0);
  });
  for (const code of ['auth/popup-closed-by-user', 'auth/cancelled-popup-request']) await t.test(code, async () => {
    const { api, state } = fixture(); state.faults.popup = code;
    await assert.rejects(api('/api/google', {}), error => error.code === 'auth_cancelled' && error.firebaseCode === code);
    assert.deepEqual(state.calls, ['popup']);
    assert.equal(state.writes, 0);
  });
});

test('a blocked popup stays actionable on external hosts instead of starting an unreliable cross-origin redirect', async t => {
  for (const origin of ['https://vacasia.example.com', 'https://vacasia-27c13.web.app', 'http://localhost:8080', undefined]) await t.test(String(origin), async () => {
    const { api, state } = fixture(origin === undefined ? null : origin);
    state.faults.popup = 'auth/popup-blocked';
    await assert.rejects(api('/api/google', {}), error => {
      assert.equal(error.code, 'auth_popup_blocked');
      assert.equal(error.stage, 'google_popup');
      assert.match(error.error, /Allow popups/);
      return true;
    });
    assert.deepEqual(state.calls, ['popup']);
  });
  await t.test('properly configured same-origin authDomain', async () => {
    const { api, state, rt } = fixture('https://vacasia.example.com');
    rt.auth.app = { options: { authDomain: 'vacasia.example.com' } };
    state.faults.popup = 'auth/popup-blocked';
    assert.deepEqual(await api('/api/google', {}), { redirecting: true });
    assert.deepEqual(state.calls, ['popup', 'redirect']);
  });
});

test('initial Auth observer cleans up after synchronous, asynchronous and error notifications', async t => {
  for (const inline of [true, false]) await t.test(inline ? 'inline notification' : 'async notification', async () => {
    let unsubscribed = 0;
    await waitForInitialAuth({ onAuthStateChanged(_auth, notify) {
      if (inline) notify(null); else queueMicrotask(() => notify(null));
      return () => { unsubscribed++; };
    } }, {});
    assert.equal(unsubscribed, 1);
  });
  await t.test('Auth observer error', async () => {
    let unsubscribed = 0;
    const failure = fault('auth/network-request-failed');
    await assert.rejects(waitForInitialAuth({ onAuthStateChanged(_auth, _notify, fail) {
      fail(failure);
      return () => { unsubscribed++; };
    } }, {}), failure);
    assert.equal(unsubscribed, 1);
  });
});

test('startup consumes Google redirect once, signs in the returning visitor and provisions their profile', async () => {
  const { api, state } = fixture();
  state.redirectUser = { uid: 'returning-google', email: 'returning@gmail.com', displayName: 'Returning Google' };
  const first = await api('/api/session', undefined, 'GET');
  const second = await api('/api/session', undefined, 'GET');
  assert.equal(first.user.id, state.redirectUser.uid);
  assert.equal(second.cloudReady, true);
  assert.equal(state.calls.filter(call => call === 'redirectResult').length, 1);
  assert.equal(state.writes, 1);
  assert.equal(state.profiles.get('vacasiaProfiles/returning-google').name, 'Returning Google');
});

test('a failed redirect is reported once and cannot block later password signup/session recovery', async () => {
  const { api, state } = fixture();
  state.faults.redirectResult = 'auth/unauthorized-domain';
  await assert.rejects(api('/api/session', undefined, 'GET'), error => error.code === 'auth_domain' && error.stage === 'google_redirect');
  const created = await api('/api/register', credentials);
  const restored = await api('/api/session', undefined, 'GET');
  assert.equal(restored.user.id, created.user.id);
  assert.equal(restored.cloudReady, true);
  assert.equal(state.calls.filter(call => call === 'redirectResult').length, 1);
});

test('cloud changes fail accurately and do not claim success or mutate data when rules deny writes', async () => {
  const { api, state } = fixture();
  const created = await api('/api/register', credentials);
  const before = copy(state.profiles.get(`vacasiaProfiles/${created.user.id}`));
  state.faults.profile = 'permission-denied';
  await assert.rejects(api('/api/favorites', { destinationId: 'kyoto', saved: true }, 'PUT'), error => error.code === 'store_permission' && error.stage === 'firestore_favorites');
  assert.deepEqual(state.profiles.get(`vacasiaProfiles/${created.user.id}`), before);
});

test('validation still occurs before runtime loading, including unsupported Google languages', async () => {
  let loads = 0;
  const api = createFirebaseApi(() => { loads++; throw new Error('No SDK should load'); });
  await assert.rejects(api('/api/google', { language: 'anything' }), error => error.code === 'invalid_input');
  await assert.rejects(api('/api/register', { ...credentials, name: 'A' }), error => error.code === 'invalid_input');
  assert.equal(loads, 0);
});

test('persistent observer reports cross-tab identity changes and unsubscribe stops them', async () => {
  const { rt, state } = fixture();
  const notifications = [];
  const subscribe = createFirebaseAuthSubscription(() => rt);
  const unsubscribe = await subscribe(value => notifications.push(value));
  assert.deepEqual(notifications, [{ user: null }]);
  const first = { uid: 'account-a', email: 'a@example.com', displayName: 'Alice', refreshToken: 'secret' };
  const second = { uid: 'account-b', email: 'b@example.com', displayName: 'Bob' };
  state.setUser(first); state.setUser(null); state.setUser(second);
  assert.deepEqual(notifications.slice(1), [
    { user: { id: 'account-a', email: 'a@example.com', name: 'Alice' } },
    { user: null },
    { user: { id: 'account-b', email: 'b@example.com', name: 'Bob' } }
  ]);
  unsubscribe(); state.setUser(null);
  assert.equal(notifications.length, 4);
  assert.equal(state.listeners.size, 0);
});

test('an in-flight session cannot resurrect an account after logout or reveal it to another account', async t => {
  for (const replacement of [null, { uid: 'account-b', email: 'b@example.com', displayName: 'Bob' }]) await t.test(replacement ? 'another account signs in' : 'visitor signs out', async () => {
    const { api, state } = fixture();
    const first = await api('/api/register', credentials);
    const gate = deferred(); const entered = deferred();
    state.bookingReadGate = gate.promise; state.bookingReadEntered = entered;
    const pending = api('/api/session', undefined, 'GET');
    await entered.promise;
    state.setUser(replacement); gate.resolve();
    await assert.rejects(pending, error => error.code === 'auth_changed' && error.stage === 'auth_state');
    assert.equal(state.accounts.size, 1);
    assert.equal(state.profiles.get(`vacasiaProfiles/${first.user.id}`).email, credentials.email);
  });
});

test('a profile transaction paused during an account switch commits to neither account', async () => {
  const { api, state } = fixture();
  const first = await api('/api/register', credentials);
  const original = copy(state.profiles.get(`vacasiaProfiles/${first.user.id}`));
  const gate = deferred(); const entered = deferred();
  state.profileReadGate = gate.promise; state.profileReadEntered = entered;
  const pending = api('/api/favorites', { destinationId: 'kyoto', saved: true }, 'PUT', first.user.id);
  await entered.promise;
  state.setUser({ uid: 'account-b', email: 'b@example.com', displayName: 'Bob' });
  gate.resolve();
  await assert.rejects(pending, error => error.code === 'auth_changed');
  assert.deepEqual(state.profiles.get(`vacasiaProfiles/${first.user.id}`), original);
  assert.equal(state.profiles.has('vacasiaProfiles/account-b'), false);
  assert.equal(state.writes, 1);
});

test('a stale UI account binding cannot write or sign out a different Firebase account', async () => {
  const { api, state, rt } = fixture();
  const first = await api('/api/register', credentials);
  state.setUser({ uid: 'account-b', email: 'b@example.com', displayName: 'Bob' });
  for (const [path, input, method] of [
    ['/api/favorites', { destinationId: 'kyoto', saved: true }, 'PUT'],
    ['/api/profile', { name: 'Wrong account update' }, 'POST'],
    ['/api/logout', {}, 'POST']
  ]) await assert.rejects(api(path, input, method, first.user.id), error => error.code === 'auth_changed');
  assert.equal(rt.auth.currentUser.uid, 'account-b');
  assert.equal(state.writes, 1);
  assert.equal(state.profiles.size, 1);
});

test('signup profile-read race cannot use the requested name to provision a different account', async () => {
  const { api, state } = fixture();
  const gate = deferred(); const entered = deferred();
  state.profileReadGate = gate.promise; state.profileReadEntered = entered;
  const pending = api('/api/register', credentials);
  await entered.promise;
  state.setUser({ uid: 'account-b', email: 'b@example.com', displayName: 'Bob' }); gate.resolve();
  await assert.rejects(pending, error => error.code === 'auth_changed');
  assert.equal(state.accounts.size, 1);
  assert.equal(state.profiles.size, 0);
});

test('a consumed redirect credential cannot constrain sessions after the returning account signs out', async () => {
  const { api, state } = fixture();
  state.redirectUser = { uid: 'google-a', email: 'a@gmail.com', displayName: 'Alice' };
  await api('/api/session', undefined, 'GET');
  state.setUser({ uid: 'google-b', email: 'b@gmail.com', displayName: 'Bob' });
  const second = await api('/api/session', undefined, 'GET');
  assert.equal(second.user.id, 'google-b');
  assert.equal(second.user.name, 'Bob');
  assert.equal(state.calls.filter(call => call === 'redirectResult').length, 1);
});
