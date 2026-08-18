# RbxDraco — Premium Roblox Dragon Companion

RbxDraco opens both through the Node backend and as a local/static simulation when Firebase or any backend is unavailable. It is a compact full-stack foundation for a premium Roblox companion site: a separated Node backend plus a standalone frontend SPA. The game economy uses **Draco Ember** as its scarce progression currency; dragons and eggs are independent persisted inventories, and dragons are unlocked only through the backend forge/progression system.

## File layout

- `server.js` — backend API, auth, persistence, secure economy validation, Robux withdrawal workflow, admin APIs, static hosting.
- `index.html` — root shell so the site opens on simple static hosts/file preview.
- `frontend/index.html` — frontend HTML shell used by the separated frontend app.
- `frontend/main.js` — frontend dashboard, Google continue simulation, collections, withdrawal GUI, transaction ledger, admin panel, local fallback simulation.
- `frontend/style.css` — AAA dark-fantasy/glass UI, responsive layout, glow/particle polish.
- `README.md` — Render deployment notes and Firestore rules reference.

## Local run

```bash
node server.js
```

Open `http://localhost:3000`. If you open `index.html` directly without Node/Firebase, the app automatically switches to local simulation mode so the UI still works.

## Render.com deployment

Create a Render Web Service from this repository:

- Build Command: leave empty or use `echo no-build-needed`
- Start Command: `node server.js`
- Runtime: Node
- Required environment variables:
  - `APP_URL=https://your-render-service.onrender.com`
  - `ADMIN_TOKEN` or stronger `ADMIN_TOKEN_HASH` (`sha256(token)`)
  - `GAMEPASS_SECRET` — server-only verifier secret; replace local verifier with Roblox Open Cloud in production.
  - Optional `DB_FILE=/var/data/db.json` if using a Render persistent disk.

## Security model

- Server-authoritative balances, dragon unlocks, egg purchases, withdrawal state and admin actions.
- PBKDF2 password hashing, HttpOnly SameSite session cookies, Origin checks, input limits, IP/user rate limits and timing-safe admin token checks.
- Robux withdrawal minimum is 20 Robux and requires backend balance checks, duplicate/cooldown protection, pending/approved/rejected states and Game Pass validation.
- The frontend never receives secrets and cannot approve withdrawals or mutate balances directly in backend mode.
- `Google ile devam et` is wired as a simulation/development flow; production should verify Google Identity Services JWT server-side before trusting the profile.

## Firestore rules reference

If you move persistence to Firebase/Firestore, keep all sensitive writes on a trusted backend/Admin SDK. Client rules should be deny-by-default and allow users to read only sanitized public profile documents:

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function signedIn() { return request.auth != null; }
    function isOwner(uid) { return signedIn() && request.auth.uid == uid; }
    function isAdmin() { return signedIn() && request.auth.token.admin == true; }

    match /publicProfiles/{uid} {
      allow read: if isOwner(uid) || isAdmin();
      allow create, update, delete: if false;
    }

    match /users/{uid} {
      allow read: if isOwner(uid) || isAdmin();
      allow write: if false;
    }

    match /economy/{doc=**} {
      allow read: if signedIn();
      allow write: if false;
    }

    match /withdrawals/{withdrawalId} {
      allow read: if isAdmin() || (signedIn() && resource.data.uid == request.auth.uid);
      allow create, update, delete: if false;
    }

    match /audit/{entry=**} {
      allow read: if isAdmin();
      allow write: if false;
    }

    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```
