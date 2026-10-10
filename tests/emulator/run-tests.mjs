import { fileURLToPath } from 'node:url';
process.env.VACASIA_FIREBASE_TEST_ROOT ||= fileURLToPath(new URL('.', import.meta.url));
await import('../firestore-rules.test.mjs');
await import('../firestore-adapter.test.mjs');
