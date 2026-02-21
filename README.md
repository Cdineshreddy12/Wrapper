# Wrapper

Multi-tenant SaaS platform that provides centralized authentication, billing, credit management, role-based access control, and application orchestration for a suite of business applications (CRM, HR, Affiliate, Accounting, Inventory).

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                            Frontend                                  │
│               React 19 · Vite 7 · TailwindCSS 4 · shadcn/ui         │
│                    TanStack Router · Zustand                         │
├──────────────────────────────────────────────────────────────────────┤
│                           Backend API                                │
│            Fastify 4 · TypeScript · Drizzle ORM · Zod                │
├──────────┬──────────┬───────────┬───────────┬────────────────────────┤
│  Kinde   │  Stripe  │ Amazon MQ │ Route 53  │  OpenAI / Anthropic    │
│  (Auth)  │ (Billing)│ (Events)  │  (DNS)    │  (AI)                  │
├──────────┴──────────┴───────────┴───────────┴────────────────────────┤
│                          PostgreSQL                                  │
├──────────────────────────────────────────────────────────────────────┤
│          Optional: Redis · Elasticsearch · Temporal                  │
└──────────────────────────────────────────────────────────────────────┘
```

**How it works:** The React frontend runs on port `3001` and communicates with the Fastify backend on port `3000` via REST (`/api`). Authentication flows through Kinde (OAuth2). Billing is handled by Stripe. Inter-service events go through Amazon MQ (RabbitMQ). DNS is managed via AWS Route 53. AI features use OpenAI and Anthropic APIs.

---

## Tech Stack

### Frontend

| Technology | Purpose |
|------------|---------|
| React 19 | UI library |
| TypeScript | Type safety |
| Vite 7 | Dev server and bundler |
| Tailwind CSS 4 | Utility-first styling |
| shadcn/ui + Radix UI | Component library |
| TanStack Router | File-based routing |
| TanStack Query | Server-state management and caching |
| TanStack Table | Data tables |
| Zustand | Client-state management |
| React Hook Form + Zod | Form handling and validation |
| Recharts | Charts and analytics |
| Framer Motion | Animations |
| Kinde Auth React SDK | Frontend authentication |
| Storybook 10 | Component development and docs |
| Vitest 3 + Testing Library | Unit and component testing |

### Backend

| Technology | Purpose |
|------------|---------|
| Node.js 18+ | Runtime |
| TypeScript | Type safety |
| Fastify 4 | HTTP framework (with CORS, Helmet, JWT, rate limiting, Swagger) |
| Drizzle ORM + Drizzle Kit | Database ORM and migrations |
| PostgreSQL | Primary database |
| Zod | Schema validation |
| Stripe SDK | Payment processing |
| Jose + jsonwebtoken | JWT handling |
| Amazon MQ (amqplib) | Message queue |
| AWS Route 53 SDK | DNS management |
| Brevo (Sendinblue) | Transactional email |
| OpenAI + Anthropic SDKs | AI content generation |
| Winston | Logging |
| node-cron | Scheduled tasks |
| Vitest | Testing |

### Optional Services

| Service | Purpose | Required? |
|---------|---------|-----------|
| Redis | Caching | No (disabled by default) |
| Elasticsearch | Log aggregation | No |
| Temporal | Workflow orchestration | No (disabled by default) |

---

## Project Structure

```
WrapperStandalone/
├── package.json                  # Monorepo root — orchestrates backend + frontend
├── backend/
│   ├── package.json
│   ├── .env.example              # Backend environment template
│   ├── tsconfig.json
│   ├── Dockerfile
│   └── src/
│       ├── bootstrap.ts          # Entry point — starts the server
│       ├── app.ts                # Runs startup prelude, loads Fastify
│       ├── app-fastify.ts        # Fastify setup (CORS, cookies, rate limiting, Swagger)
│       ├── app-routes.ts         # Route registration
│       ├── db/                   # Drizzle schema, connection, migrations
│       ├── middleware/            # Auth, CSRF, error handling, trial restrictions
│       ├── features/             # Feature modules (see Backend Features below)
│       ├── routes/               # Shared routes (health, internal, suite, activity)
│       └── startup/              # Pre-boot scripts
├── frontend/
│   ├── package.json
│   ├── .env.example              # Frontend environment template
│   ├── vite.config.ts            # Vite config (port 3001, PWA, chunking)
│   ├── tsconfig.json
│   └── src/
│       ├── App.tsx               # Root component
│       ├── features/             # Feature modules (pages + components)
│       ├── components/           # Shared UI components
│       │   ├── auth/             # Auth guards, providers
│       │   ├── common/           # Reusable components (feedback, data-display, billing)
│       │   ├── layout/           # Shell, sidebar, footer
│       │   └── ui/               # shadcn/ui primitives
│       ├── stores/               # Zustand state stores
│       ├── hooks/                # Custom React hooks
│       ├── lib/                  # API client, utilities, query helpers
│       ├── contexts/             # React context providers
│       ├── services/             # Service integrations (JWT, notifications, CRM auth)
│       └── errors/               # Error boundaries and fallbacks
└── docs/                         # Documentation
```

---

## Prerequisites

Before you begin, make sure you have the following installed:

| Requirement | Version | How to check | Install |
|-------------|---------|--------------|---------|
| **Node.js** | >= 18 | `node -v` | [nodejs.org](https://nodejs.org) or `nvm install 18` |
| **npm** | >= 9 | `npm -v` | Comes with Node.js |
| **PostgreSQL** | >= 14 | `psql --version` | [postgresql.org](https://postgresql.org/download/) or `brew install postgresql@16` |
| **Git** | any | `git --version` | [git-scm.com](https://git-scm.com) |

You will also need accounts for these services (for full functionality):

| Service | Purpose | Sign up |
|---------|---------|---------|
| **Kinde** | Authentication (OAuth2) | [kinde.com](https://kinde.com) |
| **Stripe** | Billing and subscriptions | [stripe.com](https://stripe.com) |
| **AWS** (optional) | Route 53 DNS, Amazon MQ | [aws.amazon.com](https://aws.amazon.com) |
| **Brevo** (optional) | Transactional email | [brevo.com](https://brevo.com) |
| **OpenAI** (optional) | AI features | [platform.openai.com](https://platform.openai.com) |

---

## Getting Started — Step by Step

### Step 1: Clone the repository

```bash
git clone <repo-url>
cd WrapperStandalone
```

### Step 2: Install all dependencies

From the project root, install dependencies for the root, backend, and frontend in one command:

```bash
npm run install:all
```

This runs `npm install` in all three directories: root, `backend/`, and `frontend/`.

Alternatively, install them individually:

```bash
npm install                       # Root (installs concurrently)
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
```

### Step 3: Set up PostgreSQL

Create a database for the project:

```bash
psql -U postgres
```

```sql
CREATE DATABASE wrapper;
CREATE USER wrapper_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE wrapper TO wrapper_user;
\q
```

Note your connection string: `postgresql://wrapper_user:your_password@localhost:5432/wrapper`

