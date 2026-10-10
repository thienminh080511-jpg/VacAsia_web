# Publish VacAsia with Firebase accounts and Firestore

The website uses `backend: 'firebase'` in `server/siteConfig.js`. Both static
hosting and the included Node preview use the Firebase account service in that
mode. [FIREBASE_STATUS.md](FIREBASE_STATUS.md) records what has actually been
configured and deployed; these instructions also cover steps that may remain.

## Confirm the active project

Read the public web-app configuration in `server/siteConfig.js` and confirm
that every Firebase field belongs to the intended project. Obtain that config
from **Firebase Console → Project settings → Your apps → Web app**. Keep
`backend: 'firebase'`. Do not add the old `firebaseConfig.js` script to the
updated HTML; the adapter initializes the SDK itself.

The public web config identifies the app. Authentication and deployed rules
control access to data. It is not a service-account credential; do not place
service-account keys, access tokens or account passwords in website files.
See [Firebase web configuration](https://firebase.google.com/docs/projects/learn-more#config-files-objects).

## Enable Authentication and Firestore

In the active Firebase project:

1. Open **Authentication → Sign-in method** and enable **Email/Password**.
2. Enable **Google** and select the project's support email when requested.
3. In **Authentication → Settings → Authorized domains**, add the actual
   website hostname. Add `localhost` separately for local Firebase preview.
   Hostnames do not include a protocol, path or port.
4. Confirm the default Cloud Firestore database exists and record its edition
   and region in `FIREBASE_STATUS.md`. This app uses Firebase document operations
   and Security Rules, not Firestore's MongoDB-compatible interface.
5. Publish the reviewed `firestore.rules` to that same project.

The Google account used to administer Firebase is separate from visitors'
Google sign-in. A Google admin login does not automatically enable password
sign-in or create the Firestore database. See
[Firebase Google authentication](https://firebase.google.com/docs/auth/web/google-signin).

The app prefers Google popup sign-in. A blocked popup falls back to redirect
only when the site's origin matches the configured `authDomain`; on other
hosts, the app asks the visitor to allow popups and retry. A cancelled popup
does not trigger a redirect. If setting up same-origin redirect on a custom
host, follow [Firebase's redirect guidance](https://firebase.google.com/docs/auth/web/redirect-best-practices),
including the auth helper/proxy and authorized OAuth redirect URI requirements.

## Upload to an existing static host

1. Back up the current website and any existing Firestore rules.
2. Upload **the contents of `server/`** to the directory hosting VacAsia.
   It works at a domain root or in a subfolder such as `/vacasia/`.
3. Keep all supplied HTML pages, `app.js`, `style.css`, `fonts.css`, `data.js`,
   `i18n.js`, `siteConfig.js`, `firebaseAdapter.js` and `assets/` together.
   Physical HTML files preserve the original URLs, so no SPA rewrite is needed.
4. Serve JavaScript with a JavaScript MIME type and use HTTPS. Authorize this
   host for Firebase Google sign-in as described above.

Uploading to an existing host changes the site's files; it does not publish
Firestore rules or enable Authentication providers. Complete both parts.

## Deploy with Firebase Hosting

`firebase.json` already serves `server/` and points to `firestore.rules`.
From the project folder, authenticate the Firebase CLI with the Google account
that administers the chosen project. Then explicitly use the project ID in the
current site configuration; do not rely on a previous CLI default project.

For PowerShell:

```powershell
npx firebase-tools@15.33.0 login
$vacasiaProject = node --input-type=module -e "import { siteConfig } from './server/siteConfig.js'; process.stdout.write(siteConfig.firebase.projectId)"
npx firebase-tools@15.33.0 projects:list
npx firebase-tools@15.33.0 deploy --only firestore:rules,hosting --project "$vacasiaProject"
```

Check that `projects:list` includes the selected ID before deploying. The deploy
command publishes both rules and website files to that project. It does not
enable providers or create the database. See
[Firebase Hosting deployment](https://firebase.google.com/docs/hosting/quickstart).

## Saved-data model and rules

```text
vacasiaProfiles/{FirebaseAuthUid}
  name, email, favorites, preferences, createdAt, updatedAt

vacasiaProfiles/{FirebaseAuthUid}/bookings/{bookingId}
  destinationId, date, visitAt, adults, children, totalCents,
  status, createdAt, notes
```

The rules permit each signed-in account to access only its own feature data.
They validate allowed fields, name limits, destination IDs, preferences,
quantities, notes and timestamps. Demo booking totals are checked against a
trusted price table; cancellation can change only the status.

For a new project containing only this app, the complete rules file denies
all other collections. In a shared existing project, replacing the complete
rules also denies legacy clients access to `/users` and other collections.
Preserve necessary reviewed legacy collection rules when integrating this file.
The feature code does not automatically migrate old profiles or bookings.

Review overlapping permissions: Firestore combines matching `allow` conditions
with OR. A broad legacy wildcard grant can bypass the feature's owner checks;
a matching deny cannot override it. See
[Firestore rule conditions](https://firebase.google.com/docs/firestore/security/rules-conditions).

When changing destination IDs or `ticketPrice` in `server/data.js`, update
`destinationIds` and `adultCents` in `firestore.rules` and publish both together.
Rules independently tie the displayed visit date to its timestamp, enforce
Bangkok's day boundary and cap visits at two calendar years ahead.

## Content Security Policy

The included Node preview permits Firebase's SDK and endpoints automatically
when Firebase mode is selected. If your static host supplies its own CSP,
keep `'self'` and allow these origins in the relevant directives:

| Directive | Additional origins |
| --- | --- |
| `script-src` | `https://www.gstatic.com`, `https://apis.google.com` |
| `connect-src` | `https://identitytoolkit.googleapis.com`, `https://securetoken.googleapis.com`, `https://firestore.googleapis.com`, `https://www.gstatic.com`, the HTTPS origin of `siteConfig.firebase.authDomain` |
| `frame-src` | The HTTPS origin of `siteConfig.firebase.authDomain` |

Use the actual configured auth domain, rather than a blanket wildcard. The
destination images and delivered fonts are bundled local assets.

## Verify after publishing

1. Create a test email/password account and confirm a Firestore profile appears.
2. Sign out, sign in with **Continue with Google**, and confirm the profile uses
   the signed-in account's UID.
3. Save a destination and travel preferences; reload and sign in again to
   confirm persistence.
4. Make and cancel a demo reservation; confirm history and totals.
5. Confirm a different account cannot read or modify the first account's data.
6. Switch between English and Vietnamese and check account/error feedback.

The real local emulator suite already passed 20 tests; setup and captured output
are in [tests/emulator/README.md](tests/emulator/README.md). The emulator tests
use Firebase JS 13.0.0 while the website retains pinned 9.22.0 imports. The
browser preview loaded the pinned SDK without script/CSP errors. The latest
live-project verification is separately recorded in
[FIREBASE_STATUS.md](FIREBASE_STATUS.md).

If Auth succeeds but Firestore fails, the site keeps the account signed in,
shows the specific cloud warning and offers **Retry sync**. Finish database/rule
configuration and retry; re-registering the email is unnecessary. Cloud actions
remain pending until data access succeeds.

Ticket confirmations remain demo reservations. Real purchases require a ticket
operator and payment integration.
