import http from 'node:http';
import { readFile, writeFile, mkdir, rename, stat, unlink } from 'node:fs/promises';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { destinations } from './server/data.js';

const scrypt = promisify(scryptCallback);
const root = dirname(fileURLToPath(import.meta.url));
const publicRoot = resolve(root, 'server');
const SESSION_AGE = 7 * 24 * 60 * 60 * 1000;
const INTERESTS = new Set(['culture', 'beach', 'city', 'nature', 'adventure', 'food', 'family', 'wellness']);
const GROUPS = new Set(['solo', 'couple', 'family', 'friends']);
const ALIASES = new Set(['index', 'VAmain', 'search', 'plan', 'favorites', 'destination', 'booking', 'history', 'tickets', 'transaction', 'login', 'register', 'profile', 'contact', 'about']);
const CONTENT_TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };

class ApiError extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.code = code; }
}
const bad = (code, message, status = 400) => { throw new ApiError(status, code, message); };
const publicUser = user => user ? { id: user.id, name: user.name, email: user.email } : null;
const tokenHash = token => createHash('sha256').update(token).digest('hex');
const emailValue = value => typeof value === 'string' ? value.trim().toLowerCase() : '';
function nameValue(value) {
  if (typeof value !== 'string') bad('invalid_input', 'Enter a name between 2 and 60 characters.');
  const name = value.trim().replace(/\s+/g, ' ');
  if (name.length < 2 || name.length > 60 || /[\x00-\x1f\x7f]/.test(name)) bad('invalid_input', 'Enter a name between 2 and 60 characters.');
  return name;
}
function validateEmail(value) {
  const email = emailValue(value);
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) bad('invalid_input', 'Enter a valid email address.');
  return email;
}
function validatePassword(value) {
  if (typeof value !== 'string' || value.length < 8 || value.length > 128) bad('invalid_input', 'Use a password between 8 and 128 characters.');
  return value;
}
function cookieToken(req) {
  const cookie = (req.headers.cookie ?? '').split(';').map(value => value.trim()).find(value => value.startsWith('vacasia_session='));
  const token = cookie?.slice('vacasia_session='.length) ?? '';
  return /^[a-f0-9]{64}$/.test(token) ? token : null;
}
function setSessionCookie(res, token, secure = false) {
  res.setHeader('Set-Cookie', `vacasia_session=${token ?? ''}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${token ? SESSION_AGE / 1000 : 0}${secure ? '; Secure' : ''}`);
}
async function passwordHash(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = await scrypt(password, salt, 64);
  return { salt, hash: hash.toString('hex') };
}
async function checkPassword(password, user) {
  const salt = user?.password?.salt ?? '0'.repeat(32);
  const expected = user?.password?.hash ?? '0'.repeat(128);
  const actual = await scrypt(password, salt, 64);
  const encoded = Buffer.from(expected, 'hex');
  return encoded.length === actual.length && timingSafeEqual(encoded, actual) && Boolean(user);
}
function bangkokToday(timestamp) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(timestamp));
}
function validDate(value, timestamp) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) bad('invalid_date', 'Choose a valid visit date.');
  const date = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) bad('invalid_date', 'Choose a valid visit date.');
  const today = bangkokToday(timestamp);
  const limit = new Date(`${today}T00:00:00Z`);
  limit.setUTCFullYear(limit.getUTCFullYear() + 2);
  if (value < today || value > limit.toISOString().slice(0, 10)) bad('invalid_date', 'Choose today or a date within the next two years.');
  return value;
}
function json(res, status, data) {
  const payload = JSON.stringify(data);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(payload), 'Cache-Control': 'no-store' });
  res.end(payload);
}
async function body(req) {
  if (!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type'] ?? '')) bad('invalid_input', 'Send a JSON request body.', 415);
  if (Number(req.headers['content-length'] ?? 0) > 32768) bad('invalid_input', 'The request is too large.', 413);
  req.setEncoding('utf8'); // Preserve Vietnamese code points across network chunks.
  let data = '';
  let bytes = 0;
  for await (const chunk of req) {
    data += chunk;
    bytes += Buffer.byteLength(chunk);
    if (bytes > 32768) bad('invalid_input', 'The request is too large.', 413);
  }
  let parsed;
  try { parsed = JSON.parse(data || '{}'); } catch { bad('invalid_input', 'Send valid JSON.'); }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) bad('invalid_input', 'Send a JSON object.');
  return parsed;
}