### Step 4: Configure backend environment

```bash
cd backend
cp .env.example .env
```

Open `backend/.env` and fill in the required values:

**Required variables:**

| Variable | What to set |
|----------|-------------|
| `DATABASE_URL` | Your PostgreSQL connection string from Step 3 |
| `JWT_SECRET` | A strong random string (e.g. `openssl rand -hex 32`) |
| `SESSION_SECRET` | Another strong random string |
| `KINDE_DOMAIN` | Your Kinde domain (e.g. `https://your-app.kinde.com`) |
| `KINDE_CLIENT_ID` | From Kinde dashboard → Applications |
| `KINDE_CLIENT_SECRET` | From Kinde dashboard → Applications |
| `FRONTEND_URL` | `http://localhost:3001` (default) |

**Optional but recommended:**

| Variable | What to set |
|----------|-------------|
| `STRIPE_SECRET_KEY` | From Stripe dashboard (test key: `sk_test_...`) |
| `STRIPE_PUBLISHABLE_KEY` | From Stripe dashboard (test key: `pk_test_...`) |
| `STRIPE_WEBHOOK_SECRET` | From Stripe CLI or dashboard (`whsec_...`) |
| `OPENAI_API_KEY` | For AI features |
| `BREVO_API_KEY` | For transactional email |

