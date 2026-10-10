# Auth and Firestore emulator tests

Requirements: Node 20 or newer, Java 21 or newer, npm, and internet access for
the initial tooling/emulator download. These development tools are separate
from the website; there are no runtime npm dependencies for static hosting.

From this directory:

```shell
npm install
npm test
```

The runner uses `demo-vacasia-rules`, loads the project's real `firestore.rules`,
and binds emulators only to `127.0.0.1`. It never uses a production database.
Ordinary `npm test` in the project root skips emulator tests.

Rule tests cover profile/favorite/preference validation, password and Google
provider tokens, user isolation, booking totals/dates and cancellation.
Adapter integration tests use actual local Authentication and Firestore SDK
operations. Google uses an emulator-only test credential in place of browser
popup UI; a real Google OAuth popup must also be tested on an authorized domain.

All 20 emulator tests passed on October 10, 2026: 17 rules tests and 3 adapter
integration tests. See `validation.log` for the captured run.

The verified emulator tooling uses Firebase JS 13.0.0. The website retains its
original Firebase JS 9.22.0 CDN imports. Security rules and storage schemas are
SDK-independent; browser authentication behavior still requires browser checks.

If Java on Windows reports `Unable to establish loopback connection` with an
Unix-domain socket `Invalid argument: connect`, use this process-scoped fallback
before running `npm test` in the same PowerShell session:

```powershell
$env:JAVA_TOOL_OPTIONS = '-Djava.net.preferIPv4Stack=true -Djdk.net.unixdomain.tmpdir=C:/vacasia-emulator-unix-fallback-missing'
npm test
```

That path must not exist. Java then falls back to a local TCP pipe. It does not
change installed Java or global system settings.
