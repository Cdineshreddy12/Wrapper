# Why the app doesn’t start (and how to avoid it)

After a few days away, or when something changes on your machine, frontend or backend can fail to start. Here’s why it happens and how to fix it reliably.

---

## Why the **backend** doesn’t start

| Cause | Why it happens | What you see |
|-------|----------------|--------------|
| **PostgreSQL not running** | DB is a separate process. After reboot, sleep, or Docker restart it may be stopped. | Process hangs with no logs, or `ETIMEDOUT` / `ECONNREFUSED` and then shutdown. |
| **Wrong or missing `DATABASE_URL`** | `.env` was changed, not committed, or copied from another machine. | Error like “DATABASE_URL is required” or connection timeout. |
| **Port 3000 in use** | Old `node` process still running, or another app using 3000. | `EADDRINUSE` when the server tries to listen. |
| **`ECANCELED: operation canceled, read`** | Nodemon restarted while Node was still loading files (e.g. you saved a file or another tool wrote a file right after starting). | App crashes right after “starting \`node src/app.js\`”. **Fix:** Run `npm start` once (no nodemon) to confirm the server starts; then use `npm run dev` and avoid saving files in the first few seconds after starting. |
| **Stale `node_modules`** | After system updates, Node upgrade, or switching branches. | Odd “module not found” or native addon errors. |
| **Other services (Redis, Elasticsearch, etc.)** | If the app expects them, they must be running. | Timeouts or “connection refused” in logs. |

---

## Why the **frontend** doesn’t start

| Cause | Why it happens | What you see |
|-------|----------------|--------------|
| **Port 3001 in use** | Previous `npm run dev` still running in another terminal or in background. | “Port 3001 is in use” or similar. |
| **Bad Vite cache** | Cache under `node_modules/.vite` can go stale and cause “Invalid hook call” or “multiple React”. | React hook errors, blank screen, or weird runtime errors. |
| **Different Node version** | System or nvm Node changed; some deps (or lockfile) expect a specific version. | Install fails, or runtime errors. |
| **Stale or mismatched dependencies** | `node_modules` out of sync with `package-lock.json`, or lockfile changed. | Build/runtime errors that look like “wrong React” or missing modules. |

---

## Reliable startup (do this every time)

### 1. Use a fixed Node version (recommended)

```bash
# If you use nvm (recommended)
nvm use
# or: nvm install 20
```

An `.nvmrc` file in the project root tells nvm which Node to use so you don’t mix versions.

### 2. Start dependencies first (backend needs DB)

**If PostgreSQL runs locally (Homebrew, etc.):**

```bash
# macOS with Homebrew
brew services start postgresql@16   # or your version

# Or start manually
pg_ctl -D /usr/local/var/postgres start
```

**If you use Supabase (host like `*.supabase.co` in DATABASE_URL):**

Supabase **pauses** free-tier projects after several days of inactivity. The server will hang or timeout connecting until you resume it.

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your project  
2. If you see “Project paused”, click **Restore** / **Resume**  
3. Wait a minute, then run the backend again  

**If you use Docker for PostgreSQL:**

```bash
docker start <postgres-container-name>
# or
docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=wrapper postgres:16
```

**Check that DB is reachable:**

```bash
# Replace with your user/db from DATABASE_URL
psql -h localhost -U postgres -d wrapper -c "SELECT 1"
```

### 3. Backend

```bash
cd backend

# If using Supabase: resume the project in the dashboard if it was paused (idle for days)

# Optional: run startup check (warns if Supabase may be paused)
npm run start:check

# Optional after long break or if you see weird errors
rm -rf node_modules package-lock.json && npm install

# Ensure .env exists and has DATABASE_URL
# e.g. DATABASE_URL=postgresql://user:pass@localhost:5432/your_db

npm run dev
```

You should see (in order):  
`🚀 Backend starting...` → `📦 Loading app...` → `🚀 Starting Wrapper API Server...` → `🔌 Initializing database...` → `✅ Database ready` → `Loading routes & middleware (may take 1–2 min on first run)...` → (wait **60–90 seconds** on first run) → `✅ Server listening on http://...`  

**Important:** The app core starts quickly; the long wait is **routes & middleware** loading (deferred so the process becomes responsive sooner). On first run, wait at least 2 minutes at “Loading routes & middleware…” before concluding it is stuck.  

If you see **`EADDRINUSE: address already in use 0.0.0.0:3000`**, port 3000 is taken: run `lsof -i :3000`, kill that process, or set `PORT=3001` in `backend/.env`.

### 4. Frontend (in a second terminal)

```bash
cd frontend

# Optional after long break or “Invalid hook call” / React errors
rm -rf node_modules/.vite
npm run dev
```

You should see Vite start and “Local: http://localhost:3001” (or your port).

---

## Quick fix checklist when something won’t start

**Backend:**

1. Is PostgreSQL running? (see above)
2. Is `backend/.env` present and does it have a correct `DATABASE_URL`?
3. Is port 3000 free? `lsof -i :3000` (kill the process if needed)
4. Try: `cd backend && rm -rf node_modules && npm install && npm run dev`

**Frontend:**

1. Is port 3001 free? `lsof -i :3001` (close other terminals/tabs running the app)
2. Clear Vite cache: `cd frontend && rm -rf node_modules/.vite && npm run dev`
3. If still broken: `cd frontend && rm -rf node_modules && npm install && npm run dev`

**Both:**

- Use the same Node version: `nvm use` or the version in `.nvmrc`.

---

## Optional: one-command startup

From the **project root** you can start backend and frontend in one go (two processes in the same terminal, or use a tool like `concurrently`):

```bash
# From project root - start backend (DB must already be running)
cd backend && npm run dev &

# Then frontend
cd frontend && npm run dev
```

Or use two terminals: one for `backend` and one for `frontend`, and always start the backend (and DB) before relying on the frontend.

---

## Summary

- **Backend** depends on **PostgreSQL** and **DATABASE_URL**. Start the DB first and keep `.env` correct.
- **Frontend** can break due to **port 3001**, **Vite cache**, or **Node/deps**. Clear `node_modules/.vite` and reinstall if needed.
- After a few days or a system change, **start DB → backend → frontend** and use a **fixed Node version** (e.g. via `.nvmrc`) to avoid most “not starting” issues.