Everything else can stay at its default value for local development.

### Step 5: Configure frontend environment

```bash
cd frontend
cp .env.example .env
```

Open `frontend/.env` and fill in:

| Variable | What to set |
|----------|-------------|
| `VITE_API_URL` | `http://localhost:3000/api` (default) |
| `VITE_API_BASE_URL` | `http://localhost:3000` (default) |
| `VITE_KINDE_DOMAIN` | Same as backend `KINDE_DOMAIN` |
| `VITE_KINDE_CLIENT_ID` | Your Kinde frontend app client ID |
| `VITE_KINDE_REDIRECT_URI` | `http://localhost:3001/auth/callback` (default) |
| `VITE_KINDE_LOGOUT_URI` | `http://localhost:3001` (default) |
| `VITE_JWT_SECRET` | Match the backend `JWT_SECRET` |
| `VITE_ENV` | `development` (default) |

### Step 6: Push the database schema

From the backend directory, push the Drizzle schema to your PostgreSQL database:

```bash
cd backend
npm run db:push
```

This creates all the required tables. You can verify with:

```bash
npm run db:studio
```

This opens Drizzle Studio in your browser to inspect the database.

### Step 7: Start the development servers

**Option A — Start both from the root (recommended):**

```bash
# From the project root
npm run dev
```

This uses `concurrently` to start both servers:
- Backend on `http://localhost:3000`
- Frontend on `http://localhost:3001`

**Option B — Start them separately in two terminals:**

Terminal 1 (Backend):
```bash
cd backend
npm run dev
```

Terminal 2 (Frontend):
```bash
cd frontend
npm run dev
```

### Step 8: Verify everything is running

1. **Backend health check:** Open `http://localhost:3000/health` — should return a success response
2. **API docs:** Open `http://localhost:3000/docs` — Swagger UI for all API endpoints
3. **Frontend:** Open `http://localhost:3001` — the app should load and show the landing page

---

## Backend Features

| Feature | Directory | Description |
|---------|-----------|-------------|
| Admin | `backend/src/features/admin/` | Platform administration — tenants, entities, credits, notifications, trials |
| App Sync | `backend/src/features/app-sync/` | Data sync APIs for downstream apps (CRM, HR, etc.) |
| Auth | `backend/src/features/auth/` | OAuth2 login via Kinde — social providers, org-scoped login, token management |
| Credits | `backend/src/features/credits/` | Credit balances, purchases, consumption, transfers, expiry |
| Messaging | `backend/src/features/messaging/` | Amazon MQ event bus — inter-app events and job queues |
| Notifications | `backend/src/features/notifications/` | In-app notifications with templates, queue processing, AI content |
| Onboarding | `backend/src/features/onboarding/` | Tenant setup — company info, PAN/GSTIN verification, subdomain/DNS, invites |
| Organizations | `backend/src/features/organizations/` | Organization hierarchy, locations, entities, invitations |
| Roles | `backend/src/features/roles/` | Roles, permissions, permission matrix, tier-based access |
| Subscriptions | `backend/src/features/subscriptions/` | Stripe billing — plans, checkout, trials, payments, upgrades |
| Users | `backend/src/features/users/` | User profiles, tenant verification, classification |
| Webhooks | `backend/src/features/webhooks/` | Stripe forwarding, external webhook handling |

