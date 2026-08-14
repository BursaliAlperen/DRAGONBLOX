# DRAGONBLOX — Wyrmforge Nexus

Compact premium Roblox companion foundation with a server-authoritative economy, independent dragon/egg inventories, Robux withdrawal review workflow, transaction ledger, and admin dashboard.

## Run

```bash
node server.js
```

Open http://localhost:3000. Optional server-only settings:

- `ADMIN_TOKEN` — admin dashboard token. Defaults to `dragon-admin-dev-token` for local development.
- `GAMEPASS_SECRET` — local Game Pass verifier secret. In production, replace the verifier in `server.js` with Roblox Open Cloud ownership/detail checks.
- `PORT` — server port.

The implementation intentionally stays within five source files: `index.html`, `style.css`, `main.js`, `server.js`, and this README.
