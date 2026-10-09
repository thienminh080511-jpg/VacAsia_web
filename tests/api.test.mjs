import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { createApp } from '../server.mjs';
import { destinations } from '../server/data.js';

const fixedNow = Date.parse('2030-06-04T18:30:00Z'); // June 5 in Bangkok.
const sample = destinations[0];
const preferenceInput = { budget: 90, days: 7, group: 'friends', month: 6, interests: ['culture', 'food'] };

test('VacAsia HTTP API: accounts, isolation, validation, calculated tickets and persistence', async t => {
  const folder = await mkdtemp(join(tmpdir(), 'vacasia-api-'));
  const dataFile = join(folder, 'private', 'database.json');
  let server;
  let base;
  async function start() {
    server = await createApp({ dataFile, now: () => fixedNow });
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    base = `http://127.0.0.1:${server.address().port}`;
  }
  async function stop() {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
  async function request(path, method = 'GET', input, cookie = '', extraHeaders = {}) {
    const headers = { ...(input === undefined ? {} : { 'Content-Type': 'application/json' }), ...(method === 'GET' ? {} : { Origin: base }), ...(cookie ? { Cookie: cookie } : {}), ...extraHeaders };
    const response = await fetch(base + path, { method, headers, body: input === undefined ? undefined : JSON.stringify(input) });
    const data = await response.json();
    return { status: response.status, data, cookie: response.headers.get('set-cookie')?.split(';')[0], headers: response.headers };
  }
  await start();
  let alice;
  let bob;
  let bookingId;
  try {
    await t.test('anonymous access and static pages work without exposing private files', async () => {
      const health = await request('/api/health');
      assert.equal(health.status, 200);
      assert.equal(health.data.mode, 'demo');
      assert.equal(health.data.destinationCount, destinations.length);
      assert.deepEqual((await request('/api/session')).data, { user: null, favorites: [], bookings: [], preferences: null });
      for (const path of ['/', '/search.html', '/booking.html', '/history.html', '/VAmain.html']) {
        const response = await fetch(base + path);
        assert.equal(response.status, 200, path);
        assert.match(response.headers.get('content-type'), /text\/html/);
        assert.match(await response.text(), /VacAsia/i);
      }
      for (const path of ['/storage/vacasia.json', '/server.mjs', '/package.json', '/.env']) assert.equal((await request(path)).status, 404, path);
      assert.equal((await request('/api/favorites', 'PUT', { destinationId: sample.id, saved: true })).data.code, 'auth_required');
      assert.equal((await request('/api/bookings', 'POST', {})).status, 401);
    });
    await t.test('registration validates inputs and returns safe, opaque cookie sessions', async () => {
      assert.equal((await request('/api/register', 'POST', { name: 'A', email: 'bad', password: 'short' })).data.code, 'invalid_input');
      const created = await request('/api/register', 'POST', { name: '  Alice  Traveler ', email: ' ALICE@example.com ', password: 'secure-alice-pass' });
      assert.equal(created.status, 201);
      alice = created.cookie;
      assert.match(alice, /^vacasia_session=[a-f0-9]{64}$/);
      assert.match(created.headers.get('set-cookie'), /HttpOnly/);
      assert.match(created.headers.get('set-cookie'), /SameSite=Lax/);
      assert.equal(created.data.user.name, 'Alice Traveler');
      assert.equal(created.data.user.email, 'alice@example.com');
      assert.deepEqual(Object.keys(created.data.user).sort(), ['email', 'id', 'name']);
      assert.equal((await request('/api/register', 'POST', { name: 'Another Alice', email: 'Alice@example.com', password: 'another-secret' })).data.code, 'email_exists');
      assert.equal((await request('/api/login', 'POST', { email: 'alice@example.com', password: 'incorrect-password' })).data.code, 'invalid_credentials');
      assert.equal((await request('/api/login', 'POST', { email: 'nobody@example.com', password: 'incorrect-password' })).data.code, 'invalid_credentials');
      const second = await request('/api/register', 'POST', { name: 'Bob Traveler', email: 'bob@example.com', password: 'secure-bob-pass' });
      assert.equal(second.status, 201);
      bob = second.cookie;
      assert.notEqual(alice, bob);
      const stored = await readFile(dataFile, 'utf8');
      assert.equal(stored.includes('secure-alice-pass'), false);
      assert.equal(stored.includes(alice.split('=')[1]), false);
      const database = JSON.parse(stored);
      assert.match(database.users[0].password.hash, /^[a-f0-9]{128}$/);
      assert.notEqual(database.users[0].password.salt, database.users[1].password.salt);
    });
    await t.test('favorites and travel preferences are durable and scoped to the account', async () => {
      const favorites = await request('/api/favorites', 'PUT', { destinationId: sample.id, saved: true }, alice);
      assert.deepEqual(favorites.data.favorites, [sample.id]);
      assert.deepEqual((await request('/api/favorites', 'PUT', { destinationId: sample.id, saved: true }, alice)).data.favorites, [sample.id]);
      assert.equal((await request('/api/favorites', 'PUT', { destinationId: 'unknown', saved: true }, alice)).data.code, 'invalid_destination');
      assert.equal((await request('/api/favorites', 'PUT', { destinationId: sample.id, saved: 'yes' }, alice)).data.code, 'invalid_input');
      assert.deepEqual((await request('/api/preferences', 'PUT', preferenceInput, alice)).data.preferences, preferenceInput);
      for (const badInput of [{ budget: 0 }, { days: 31 }, { month: 13 }, { group: 'unknown' }, { interests: ['unknown'] }]) {
        assert.equal((await request('/api/preferences', 'PUT', { ...preferenceInput, ...badInput }, alice)).data.code, 'invalid_input');
      }
      const other = (await request('/api/session', 'GET', undefined, bob)).data;
      assert.deepEqual(other.favorites, []);
      assert.equal(other.preferences, null);
      assert.equal((await request('/api/profile', 'POST', { name: 'Alice Updated' }, alice)).data.user.name, 'Alice Updated');
      const choices = destinations.slice(1, 3);
      await Promise.all(choices.map(destination => request('/api/favorites', 'PUT', { destinationId: destination.id, saved: true }, alice)));
      const saved = (await request('/api/session', 'GET', undefined, alice)).data.favorites;
      for (const choice of choices) assert.ok(saved.includes(choice.id), 'concurrent writes preserve both favorites');
    });
    await t.test('booking validates Bangkok dates and quantities and ignores client price tampering', async () => {
      const input = { destinationId: sample.id, date: '2030-06-05', adults: 2, children: 1, notes: ' Afternoon visit ', total: 0.01, ticketPrice: 0, status: 'paid' };
      assert.equal((await request('/api/bookings', 'POST', { ...input, date: '2030-06-04' }, alice)).data.code, 'invalid_date');
      assert.equal((await request('/api/bookings', 'POST', { ...input, date: '2030-02-30' }, alice)).data.code, 'invalid_date');
      assert.equal((await request('/api/bookings', 'POST', { ...input, date: '2033-06-05' }, alice)).data.code, 'invalid_date');
      for (const quantity of [{ adults: 0 }, { adults: 2.5 }, { adults: '2' }, { children: -1 }, { adults: 12, children: 12 }]) assert.equal((await request('/api/bookings', 'POST', { ...input, ...quantity }, alice)).data.code, 'invalid_quantity');
      assert.equal((await request('/api/bookings', 'POST', { ...input, destinationId: 'missing' }, alice)).data.code, 'invalid_destination');
      assert.equal((await request('/api/bookings', 'POST', { ...input, notes: 'a'.repeat(501) }, alice)).data.code, 'invalid_input');
      const result = await request('/api/bookings', 'POST', input, alice);
      assert.equal(result.status, 201);
      const { booking } = result.data;
      bookingId = booking.id;
      const cents = Math.round(sample.ticketPrice * 100);
      assert.equal(booking.total, (2 * cents + Math.round(cents * 0.6)) / 100);
      assert.equal(booking.status, 'demo-confirmed');
      assert.equal(booking.notes, 'Afternoon visit');
      assert.equal(result.data.bookings.length, 1);
      assert.deepEqual((await request('/api/session', 'GET', undefined, bob)).data.bookings, []);
      assert.equal((await request(`/api/bookings/${bookingId}`, 'DELETE', undefined, bob)).status, 404);
      assert.equal((await request('/api/session', 'GET', undefined, alice)).data.bookings[0].status, 'demo-confirmed');
    });
    await t.test('cross-site mutation is rejected and malformed input is contained', async () => {
      const before = (await request('/api/session', 'GET', undefined, alice)).data;
      const blocked = await request('/api/profile', 'POST', { name: 'Attacker' }, alice, { Origin: 'https://another-site.example' });
      assert.equal(blocked.status, 403);
      assert.equal((await request('/api/session', 'GET', undefined, alice)).data.user.name, before.user.name);
      assert.equal((await request('/api/profile', 'POST', { name: 'Attacker' }, alice, { 'Sec-Fetch-Site': 'cross-site' })).status, 403);
      const malformed = await fetch(base + '/api/profile', { method: 'POST', headers: { Origin: base, Cookie: alice, 'Content-Type': 'application/json' }, body: '{not-json' });
      assert.equal(malformed.status, 400);
      assert.equal((await malformed.json()).code, 'invalid_input');
      const form = await fetch(base + '/api/profile', { method: 'POST', headers: { Origin: base, Cookie: alice, 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'name=Attacker' });
      assert.equal(form.status, 415);
      assert.equal((await request('/api/profile', 'POST', { name: 'x'.repeat(61) }, alice)).status, 400);
      const vietnameseName = 'Nguyễn Thị Ánh';
      const bytes = Buffer.from(JSON.stringify({ name: vietnameseName }));
      const split = bytes.findIndex(byte => byte > 127) + 1;
      const unicode = await new Promise((resolve, reject) => {
        const upload = http.request(base + '/api/profile', { method: 'POST', headers: { Origin: base, Cookie: alice, 'Content-Type': 'application/json' } }, response => {
          response.setEncoding('utf8');
          let data = '';
          response.on('data', chunk => { data += chunk; });
          response.on('end', () => resolve({ status: response.statusCode, data: JSON.parse(data) }));
        });
        upload.on('error', reject);
        upload.write(bytes.subarray(0, split));
        setImmediate(() => upload.end(bytes.subarray(split)));
      });
      assert.equal(unicode.status, 200);
      assert.equal(unicode.data.user.name, vietnameseName);
      await request('/api/profile', 'POST', { name: 'Alice Updated' }, alice);
    });
    await t.test('restart preserves account data and cancellation history; logout revokes the session', async () => {
      await stop();
      await start();
      const restored = (await request('/api/session', 'GET', undefined, alice)).data;
      assert.equal(restored.user.name, 'Alice Updated');
      assert.deepEqual(restored.preferences, preferenceInput);
      assert.ok(restored.favorites.includes(sample.id));
      assert.equal(restored.bookings[0].id, bookingId);
      const cancelled = await request(`/api/bookings/${bookingId}`, 'DELETE', undefined, alice);
      assert.equal(cancelled.data.bookings[0].status, 'cancelled');
      assert.equal((await request(`/api/bookings/${bookingId}`, 'DELETE', undefined, alice)).data.bookings.length, 1);
      const oldCookie = alice;
      assert.equal((await request('/api/logout', 'POST', {}, alice)).data.user, null);
      assert.equal((await request('/api/session', 'GET', undefined, oldCookie)).data.user, null);
      assert.equal((await request('/api/favorites', 'PUT', { destinationId: sample.id, saved: false }, oldCookie)).status, 401);
      const login = await request('/api/login', 'POST', { email: 'alice@example.com', password: 'secure-alice-pass' });
      assert.equal(login.status, 200);
      assert.notEqual(login.cookie, oldCookie);
      alice = login.cookie;
      assert.equal(login.data.bookings[0].status, 'cancelled');
      assert.deepEqual((await request('/api/favorites', 'PUT', { destinationId: sample.id, saved: false }, alice)).data.favorites.includes(sample.id), false);
    });
  } finally {
    await stop();
    await rm(folder, { recursive: true, force: true });
  }
});

test('storage cannot be placed in the public web folder', async () => {
  await assert.rejects(createApp({ dataFile: fileURLToPath(new URL('../server/account-data.json', import.meta.url)) }), /outside the public/);
});

test('sessions expire after seven days and repeated failed logins are throttled', async () => {
  const folder = await mkdtemp(join(tmpdir(), 'vacasia-auth-'));
  let timestamp = fixedNow;
  const server = await createApp({ dataFile: join(folder, 'private.json'), now: () => timestamp });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  async function post(path, input) {
    return fetch(base + path, { method: 'POST', headers: { Origin: base, 'Content-Type': 'application/json' }, body: JSON.stringify(input) });
  }
  try {
    const registration = await post('/api/register', { name: 'Expiry Test', email: 'expiry@example.com', password: 'secret-expiry-pass' });
    assert.equal(registration.status, 201);
    const cookie = registration.headers.get('set-cookie').split(';')[0];
    const current = await fetch(base + '/api/session', { headers: { Cookie: cookie } });
    assert.equal((await current.json()).user.email, 'expiry@example.com');
    timestamp += 7 * 24 * 60 * 60 * 1000 + 1;
    const expired = await fetch(base + '/api/session', { headers: { Cookie: cookie } });
    assert.equal((await expired.json()).user, null);
    for (let attempt = 0; attempt < 20; attempt++) {
      const failed = await post('/api/login', { email: 'expiry@example.com', password: 'wrong-password' });
      assert.equal(failed.status, 401);
    }
    const throttled = await post('/api/login', { email: 'expiry@example.com', password: 'secret-expiry-pass' });
    assert.equal(throttled.status, 429);
    assert.equal((await throttled.json()).code, 'rate_limited');
    timestamp += 15 * 60 * 1000 + 1;
    const recovered = await post('/api/login', { email: 'expiry@example.com', password: 'secret-expiry-pass' });
    assert.equal(recovered.status, 200);
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
    await rm(folder, { recursive: true, force: true });
  }
});