> Each feature directory contains its own `README.md` with detailed endpoint documentation.

---

## API Routes

All API routes are prefixed with `/api`. Interactive documentation is available at `/docs` (Swagger UI).

| Prefix | Feature |
|--------|---------|
| `/api/auth` | Authentication (login, callback, logout, token refresh) |
| `/api/onboarding` | Tenant onboarding flows |
| `/api/tenants` | Tenant CRUD and settings |
| `/api/users` | User management |
| `/api/organizations` | Organizations and entities |
| `/api/roles` | Roles and permissions |
| `/api/permissions` | Permission management |
| `/api/subscriptions` | Billing, plans, and subscriptions |
| `/api/credits` | Credit system |
| `/api/notifications` | Notification management |
| `/api/admin/*` | Admin panel endpoints |
| `/api/webhooks` | Webhook handlers (Stripe, etc.) |
| `/api/wrapper` | App sync for downstream apps |
| `/health` | Health check |

---

## Scripts Reference

### Root (Monorepo)

| Command | Description |
|---------|-------------|
| `npm run install:all` | Install dependencies for root, backend, and frontend |
| `npm run dev` | Start backend + frontend concurrently |
| `npm run dev:backend` | Start only the backend |
| `npm run dev:frontend` | Start only the frontend |
| `npm run build` | Build backend + frontend for production |
| `npm run start` | Start production servers concurrently |
| `npm run lint` | Lint backend + frontend |
| `npm run test` | Run all tests |
| `npm run clean` | Remove all `node_modules` directories |

### Backend

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server with hot reload (tsx watch) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Start production server (`node dist/bootstrap.js`) |
| `npm test` | Run tests with Vitest |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run lint` | Lint source code |
| `npm run typecheck` | Type-check without emitting |
| `npm run db:push` | Push Drizzle schema to database |
| `npm run db:generate` | Generate migration files |
| `npm run db:migrate` | Run pending migrations |
| `npm run db:studio` | Open Drizzle Studio (database GUI) |
| `npm run db:introspect` | Introspect existing database into schema |

### Frontend

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server on `:3001` with hot reload |
| `npm run build` | Production build (outputs to `dist/`) |
| `npm run preview` | Preview production build locally |
| `npm test` | Run tests with Vitest |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run lint` | Lint source code |
| `npm run lint:fix` | Lint and auto-fix |
| `npm run type-check` | Type-check without emitting |
| `npm run format` | Format code with Prettier |
| `npm run storybook` | Start Storybook on `:6006` |
| `npm run build-storybook` | Build static Storybook |
| `npm run build:analyze` | Production build with bundle analysis |

---

## Environment Variables

### Backend (`backend/.env`)

<details>
<summary>Full list of environment variables</summary>

