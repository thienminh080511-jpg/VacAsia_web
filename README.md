# VacAsia

VacAsia is a bilingual Asia travel website. English is the default language;
the **EN / VI** switch translates the interface and destination content into
Vietnamese. The delivered website explicitly uses **Firebase Authentication
and Cloud Firestore** for accounts and saved travel data.

See [FIREBASE_STATUS.md](FIREBASE_STATUS.md) for the current cloud setup and
deployment status, and [HOSTING.md](HOSTING.md) for publishing instructions.
The Firebase project used by the website is defined in `server/siteConfig.js`.

## Account improvements

- Sign up and sign in with email/password, or choose **Continue with Google**.
- Save destinations, travel preferences and demo reservations to your own
  Firestore profile, and retain them when signing in again.
- Recover a missing Firestore profile when an existing Firebase account signs in.
- Keep a successful sign-in when Firestore is unavailable. The site displays a
  specific cloud-sync warning and a **Retry sync** button instead of reporting
  that account creation failed.
- Show separate messages for a disabled sign-in provider, unauthorized domain,
  cancelled Google popup, connection failure and Firestore access failure.

Enabling a sign-in provider and publishing database rules require configuration
in the active Firebase project. Source-code changes alone do not enable those
remote services. The latest verified state is recorded in
[FIREBASE_STATUS.md](FIREBASE_STATUS.md).

## Run a local preview

Install Node.js 20 or newer, open a terminal in this project folder, and run:

```shell
node server.mjs
```

Open **http://127.0.0.1:4173** and keep the terminal running. `npm start` runs
the same command. The preview requires no npm package installation and permits
the Firebase browser SDK in its Content Security Policy. It uses the Firebase
project in `server/siteConfig.js`, including during local preview. Internet
access and any required localhost authorization are necessary for cloud sign-in.

The contents of `server/` can also be uploaded to a static host. Opening HTML
directly with a `file://` URL is not a supported account preview.

For an isolated local demonstration, explicitly change
`server/siteConfig.js` to `backend: 'node'` before starting the server. That
optional mode uses its own private JSON storage and email/password accounts;
Google sign-in belongs to Firebase mode. Local accounts are separate from
Firebase accounts. Restore `backend: 'firebase'` before publishing the cloud site.

## Travel features

- Destination search, country/category filters, sorting, budget preferences and
  destination comparisons.
- Travel planning by budget, trip length, group, month and interests, with
  explained destination recommendations.
- Bilingual destination details, highlights, seasonal advice, local food,
  estimated daily costs, tourism links and map links.
- Saved places, profile-name updates and personal reservation history.
- Demo ticket reservations with visit dates, adult/child quantities, notes,
  calculated totals, downloadable confirmations and cancellation.
- Remembered language and light/dark preferences, responsive layouts,
  accessible forms, keyboard navigation and localized feedback.

## Accounts and saved data

Firebase Authentication manages passwords and persisted sign-in state. Passwords
are never written to Firestore. Account profiles live at
`vacasiaProfiles/{FirebaseAuthUid}`; reservations are in that profile's
`bookings` subcollection. The rules restrict data to its signed-in owner and
validate profile fields, favorites, preferences and reservation details.

The feature namespace does not import data from a former `/users` schema.
Existing Auth accounts receive a feature profile on sign-in if one is missing.
After an Auth-only signup, sign in or retry sync once Firestore is ready;
do not attempt to register the same email again.

Travel dates use **Asia/Bangkok** time. Demo reservations accept today through
the next two calendar years, 1–12 adults and 0–12 children, with at most
20 travelers. Child demo prices are 60% of the adult price, rounded to cents.
Firestore rules independently verify quantities, dates and integer-cent totals.
Travel estimates and prices are illustrative.

**Reservations are demos.** The site does not process payments, issue valid
admission tickets or use live operator inventory. Official destination links
lead to real ticket and availability information.

## Verification

Run the ordinary automated tests from this folder:

```shell
node --test
```

These cover the optional Node API, adapter input checks, account recovery,
specific Firebase error handling and Google popup/redirect behavior. They do
not create live Firebase accounts. Emulator suites skip during this command.

The real local Authentication and Firestore emulators passed **20 tests**:
17 security-rule tests and 3 adapter integration tests. They verify email
registration/login, Google-provider profiles, saved data, profile recovery,
reservations, cancellation and account isolation. See
[tests/emulator/README.md](tests/emulator/README.md) for the separate installation
and run command, and [the captured run](tests/emulator/validation.log).

The website retains **Firebase JS 9.22.0** CDN imports. Emulator tests use
**Firebase JS 13.0.0** with Firebase CLI 15.33.0. The browser preview loaded the
website's pinned SDK successfully without script or CSP errors. Emulator Google
sign-in uses an emulator-only credential in place of popup UI; a successful
live Google OAuth flow and deployed Firestore access are separate checks,
recorded in [FIREBASE_STATUS.md](FIREBASE_STATUS.md).

## Project layout

```text
server/                     Static website, original page URLs and bundled assets
server/siteConfig.js        Explicit backend mode and active public Firebase config
server/firebaseAdapter.js   Firebase Auth and Firestore integration
server.mjs                  Local preview and optional isolated Node API
firestore.rules             Profile isolation and demo reservation validation
firebase.json               Firestore rules and Firebase Hosting configuration
firebase.emulator.json      Loopback-only Auth/Firestore emulator configuration
tests/                      API, adapter and emulator tests
HOSTING.md                  Setup and publishing instructions
FIREBASE_STATUS.md          Verified cloud setup and deployment status
```

The original page URLs, including `VAmain.html`, `search.html`, `favorites.html`,
`destination.html`, `booking.html`, `history.html`, `transaction.html`,
`profile.html`, `login.html` and `register.html`, remain available.
