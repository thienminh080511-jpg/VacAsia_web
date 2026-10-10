# Firebase setup and verification status

Last checked: **October 10, 2026 (Asia/Bangkok)**.

The source-code integration is implemented and locally verified. Cloud resource
creation and production deployment must be distinguished from that verification.

## Current configuration

| Item | Verified state |
| --- | --- |
| Website account backend | Explicit `backend: 'firebase'` in `server/siteConfig.js` |
| Active web-app configuration | Currently the original `vacasia-27c13` project; `server/siteConfig.js` is the source of truth |
| Requested new project | The user selected a new Firebase project named VacAsia under their Google account |
| New project creation | Pending Google/Firebase authorization; no new project creation confirmed yet |
| New project's Email/Password provider | Not yet confirmed |
| New project's Google provider | Not yet confirmed |
| New Firestore database, edition and region | Not yet created or confirmed |
| Production rules and website deployment | No successful deployment of this update confirmed yet |

The original project's public Authentication response reported
`PASSWORD_LOGIN_DISABLED` for email/password and advertised Google as enabled.
Administrative access to that project was unavailable under the supplied Google
account. Its existing Hosting URL is
[vacasia-27c13.web.app](https://vacasia-27c13.web.app).
These checks do not establish that the new project or this update is live.

The Firebase Console's new-project flow returned an API lookup error. The
official Firebase CLI authorization route is being used instead. Once the new
project is created, replace the full public config in `server/siteConfig.js`,
enable both providers, create Firestore, deploy the rules/site and update the
table above with the actual ID, edition, region and verified URL.

## Completed source changes

- Firebase is selected explicitly instead of depending on automatic backend
  detection on a static host.
- Email/password and Google sign-in share the same Firestore profile flow.
- Existing Firebase accounts receive missing feature profiles on sign-in.
- Successful Auth signup remains successful if Firestore fails afterward;
  cloud warnings retain the signed-in session and provide retry.
- Errors identify disabled providers, unauthorized domains, cancelled/blocked
  popups, network failures and database permission/setup failures separately.
- Saved places, preferences and demo reservations use user-owned Firestore
  documents and transactions.
- The local preview's CSP allows the pinned Firebase browser SDK and endpoints.
- Persistent Auth notifications follow account changes in other tabs. UID and request-generation checks reject stale responses; signing out clears private reservation confirmations and drafts.

## Verification evidence

| Check | Result and scope |
| --- | --- |
| Local API and injected SDK tests | 79 passing checks, including signup recovery, Google behavior and delayed account changes |
| Isolated browser scenarios | 16 passing scenarios covering English/Vietnamese auth, cloud recovery, subfolder hosting, mobile layout and account-switching privacy |
| Browser SDK load | Firebase JS 9.22.0 modules loaded successfully in the real browser preview; no script or CSP errors observed |
| Security-rule compilation | Passed in Cloud Firestore emulator 1.22.0, Standard edition |
| Security-rule behavior | 17 passing tests covering password/Google tokens, owner isolation, schemas, favorites/preferences, all 12 catalog totals, visit dates and cancellation |
| Adapter with actual local SDK services | 3 passing Auth/Firestore integration tests covering email signup/login, Google-provider profiles, profile recovery and persisted travel data |
| Total emulator result | **20 passed, 0 failed**, across 2 suites |
| Live Google OAuth popup | Successful completed production flow not yet confirmed |
| Live Firestore persistence | Not yet confirmed in the requested new project |

The emulator suite uses Firebase JS 13.0.0 and Firebase CLI 15.33.0. The website
retains its original Firebase JS 9.22.0 CDN imports. Google emulator tests use a
documented local test credential in place of popup UI; no real Google token or
production account is used. Emulator tests prove local rules/adapter behavior,
not the live project's provider, database or deployment configuration.

Reproduction instructions are in
[tests/emulator/README.md](tests/emulator/README.md), with
[the captured test run](tests/emulator/validation.log). Publishing instructions
are in [HOSTING.md](HOSTING.md).