| Variable | Default | Description |
|----------|---------|-------------|
| **Server** | | |
| `PORT` | `3000` | HTTP port |
| `HOST` | `0.0.0.0` | Bind address |
| `NODE_ENV` | `development` | Environment (`development` / `production`) |
| `LOG_LEVEL` | `info` | Winston log level |
| **Database** | | |
| `DATABASE_URL` | — | PostgreSQL connection string (required) |
| `DB_POOL_SIZE` | `10` | Connection pool size |
| **Authentication** | | |
| `KINDE_DOMAIN` | — | Kinde tenant URL (required) |
| `KINDE_CLIENT_ID` | — | Kinde app client ID (required) |
| `KINDE_CLIENT_SECRET` | — | Kinde app secret (required) |
| `KINDE_M2M_CLIENT_ID` | — | Machine-to-machine client ID |
| `KINDE_M2M_CLIENT_SECRET` | — | Machine-to-machine secret |
| **Security** | | |
| `JWT_SECRET` | — | JWT signing key (required) |
| `SESSION_SECRET` | — | Session signing key (required) |
| **URLs** | | |
| `FRONTEND_URL` | `http://localhost:3001` | Frontend origin for CORS |
| `BACKEND_URL` | `http://localhost:3000` | Backend origin |
| **Stripe** | | |
| `STRIPE_SECRET_KEY` | — | Stripe API secret key |
| `STRIPE_PUBLISHABLE_KEY` | — | Stripe public key |
| `STRIPE_WEBHOOK_SECRET` | — | Stripe webhook signing secret |
| **AWS** | | |
| `AWS_ACCESS_KEY_ID` | — | AWS credentials |
| `AWS_SECRET_ACCESS_KEY` | — | AWS credentials |
| `AWS_REGION` | `us-east-1` | AWS region |
| **Messaging** | | |
| `AMAZON_MQ_URL` | — | RabbitMQ connection URL |
| **Email** | | |
| `BREVO_API_KEY` | — | Brevo API key |
| **AI** | | |
| `OPENAI_API_KEY` | — | OpenAI API key |
| **Optional Services** | | |
| `REDIS_ENABLED` | `false` | Enable Redis caching |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection URL |
| `TEMPORAL_ENABLED` | `false` | Enable Temporal workflows |
| `DEFAULT_FREE_CREDITS` | `100` | Credits given to new tenants |
| `TRIAL_PERIOD_DAYS` | `14` | Free trial duration |

</details>

### Frontend (`frontend/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `http://localhost:3000/api` | Backend API URL |
| `VITE_API_BASE_URL` | `http://localhost:3000` | Backend base URL |
| `VITE_KINDE_DOMAIN` | — | Kinde tenant URL (required) |
| `VITE_KINDE_CLIENT_ID` | — | Kinde frontend client ID (required) |
| `VITE_KINDE_REDIRECT_URI` | `http://localhost:3001/auth/callback` | OAuth callback URL |
| `VITE_KINDE_LOGOUT_URI` | `http://localhost:3001` | Post-logout redirect |
| `VITE_WRAPPER_DOMAIN` | `http://localhost:3001` | This app's domain |
| `VITE_CRM_DOMAIN` | `http://localhost:3002` | CRM app domain |
| `VITE_JWT_SECRET` | — | JWT secret (match backend) |
| `VITE_GEMINI_API_KEY` | — | Google Gemini API key (optional) |
| `VITE_ENV` | `development` | Environment flag |

---

## Database Management

Drizzle ORM handles schema and migrations.

```bash
cd backend

# Push schema directly to the database (development)
npm run db:push

# Generate a migration file from schema changes
npm run db:generate

# Run pending migrations (production)
npm run db:migrate

# Open Drizzle Studio to browse your database
npm run db:studio

# Pull existing database schema into Drizzle format
npm run db:introspect
```

---

## Docker (Backend)

A Dockerfile is available for the backend:

```bash
cd backend

# Build the image
docker build -t wrapper-backend .

# Run the container
docker run -p 3000:3000 --env-file .env wrapper-backend
```

The Dockerfile supports both development and production targets. The production build includes a health check on `/health`.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `npm run dev` fails with "concurrently not found" | Run `npm install` from the project root |
| Database connection refused | Ensure PostgreSQL is running and `DATABASE_URL` is correct |
| `db:push` fails | Check that the database exists and the user has `CREATE` privileges |
| Frontend shows blank page | Check browser console; ensure `VITE_API_URL` points to the running backend |
| Auth redirects fail | Verify Kinde redirect URIs match your `.env` values exactly |
| Stripe webhooks not working locally | Use [Stripe CLI](https://stripe.com/docs/stripe-cli) to forward: `stripe listen --forward-to localhost:3000/api/webhooks/stripe` |
| Port already in use | Kill the existing process: `lsof -ti:3000 | xargs kill` or change `PORT` in `.env` |

---

## License

Proprietary. All rights reserved.
