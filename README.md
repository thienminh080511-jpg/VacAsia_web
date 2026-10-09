# VacAsia

VacAsia is a redesigned Asia travel website with English as its default language and an **EN / VI** switch that translates the interface and destination content into Vietnamese. It runs with Node.js 20 or newer and has no npm package dependencies.

## Run locally

To update an existing hosted website, see **HOSTING.md**. The `server/` folder contains the site files, including physical copies of the original page URLs and an optional adapter for the Firebase project configured in the original upload. The local Node service below is included for running and testing the features without cloud setup.

Open a terminal in this folder and run:

```sh
npm start
```

Or run `node server.mjs` directly. Open **http://127.0.0.1:4173** in a browser. Keep the terminal running while using the site. Opening the HTML file directly does not start the account or booking service.

If `npm` is unavailable but Node.js is installed, `node server.mjs` works without installing anything. To verify the API, run `npm test` or `node --test` from this folder.

On Windows PowerShell, you can use a different port:

```powershell
$env:PORT = '4174'
node server.mjs
```

`HOST` defaults to `127.0.0.1`. `VACASIA_DATA_FILE` can set an alternate absolute storage file path, useful for an isolated demo or test. Storage must stay outside the public `server/` folder.

## Features

- Discover Asian destinations with search, country and category filters, sorting, and budget preferences.
- Enter travel needs: daily budget, trip length, travel group, month, and interests. View destination recommendations that explain their match.
- Read destination details, highlights, seasonal advice, local food, estimated daily costs, and ticket information.
- Create an account, sign in, update your name, and save favorite destinations.
- Compare destinations and keep a personal list of places to visit.
- Reserve **demo tickets** with a visit date, adult and child quantities, a server-calculated total, and optional notes. View ticket history, download a demo confirmation, and cancel a reservation.
- Switch between English and Vietnamese. Your language choice is remembered in your browser.
- Responsive layouts, a persistent light/dark mode switch, keyboard navigation, accessible forms, empty states, and localized validation feedback.

## Accounts and storage

Create a new account from the sign-in button; no starter password or shared demo account is supplied. Passwords must contain 8–128 characters. Passwords are salted and hashed with Node's scrypt; plaintext passwords are never saved. Browser sessions use opaque HttpOnly, SameSite cookies and expire after seven days. Mutation requests reject cross-site origins. API input and ticket prices are validated on the server.

Accounts, favorite places, preferences, bookings and hashed session tokens are stored in `storage/vacasia.json`. The server creates this file on the first account change. Writes are serialized and saved through an atomic file replacement. This folder is not served to browsers. Data survives server restarts; back up the storage file if you want to preserve it. The provided automated tests use a separate temporary storage file and do not modify your accounts.

Travel dates use **Asia/Bangkok** time. Bookings accept today through the next two years, 1–12 adults and 0–12 children, up to 20 travelers. Child tickets cost 60% of the adult demo price, rounded to cents. Daily budget is in USD per person; travel estimates and demo ticket prices are illustrative.

## Demo tickets and deployment

This project demonstrates a ticket purchase flow. **It does not sell valid tickets, process payments, collect card information, or connect to live operator inventory.** Confirmations are labeled as demo reservations. Use the linked official destination websites for real availability, entry conditions, and tickets.

The included JSON storage is intended for a local project or single-process demonstration. Before a public production launch, use HTTPS and Secure session cookies, a production database, backups, verified email and password recovery, operational monitoring, deployment-specific request limits, current travel and pricing data, and a real ticket operator/payment integration. The bundled server binds to localhost by default. All destination photos and fonts are bundled locally. Map and official tourism links open external websites.

## Project layout

```text
server.mjs          Local HTTP server, accounts and booking API
server/index.html   Application shell
server/app.js       Search, recommendations, details and account UI
server/style.css    Responsive design
server/i18n.js      English and Vietnamese interface translations
server/data.js      Bilingual destination catalog
server/siteConfig.js Backend mode and original Firebase project configuration
server/firebaseAdapter.js Optional Firebase account and booking integration
server/assets/      Local imagery
tests/api.test.mjs  Real HTTP API and persistence tests
firestore.rules     Account isolation and demo booking validation for Firebase
HOSTING.md          Updating an existing hosted website
storage/            Private runtime data (created automatically)
```

The original page URLs (including `VAmain.html`, `search.html`, `favorites.html`, `destination.html`, `booking.html`, `history.html`, `transaction.html`, `profile.html`, `login.html`, and `register.html`) remain available through the application shell.
