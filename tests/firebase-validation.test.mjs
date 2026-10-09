import test from 'node:test';
import assert from 'node:assert/strict';
import { firebaseApi } from '../server/firebaseAdapter.js';
import { siteConfig } from '../server/siteConfig.js';
import { destinations } from '../server/data.js';
import { readFile } from 'node:fs/promises';

// Only malformed requests are exercised. They reject before loading any HTTPS SDK
// module, so these tests never authenticate or write to the real Firebase project.
test('Firebase adapter rejects malformed requests before any SDK or network access', async t => {
  const future = new Date();
  future.setUTCDate(future.getUTCDate() + 14);
  const booking = { destinationId: destinations[0].id, date: future.toISOString().slice(0, 10), adults: 2, children: 1, notes: '' };
  const preferences = { budget: 90, days: 7, group: 'friends', month: 6, interests: ['culture', 'food'] };
  const cases = [
    ['registration name', '/api/register', { name: 'A', email: 'a@example.com', password: 'password123' }, 'POST', 'invalid_input'],
    ['registration email', '/api/register', { name: 'Traveler', email: 'not-email', password: 'password123' }, 'POST', 'invalid_input'],
    ['short password', '/api/login', { email: 'a@example.com', password: 'short' }, 'POST', 'invalid_input'],
    ['long password', '/api/login', { email: 'a@example.com', password: 'x'.repeat(129) }, 'POST', 'invalid_input'],
    ['profile controls', '/api/profile', { name: 'User\u0000Name' }, 'POST', 'invalid_input'],
    ['unknown favorite', '/api/favorites', { destinationId: 'missing', saved: true }, 'PUT', 'invalid_destination'],
    ['favorite boolean', '/api/favorites', { destinationId: destinations[0].id, saved: 'true' }, 'PUT', 'invalid_input'],
    ['budget bounds', '/api/preferences', { ...preferences, budget: 0 }, 'PUT', 'invalid_input'],
    ['nonfinite budget', '/api/preferences', { ...preferences, budget: NaN }, 'PUT', 'invalid_input'],
    ['day bounds', '/api/preferences', { ...preferences, days: 31 }, 'PUT', 'invalid_input'],
    ['unknown group', '/api/preferences', { ...preferences, group: 'all' }, 'PUT', 'invalid_input'],
    ['month bounds', '/api/preferences', { ...preferences, month: 13 }, 'PUT', 'invalid_input'],
    ['unknown interest', '/api/preferences', { ...preferences, interests: ['unknown'] }, 'PUT', 'invalid_input'],
    ['unknown booking destination', '/api/bookings', { ...booking, destinationId: 'missing' }, 'POST', 'invalid_destination'],
    ['impossible date', '/api/bookings', { ...booking, date: '2026-02-30' }, 'POST', 'invalid_date'],
    ['past date', '/api/bookings', { ...booking, date: '2000-01-01' }, 'POST', 'invalid_date'],
    ['date beyond two years', '/api/bookings', { ...booking, date: '2099-01-01' }, 'POST', 'invalid_date'],
    ['no adults', '/api/bookings', { ...booking, adults: 0 }, 'POST', 'invalid_quantity'],
    ['noninteger children', '/api/bookings', { ...booking, children: 1.5 }, 'POST', 'invalid_quantity'],
    ['string quantity', '/api/bookings', { ...booking, adults: '2' }, 'POST', 'invalid_quantity'],
    ['too many travelers', '/api/bookings', { ...booking, adults: 12, children: 12 }, 'POST', 'invalid_quantity'],
    ['oversized notes', '/api/bookings', { ...booking, notes: 'x'.repeat(501) }, 'POST', 'invalid_input'],
    ['array input', '/api/register', [], 'POST', 'invalid_input'],
    ['unknown endpoint', '/api/missing', {}, 'POST', 'not_found'],
    ['invalid booking id', '/api/bookings/../../other', undefined, 'DELETE', 'not_found']
  ];
  for (const [label, path, input, method, code] of cases) await t.test(label, async () => {
    await assert.rejects(firebaseApi(path, input, method), error => error.code === code && typeof error.error === 'string');
  });
});

test('public Firebase configuration and trusted rule prices match the delivered catalog', async () => {
  assert.equal(siteConfig.backend, 'auto');
  assert.equal(siteConfig.firebase.projectId, 'vacasia-27c13');
  const rules = await readFile(new URL('../firestore.rules', import.meta.url), 'utf8');
  for (const destination of destinations) {
    const escapedId = destination.id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = rules.match(new RegExp(`'${escapedId}'\\s*:\\s*(\\d+)`));
    assert.ok(match, `Missing trusted price for ${destination.id}`);
    assert.equal(Number(match[1]), Math.round(destination.ticketPrice * 100), destination.id);
  }
  assert.match(rules, /request\.auth\.uid == uid/);
  assert.match(rules, /totalCents == adultCents/);
});
