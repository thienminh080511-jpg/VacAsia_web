# Add the features to your existing website

The refreshed website can use the original Firebase project on your existing static host. The optional Node server remains useful for local development and runs without npm dependencies. No Firebase settings, remote data, hosting deployment, or existing live files were changed while preparing this project.

## Existing static hosting

1. Back up your currently hosted website and your current Firestore rules.
2. Upload **the contents of `server/`** into the directory where you currently host VacAsia. This works at your domain root or in a subfolder such as `/vacasia/` or `/server/`.
3. Keep `app.js`, `style.css`, `data.js`, `i18n.js`, `siteConfig.js`, `firebaseAdapter.js`, `assets/`, and all supplied HTML pages together. Assets and navigation use relative paths. Physical HTML files preserve the original page URLs, so a static host does not need SPA rewrites.
4. Serve JavaScript files with a JavaScript MIME type and use HTTPS. Do not open the HTML directly with a `file://` URL.

`server/siteConfig.js` preserves the public Firebase web configuration from your original `firebaseConfig.js`, including project **vacasia-27c13**. The default `backend: 'auto'` uses the Node API when it is available and falls back to Firebase when a static host returns HTML or a missing response for `/api/session`. Set `backend: 'firebase'` to explicitly use Firebase on your existing host, or `backend: 'node'` to require the Node API. Do not add the old `firebaseConfig.js` script to these updated HTML pages; the adapter loads the required modules itself.

The adapter uses the same pinned **Firebase 9.22.0** browser SDK version as the original website, with Auth and Firestore only. The public Firebase web configuration is intended for client initialization; access to data depends on Authentication and deployed Firestore rules. See [Firebase web configuration](https://firebase.google.com/docs/projects/learn-more#config-files-objects).

## Enable the existing Firebase project

In the Firebase console for **vacasia-27c13**:

1. Open **Authentication → Sign-in method** and enable **Email/Password** if it is not already enabled.
2. Open **Authentication → Settings → Authorized domains** and add your actual hosting domain if needed. Review localhost authorization separately if you explicitly choose Firebase during local testing.
3. Ensure a Cloud Firestore database exists in the project.
4. Review and publish the supplied `firestore.rules` as described below before using favorites, travel preferences, or demo reservations.
5. Upload the website files through your current hosting workflow. Use your existing Firebase Hosting project if that is where your website lives; no hosting-provider change is required.

Firebase handles account passwords and persisted sign-in state. The site does not save passwords in Firestore. Existing Email/Password Firebase Auth accounts can sign in. New feature data is stored at:

```text
vacasiaProfiles/{FirebaseAuthUid}
  name, email, favorites, preferences, createdAt, updatedAt

vacasiaProfiles/{FirebaseAuthUid}/bookings/{bookingId}
  destinationId, date, visitAt, adults, children, totalCents,
  status, createdAt, notes
```

This namespace leaves the original `/users` data intact. Existing favorites/bookings in a different schema are not automatically imported. A returning account receives an empty feature profile until it saves or changes data. Registration creates the Firebase Auth account before writing its feature profile; if project setup blocks the profile write, finish the setup and sign in with that account instead of registering it again. See [Firebase Email/Password authentication](https://firebase.google.com/docs/auth/web/start).

## Publish restrictive rules carefully

`firestore.rules` allows a signed-in account to read and modify only its own feature profile and demo bookings. It validates allowed fields, names, favorites, preferences, quantities, notes, server creation timestamps, and Bangkok visit dates. Bookings store integer cents; rules independently verify totals against a fixed destination price table. Cancellation may change only the booking status. Browser-calculated totals are not the security boundary.

For a new project containing only this app, the supplied complete rules file denies all other collections by default. **Replacing your existing rules with the complete file will also deny legacy clients access to the original `/users` and other collections.** For an existing project, preserve necessary reviewed legacy rules and add the supplied helper functions and `/vacasiaProfiles/{uid}` match block into the current `match /databases/{database}/documents` block.

**Review overlapping rules before publishing. Firestore combines matching `allow` conditions with OR.** A legacy permissive wildcard such as `match /{document=**} { allow read, write: if true; }` still grants access to `vacasiaProfiles`, even alongside this file's restrictive match or catch-all denial. Remove broad test grants or replace them with explicit legacy collection matches that do not cover `vacasiaProfiles`. A separate deny rule cannot override a matching allow. See [Firestore rule conditions and overlapping matches](https://firebase.google.com/docs/firestore/security/rules-conditions).

If you change `ticketPrice` or destination IDs in `server/data.js`, update the trusted `adultCents` table and `destinationIds` list in `firestore.rules` at the same time and publish the reviewed rules. Child tickets are 60% of the adult demo price, rounded to cents. The adapter's internal `visitAt` timestamp is tied to the displayed date by the rules, using Bangkok's UTC+7 day boundary and the same two-calendar-year limit as the local server.

## Hosts with a Content Security Policy

The local Node server keeps its existing policy. A static host with its own strict CSP must permit Firebase's modules and network endpoints. For this project's Email/Password flow, add these origins to your existing directives as needed:

```text
script-src:  https://www.gstatic.com
connect-src: https://identitytoolkit.googleapis.com
             https://securetoken.googleapis.com
             https://firestore.googleapis.com
frame-src:   https://vacasia-27c13.firebaseapp.com
```

Keep `'self'` in those directives for the site's own files. The delivered fonts and destination images are local assets. Add a different authentication domain to `frame-src` if you change `authDomain`; do not use a blanket wildcard to bypass a CSP failure. Firebase Auth may use its authentication iframe for browser storage and account state.

## Local development and verification

From the project folder, run `node server.mjs`, then open **http://127.0.0.1:4173**. `backend: 'auto'` selects the local service, whose private JSON store is independent of your Firebase data. Run `node --test` for the local API suite and adapter input checks. Tests reject malformed Firebase requests before SDK loading, so they do not authenticate or write to the live Firebase project.

The Node HTTP API was tested with real local requests, account isolation, persistence, Unicode, input validation, and server-calculated prices. **The Firebase adapter and rules were reviewed against official APIs, but live Firebase authentication, deployed Firestore rules, and the hosted integration have not been tested or deployed.** Validate rules and account isolation with the [Firebase Local Emulator Suite](https://firebase.google.com/docs/emulator-suite) or a dedicated test project before publishing them to your live project.

For browser testing of Firebase mode locally, serve `server/` through a static development server or the Firebase Hosting Emulator with the Firebase CSP origins listed above. The bundled Node server is intended for its own local API mode; its restrictive script policy does not load the external Firebase SDK.

Ticket confirmations remain **demo reservations**, with no payment, valid admission ticket, or live operator inventory. A real purchase flow requires a trusted operator/payment integration. Use the destination's official link for actual tickets and availability.