/** Create a server with an isolated storage file; useful for tests and local demos. */
export async function createApp(options = {}) {
  const dataFile = resolve(options.dataFile ?? process.env.VACASIA_DATA_FILE ?? resolve(root, 'storage', 'vacasia.json'));
  const normalizePath = path => process.platform === 'win32' ? path.toLowerCase() : path;
  if (normalizePath(dataFile) === normalizePath(publicRoot) || normalizePath(dataFile).startsWith(normalizePath(publicRoot + sep))) throw new Error('VACASIA_DATA_FILE must be outside the public server directory.');
  const now = options.now ?? Date.now;
  let db = { version: 1, users: [], sessions: [] };
  try {
    db = JSON.parse(await readFile(dataFile, 'utf8'));
    if (db.version !== 1 || !Array.isArray(db.users) || !Array.isArray(db.sessions)) throw new Error('Unsupported or invalid VacAsia storage format.');
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  let writes = Promise.resolve();
  const attempts = new Map();
  const registerAttempts = new Map();
  async function mutate(change) {
    const operation = writes.then(async () => {
      const next = structuredClone(db);
      next.sessions = next.sessions.filter(session => session.expiresAt > now());
      const result = change(next);
      await mkdir(dirname(dataFile), { recursive: true });
      const temp = `${dataFile}.${randomUUID()}.tmp`;
      try {
        await writeFile(temp, JSON.stringify(next, null, 2), { mode: 0o600 });
        await rename(temp, dataFile);
      } catch (error) { await unlink(temp).catch(() => {}); throw error; }
      db = next;
      return result;
    });
    writes = operation.catch(() => {});
    return operation;
  }
  function userFor(req, data = db) {
    const token = cookieToken(req);
    if (!token) return null;
    const session = data.sessions.find(item => item.tokenHash === tokenHash(token) && item.expiresAt > now());
    return session ? data.users.find(user => user.id === session.userId) ?? null : null;
  }
  function requireUser(req, data = db) {
    const user = userFor(req, data);
    if (!user) bad('auth_required', 'Sign in to continue.', 401);
    return user;
  }
  function sessionShape(user) {
    return { user: publicUser(user), favorites: user?.favorites ?? [], bookings: user?.bookings ?? [], preferences: user?.preferences ?? null };
  }
  function addSession(next, userId) {
    const token = randomBytes(32).toString('hex');
    next.sessions.push({ tokenHash: tokenHash(token), userId, expiresAt: now() + SESSION_AGE });
    return token;
  }
  function rateLimit(map, key, count) {
    const timestamp = now();
    if (map.size > 10000) for (const [id, item] of map) if (item.expiresAt <= timestamp) map.delete(id);
    const item = map.get(key);
    if (item && item.expiresAt > timestamp && item.count >= count) bad('rate_limited', 'Too many attempts. Try again in 15 minutes.', 429);
    const updated = item && item.expiresAt > timestamp ? item : { count: 0, expiresAt: timestamp + 15 * 60 * 1000 };
    updated.count++;
    map.set(key, updated);
  }
  const server = http.createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' https: data:; connect-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'");
    try {
      const requestUrl = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`);
      const path = requestUrl.pathname;
      if (path.startsWith('/api/')) {
        if (!['GET', 'HEAD'].includes(req.method)) {
          const origin = req.headers.origin;
          const expectedOrigin = `${options.secureCookies ? 'https' : 'http'}://${req.headers.host}`;
          if ((origin && origin !== expectedOrigin) || req.headers['sec-fetch-site'] === 'cross-site') bad('invalid_input', 'This request is not allowed from another website.', 403);
        }
        if (req.method === 'GET' && path === '/api/health') return json(res, 200, { ok: true, mode: 'demo', destinationCount: destinations.length });
        if (req.method === 'GET' && path === '/api/session') return json(res, 200, sessionShape(userFor(req)));
        if (req.method === 'POST' && path === '/api/register') {
          rateLimit(registerAttempts, req.socket.remoteAddress, 20);
          const input = await body(req);
          const name = nameValue(input.name);
          const email = validateEmail(input.email);
          const password = await passwordHash(validatePassword(input.password));
          const result = await mutate(next => {
            if (next.users.some(user => user.email === email)) bad('email_exists', 'An account already uses this email.', 409);
            const user = { id: randomUUID(), name, email, password, favorites: [], bookings: [], preferences: null, createdAt: new Date(now()).toISOString() };
            next.users.push(user);
            return { session: sessionShape(user), token: addSession(next, user.id) };
          });
          setSessionCookie(res, result.token, options.secureCookies);
          return json(res, 201, result.session);
        }
        if (req.method === 'POST' && path === '/api/login') {
          const input = await body(req);
          const email = validateEmail(input.email);
          const password = validatePassword(input.password);
          const attemptKey = `${req.socket.remoteAddress}:${email}`;
          rateLimit(attempts, attemptKey, 20);
          const user = db.users.find(item => item.email === email);
          if (!await checkPassword(password, user)) bad('invalid_credentials', 'The email or password is incorrect.', 401);
          const result = await mutate(next => {
            const current = next.users.find(item => item.id === user.id);
            const oldToken = cookieToken(req);
            if (oldToken) next.sessions = next.sessions.filter(item => item.tokenHash !== tokenHash(oldToken));
            return { session: sessionShape(current), token: addSession(next, user.id) };
          });
          attempts.delete(attemptKey);
          setSessionCookie(res, result.token, options.secureCookies);
          return json(res, 200, result.session);
        }
        if (req.method === 'POST' && path === '/api/logout') {
          await body(req);
          const token = cookieToken(req);
          if (token) await mutate(next => { next.sessions = next.sessions.filter(item => item.tokenHash !== tokenHash(token)); });
          setSessionCookie(res, null, options.secureCookies);
          return json(res, 200, sessionShape(null));
        }
        if (req.method === 'PUT' && path === '/api/favorites') {
          requireUser(req);
          const input = await body(req);
          if (!destinations.some(item => item.id === input.destinationId)) bad('invalid_destination', 'Choose an available destination.');
          if (typeof input.saved !== 'boolean') bad('invalid_input', 'Specify whether this destination should be saved.');
          const result = await mutate(next => {
            const user = requireUser(req, next);
            user.favorites = user.favorites.filter(id => id !== input.destinationId);
            if (input.saved) user.favorites.push(input.destinationId);
            return { favorites: user.favorites };
          });
          return json(res, 200, result);
        }
        if (req.method === 'PUT' && path === '/api/preferences') {
          requireUser(req);
          const input = await body(req);
          if (typeof input.budget !== 'number' || !Number.isFinite(input.budget) || input.budget < 20 || input.budget > 1000 || !Number.isInteger(input.days) || input.days < 1 || input.days > 30 || !GROUPS.has(input.group) || !Number.isInteger(input.month) || input.month < 1 || input.month > 12 || !Array.isArray(input.interests) || input.interests.length > 8 || input.interests.some(item => !INTERESTS.has(item))) bad('invalid_input', 'Enter a valid daily budget, trip length, group, month and interests.');
          const preferences = { budget: Math.round(input.budget * 100) / 100, days: input.days, group: input.group, month: input.month, interests: [...new Set(input.interests)] };
          await mutate(next => { requireUser(req, next).preferences = preferences; });
          return json(res, 200, { preferences });
        }
        if (req.method === 'POST' && path === '/api/profile') {
          requireUser(req);
          const input = await body(req);
          const name = nameValue(input.name);
          const user = await mutate(next => { const user = requireUser(req, next); user.name = name; return publicUser(user); });
          return json(res, 200, { user });
        }
        if (req.method === 'POST' && path === '/api/bookings') {
          requireUser(req);
          const input = await body(req);
          const destination = destinations.find(item => item.id === input.destinationId);
          if (!destination) bad('invalid_destination', 'Choose an available destination.');
          const date = validDate(input.date, now());
          if (!Number.isInteger(input.adults) || input.adults < 1 || input.adults > 12 || !Number.isInteger(input.children) || input.children < 0 || input.children > 12 || input.adults + input.children > 20) bad('invalid_quantity', 'Choose 1–12 adults and 0–12 children, with at most 20 travelers.');
          if (input.notes != null && (typeof input.notes !== 'string' || input.notes.length > 500)) bad('invalid_input', 'Keep visit notes within 500 characters.');
          const adultCents = Math.round(destination.ticketPrice * 100);
          const childCents = Math.round(adultCents * 0.6);
          const booking = { id: `VA-${randomBytes(6).toString('hex').toUpperCase()}`, destinationId: destination.id, date, adults: input.adults, children: input.children, total: (adultCents * input.adults + childCents * input.children) / 100, status: 'demo-confirmed', createdAt: new Date(now()).toISOString(), notes: (input.notes ?? '').trim() };
          const bookings = await mutate(next => { const user = requireUser(req, next); user.bookings.unshift(booking); return user.bookings; });
          return json(res, 201, { booking, bookings });
        }
        if (req.method === 'DELETE' && /^\/api\/bookings\/[^/]+$/.test(path)) {
          requireUser(req);
          const id = decodeURIComponent(path.split('/').pop());
          const bookings = await mutate(next => {
            const user = requireUser(req, next);
            const booking = user.bookings.find(item => item.id === id);
            if (!booking) bad('not_found', 'This booking could not be found.', 404);
            booking.status = 'cancelled';
            return user.bookings;
          });
          return json(res, 200, { bookings });
        }
        return json(res, 404, { error: 'This API endpoint could not be found.', code: 'not_found' });
      }
      if (!['GET', 'HEAD'].includes(req.method)) return json(res, 405, { error: 'This method is not allowed.', code: 'invalid_input' });
      let relative = decodeURIComponent(path);
      if (relative === '/' || ALIASES.has(relative.slice(1).replace(/\.html$/, '')) && /^\/[^/]+(?:\.html)?$/.test(relative)) relative = '/index.html';
      const file = resolve(publicRoot, `.${relative}`);
      if (!file.startsWith(publicRoot + sep) || relative.split('/').some(part => part.startsWith('.')) || !CONTENT_TYPES[extname(file).toLowerCase()]) return json(res, 404, { error: 'This page could not be found.', code: 'not_found' });
      let fileStats;
      try { fileStats = await stat(file); } catch (error) { if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return json(res, 404, { error: 'This page could not be found.', code: 'not_found' }); throw error; }
      if (!fileStats.isFile()) return json(res, 404, { error: 'This page could not be found.', code: 'not_found' });
      const content = await readFile(file);
      res.writeHead(200, { 'Content-Type': CONTENT_TYPES[extname(file).toLowerCase()], 'Content-Length': content.length, 'Cache-Control': 'no-cache' });
      return res.end(req.method === 'HEAD' ? undefined : content);
    } catch (error) {
      if (res.headersSent) return res.end();
      if (!(error instanceof ApiError)) console.error('VacAsia request failed:', error.message);
      return json(res, error.status ?? 500, { error: error instanceof ApiError ? error.message : 'The server could not complete this request. Please try again.', code: error.code && error instanceof ApiError ? error.code : 'server_error' });
    }
  });
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  server.keepAliveTimeout = 5000;
  return server;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT ?? 4173);
  const host = process.env.HOST ?? '127.0.0.1';
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be an integer from 1 to 65535.');
  const server = await createApp();
  server.listen(port, host, () => console.log(`VacAsia is ready at http://${host}:${port} (demo tickets only)`));
  server.on('error', error => { console.error(error.message); process.exitCode = 1; });
}
