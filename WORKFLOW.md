# Application Workflow & Architecture

This document explains every module, component, and subsystem in this template — what it is, why it exists, and how it connects to everything else.

---

## Table of Contents

1. [High-Level Architecture](#1-high-level-architecture)
2. [Startup Sequence](#2-startup-sequence)
3. [Request Lifecycle](#3-request-lifecycle)
4. [PostgreSQL & Query Layer](#4-postgresql--query-layer)
5. [Domain Event Bus](#5-domain-event-bus)
6. [BullMQ & Redis (Job Queues)](#6-bullmq--redis-job-queues)
7. [Socket.IO (Realtime)](#7-socketio-realtime)
8. [Authentication & JWT](#8-authentication--jwt)
9. [Middleware Stack](#9-middleware-stack)
10. [Module Structure](#10-module-structure)
11. [Configuration System](#11-configuration-system)
12. [Logging System](#12-logging-system)
13. [API Response Convention](#13-api-response-convention)
14. [TypeSpec & OpenAPI Docs](#14-typespec--openapi-docs)
15. [Worker Process](#15-worker-process)
16. [Utilities Reference](#16-utilities-reference)
17. [Anomalies & Known Gaps](#17-anomalies--known-gaps)

---

## 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          CLIENT                                 │
│              (HTTP REST  /  WebSocket)                          │
└────────────────────┬──────────────────┬─────────────────────────┘
                     │ HTTP             │ WS upgrade
                     ▼                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Node HTTP Server                            │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                   Express App                            │   │
│  │  Middleware stack (helmet, cors, rate-limit, morgan,     │   │
│  │  request-id, body-parser, DI, audit)                     │   │
│  │                                                          │   │
│  │  ┌─────────────┐   ┌──────────────┐   ┌─────────────┐    │   │
│  │  │ /health     │   │ /auth        │   │ /...        │    │   │
│  │  │ routes      │   │ routes       │   │ (future)    │    │   │
│  │  └─────────────┘   └──────┬───────┘   └─────────────┘    │   │
│  └────────────────────────── │ ─────────────────────────────┘   │
│                              │                                  │
│  ┌───────────────────────────▼────────────────────────────────┐ │
│  │              Socket.IO Server (same HTTP server)           │ │
│  └────────────────────────────────────────────────────────────┘ │
└──────────┬──────────────────────────────────────────────────────┘
           │
           │  service calls
           ▼
┌──────────────────────────────────────────────────────────────────┐
│                     Business Layer                               │
│                                                                  │
│   AuthService  ──► DB Queries (pg Pool)  ──► PostgreSQL          │
│        │                                                         │
│        └──► DomainEventBus.emit("auth.user.registered")          │
│                        │                                         │
│                        ▼                                         │
│              Auth Event Handler                                  │
│                        │                                         │
│                        ▼                                         │
│              BullMQ Queue (ioredis) ──► Redis                    │
│                        │                                         │
│                        └──► DomainEventBus.emit("queue.job.enqueued")
│                                        │                         │
│                                        ▼                         │
│                              Socket.IO broadcast                 │
└──────────────────────────────────────────────────────────────────┘

Separate process:
┌──────────────────────────────────────────────────────────────────┐
│                     BullMQ Worker (src/workers)                  │
│   Pulls jobs from Redis ──► processEmailJob() ──► EmailService   │
└──────────────────────────────────────────────────────────────────┘
```

---

## 2. Startup Sequence

**Entry point:** `src/index.ts`

```
src/index.ts
  │
  ├─ dotenv.config()                  load .env into process.env
  ├─ configManager (singleton)        parse & validate config.yaml + env vars
  ├─ new Server(cfg)                  construct Express + HTTP server
  │
  └─ server.setup()
       │
       ├─ setupDatabase()             create pg.Pool, run SELECT 1 probe
       ├─ setupRealtime()             attach Socket.IO if enabled
       ├─ setupEventHandlers()        register domain event listeners
       ├─ setupMiddlewares()          mount Express middleware stack
       ├─ setupRoutes()               mount all HTTP routers
       └─ setupDocumentation()        mount Swagger UI if enabled
  │
  └─ server.start()                   httpServer.listen(port)
```

Graceful shutdown is wired to `SIGTERM` / `SIGINT` via `src/lib/shutdown.ts`, which calls `server.shutdown()` — draining the queue worker, closing Socket.IO, closing the HTTP server, and ending the pg pool in that order.

---

## 3. Request Lifecycle

Every HTTP request passes through this pipeline before reaching a route handler:

```
Incoming Request
      │
      ▼
  body-parser          parse JSON / urlencoded body
      │
      ▼
  helmet               set security headers (CSP, HSTS, etc.)
      │
      ▼
  express-rate-limit   global rate limiting (window + max from config)
      │
      ▼
  cors                 validate Origin header against allowed list
      │
      ▼
  morgan (winston)     log HTTP method, URL, status, response time
      │
      ▼
  request-id           generate UUID, attach to res.locals + response header
      │
      ▼
  dependency-injection inject db, eventBus, io into res.locals
      │
      ▼
  audit_logger         on res "finish", write to audit_logs table if user present
      │
      ▼
  validate(schema)     (per-route) Zod parse of body/query/params
      │
      ▼
  authenticate         (protected routes) verify Bearer JWT
      │
      ▼
  Route Handler        call service, get ApiResponse, sendResponse()
      │
      ▼
  sendResponse()       inject requestId, res.status().json()
```

---

## 4. PostgreSQL & Query Layer

**Files:** `src/db/queries/`, `src/db/migrations/`

**Why it exists:** Keeps all SQL centralized and out of services. Services call query functions; they never write raw SQL themselves.

**How it works:**

```
Service
  │
  └─ createAuthQueries(db)   factory receives the pg.Pool
       │
       ├─ findUserIdByEmail()      SELECT id FROM users WHERE email = $1
       ├─ findUserForLogin()       SELECT id, email, password_hash FROM users
       ├─ insertUserWithAudit()    BEGIN → INSERT users → INSERT audit_logs → COMMIT
       └─ getCurrentUser()         SELECT id, email FROM users WHERE id = $1
```

All query results are validated through Zod schemas (`ExistingUserSchema`, `LoginUserSchema`, `CurrentUserSchema`) before being returned — this catches schema drift between the DB and the application at runtime.

**Transactions** use a dedicated `client` from the pool (`db.connect()`), run `BEGIN`/`COMMIT`/`ROLLBACK`, and always call `client.release()` in `finally`.

**Migrations** use `node-pg-migrate` with plain SQL files in `src/db/migrations/`. Each file has a `-- migrate:up` and `-- migrate:down` section.

```
Migration 001: init_auth_and_audit
  ├─ CREATE EXTENSION pgcrypto          (gen_random_uuid support)
  ├─ CREATE TABLE users                 (id, email, password_hash, is_active, timestamps)
  ├─ CREATE TABLE audit_logs            (id, actor_user_id FK, action, entity, metadata JSONB, ip, user_agent)
  └─ CREATE INDEX on users.email, audit_logs.actor_user_id, audit_logs.created_at
```

**Connection pool** is configured via `config.yaml`:
- `pool_size` — max concurrent connections
- `connection_timeout` — ms to wait for a free connection
- `idle_timeout` — ms before an idle connection is closed

---

## 5. Domain Event Bus

**Files:** `src/core/events/bus.ts`

**Why it exists:** Decouples the moment something happens (e.g. user registers) from the side effects that should follow (e.g. send welcome email). Services emit events; handlers react to them. Neither side knows about the other.

**How it works:**

```
DomainEventBus (wraps Node EventEmitter)
  │
  ├─ .emit("auth.user.registered", { userId, email })
  │       └─► registered listener in auth.events.ts
  │               └─► enqueueWelcomeEmailJob()
  │                       └─► emits "queue.job.enqueued"
  │                               └─► Socket.IO broadcasts to all clients
  │
  └─ .on(eventName, listener)   typed — only known event names accepted
```

**Type safety:** `DomainEventMap` in `bus.ts` defines every valid event name and its payload shape. TypeScript enforces this at compile time — you cannot emit an unknown event or pass the wrong payload.

**Adding a new event:**
1. Add the event name + payload type to `DomainEventMap` in `bus.ts`
2. Emit it from a service: `eventBus.emit("your.event", payload)`
3. Register a listener anywhere that has access to the bus

---

## 6. BullMQ & Redis (Job Queues)

**Files:** `src/core/queues/index.ts`, `src/workers/index.ts`

**Why it exists:** Offloads slow or unreliable work (sending emails, webhooks, etc.) out of the HTTP request cycle. The API enqueues a job and responds immediately; a separate worker process picks it up and processes it asynchronously.

**How it works:**

```
API Process                          Worker Process
──────────────────────────────       ──────────────────────────────
enqueueWelcomeEmailJob(data)         startQueueWorker()
  │                                    │
  └─► Queue.add("send-welcome-email")  └─► Worker listens on "email-jobs"
          │                                    │
          ▼                                    ▼
       Redis (ioredis)  ◄──────────────  processEmailJob(job)
                                               │
                                               └─► EmailService.send()
```

**Feature flags** (all in `config.yaml`):

| Flag | Effect |
|------|--------|
| `queues.bullmq.enabled: false` | Queue client is never created; `enqueueWelcomeEmailJob` throws if called |
| `workers.process.enabled: false` | Worker entrypoint exits immediately at startup |
| `workers.notification_jobs.enabled: false` | Worker is not started even if process is enabled; email jobs are skipped in event handler |

**Job options** (from config):
- `default_attempts` — how many times to retry a failed job
- `default_backoff_ms` — base delay for exponential backoff between retries
- `removeOnComplete: 1000` — keep last 1000 completed jobs in Redis
- `removeOnFail: 5000` — keep last 5000 failed jobs for inspection

**Redis connection** is a shared singleton (`getQueueConnection()`). Both the Queue and Worker share the same `IORedis` instance with `maxRetriesPerRequest: null` (required by BullMQ).

---

## 7. Socket.IO (Realtime)

**Files:** `src/core/realtime/socket.ts`

**Why it exists:** Pushes server-side events to connected browser/client sessions in real time without polling. Shares the same HTTP server port as the REST API.

**How it works:**

```
HTTP Server
  │
  └─► Socket.IO attaches at path /ws (configurable)
          │
          ├─ on "connection"
          │     ├─ log connected socket ID
          │     └─ emit "system:hello" to the new client
          │
          ├─ on "disconnect"
          │     └─ log disconnected socket ID + reason
          │
          ├─ eventBus.on("auth.user.registered")
          │     └─► io.emit("auth:user-registered", payload)   broadcast to ALL clients
          │
          └─ eventBus.on("queue.job.enqueued")
                └─► io.emit("queue:job-enqueued", payload)     broadcast to ALL clients
```

**CORS** for WebSocket connections uses the same `origins` array as the REST API.

**Toggling:** Set `realtime.socketio.enabled: false` in `config.yaml` to skip Socket.IO entirely — the HTTP server still starts normally.

**Accessing `io` in route handlers:** The Socket.IO instance is injected into `res.locals.io` via the dependency injection middleware, so any route handler can emit targeted events.

---

## 8. Authentication & JWT

**Files:** `src/core/middlewares/jwt.middleware.ts`, `src/modules/auth/`

**Why it exists:** Stateless authentication — no session store needed. The client holds a short-lived access token and a long-lived refresh token.

**Token flow:**

```
POST /auth/register
  └─► AuthService.register()
        ├─ check email uniqueness
        ├─ hashPassword() (PBKDF2-SHA512, 120k iterations)
        ├─ insertUserWithAudit() (transaction)
        └─ emit "auth.user.registered"

POST /auth/login
  └─► AuthService.login()
        ├─ findUserForLogin()
        ├─ compareHashedPassword() (timing-safe compare)
        ├─ generateToken()         JWT signed with JWT_SECRET, 24h expiry
        └─ generateRefreshToken()  JWT signed with JWT_REFRESH_SECRET, 30d expiry

GET /auth/me  (protected)
  └─► authenticate middleware
        ├─ extract Bearer token from Authorization header
        ├─ verifyToken() → decoded { id, email }
        └─ attach to req.user + res.locals.user
  └─► AuthService.getCurrentUser(req.user.id)
```

**Password hashing** (`src/lib/password.ts`): Uses Node's built-in `crypto.pbkdf2Sync` — no external bcrypt dependency. Format stored: `iterations:salt:derivedHash`.

**`optionalAuth`**: A variant of `authenticate` that does not reject the request if no token is present — useful for endpoints that behave differently for authenticated vs anonymous users.

---

## 9. Middleware Stack

**Files:** `src/core/middlewares/`

| File | What it does |
|------|-------------|
| `logger.middleware.ts` | Winston logger instance + Morgan HTTP stream. Console level is config-driven; file transports always capture everything. |
| `jwt.middleware.ts` | `authenticate`, `optionalAuth`, `generateToken`, `generateRefreshToken`, `verifyToken`, `verifyRefreshToken` |
| `validation.middleware.ts` | `validate(schema)` — Zod parse of `{ body, query, params }`, returns structured field errors on failure |
| `locals.middleware.ts` | `createDependencyInjectionMiddleware` — injects `db`, `eventBus`, `io` into `res.locals` |
| `audit.middleware.ts` | On `res.finish`, writes an `audit_logs` row for any authenticated request (skips `/health`) |
| `request_id.middleware.ts` | Generates a UUID per request, stores in `res.locals.requestId`, sets `X-Request-ID` response header |
| `rbac.middleware.ts` | Stubbed role-based access control — uncomment and extend when roles are added to the user model |
| `index.ts` | Barrel export for all middleware |

**Middleware registration order in `server.ts`** (matters):
```
body-parser → helmet → rate-limit → cors → morgan → request-id → DI + audit
```
Morgan runs before request-id so the request-id header appears in logs. DI runs last so `db` is available to the audit middleware's `res.finish` handler.

---

## 10. Module Structure

**Files:** `src/modules/`

Each feature module follows this layout:

```
src/modules/<name>/
  ├─ <name>.routes.ts    Router definition — validate() + controller object + route declarations
  ├─ <name>.service.ts   Business logic — returns ApiResponse, never touches res
  ├─ <name>.schema.ts    Zod schemas wrapping { body, params, query }
  └─ <name>.events.ts    (optional) Domain event listeners for this module
```

**Route registration** is explicit — add a line to `src/modules/index.ts`:
```ts
app.use(`${apiPrefix}/your-module`, createYourRouter(dependencies));
```

**Controller pattern inside routes:**
```ts
const c = {
  action: asyncHandler(async (req, res) => {
    const response = await service.action(req.body);
    sendResponse(res, response);
  }),
};

router.post("/path", validate(schema), c.action);
```

**Current modules:**

| Module | Routes | Description |
|--------|--------|-------------|
| `health` | `GET /health` | Server health metrics, DB ping, memory, uptime |
| `auth` | `POST /auth/register`, `POST /auth/login`, `GET /auth/me` | User registration, login, current user |
| `user` | (scaffolded, empty) | Placeholder for user management endpoints |

---

## 11. Configuration System

**Files:** `src/config/index.ts`, `config.yaml`, `.env`

**Two-layer config:**

```
config.yaml          static, committed, non-secret settings
.env                 secrets and environment-specific overrides
```

**Validation:** Both layers are validated with Zod at startup. If anything is missing or wrong, the process throws before the server starts.

**Environment overrides:** `HOST`, `PORT`, `NODE_ENV`, `ALLOWED_ORIGINS` from `.env` override their `config.yaml` equivalents at runtime.

**`ConfigManager` singleton** (`configManager`) is imported wherever config is needed. It exposes typed getters: `getServerConfig()`, `getDatabaseConfig()`, `getLoggingConfig()`, etc.

**Feature flags in `config.yaml`:**

```
realtime.socketio.enabled          attach Socket.IO or not
queues.bullmq.enabled              create queue clients or not
workers.process.enabled            worker entrypoint runs or exits immediately
workers.notification_jobs.enabled  email worker starts + jobs are enqueued
```

---

## 12. Logging System

**Files:** `src/core/middlewares/logger.middleware.ts`

**Why three transports:**

```
Winston Logger (level: "debug" — no cap at logger level)
  │
  ├─► Console transport
  │     level: config.yaml → logging.level   (user-controlled)
  │     format: colorized, human-readable
  │
  ├─► logs/app.log
  │     level: "debug"   (captures everything, always)
  │     format: plain text, no ANSI codes
  │
  └─► logs/error.log
        level: "error"   (errors only, always)
        format: plain text, no ANSI codes
```

**Custom level hierarchy** (lower number = higher priority):
```
error: 0  →  warn: 1  →  info: 2  →  http: 3  →  debug: 4
```

**HTTP request logging** (Morgan): Morgan writes to a stream that calls `log.http()`. This means HTTP access logs appear at the `http` level — they show in the console only when `logging.level` is `http` or `debug`, but always land in `app.log`.

**`logging.level` examples:**
- `error` — console shows only errors; files still capture everything
- `info` — console shows error/warn/info; http and debug go to file only
- `http` — console shows everything including request logs
- `debug` — console shows everything including debug traces

---

## 13. API Response Convention

**Files:** `src/core/utils/api_response.ts`

All responses follow a single shape:

```ts
// Success
{ success: true,  message: string, data?: T,       statusCode: number, requestId?: string }

// Error
{ success: false, message: string, errors?: unknown, statusCode: number, requestId?: string }
```

**Services** build responses using `api_response.success()` / `api_response.error()` — no access to `res` needed.

**Route handlers** call `sendResponse(res, response)` which injects `requestId` from `res.locals` before sending.

**Error classes** (`APIError`, `AuthError`) extend `Error` with a `statusCode` field — use these for thrown errors that bubble up to a global error handler (not yet wired, but the classes are ready).

---

## 14. TypeSpec & OpenAPI Docs

**Files:** `docs/`, `openapi.yaml`

**Why TypeSpec instead of writing OpenAPI by hand:** TypeSpec is a typed DSL that compiles to OpenAPI 3. It catches inconsistencies at compile time and keeps docs co-located with the API design.

**Structure:**
```
docs/
  ├─ main.tsp              entry point — imports all models and routes
  ├─ tspconfig.yaml        compiler config
  ├─ models/
  │   └─ common.tsp        shared types: ApiResponse<T>, User, HealthMetrics, etc.
  └─ routes/
      ├─ health.tsp        GET /health
      └─ auth.tsp          POST /auth/register, POST /auth/login, GET /auth/me
```

**Build:** `bun run docs:build` compiles TypeSpec → `openapi.yaml`. The Swagger UI at `/api/v1/docs` serves this file.

**Adding docs for a new route:**
1. Create `docs/routes/<module>.tsp`
2. Import it in `docs/main.tsp`
3. Run `bun run docs:build`

---

## 15. Worker Process

**Files:** `src/workers/index.ts`

The worker is a **separate Bun process** — it does not share memory with the API. It connects to the same Redis instance and pulls jobs from the queue.

```
bun run worker:start   (or worker:dev for watch mode)
  │
  ├─ check workers.process.enabled     exit if false
  ├─ check queues.bullmq.enabled       exit if false
  └─ startQueueWorker()
       │
       ├─ check workers.notification_jobs.enabled   exit if false
       └─ new Worker("email-jobs", processEmailJob, { connection, concurrency: 5 })
             │
             ├─ on "completed" → log
             └─ on "failed"    → log error
```

`processEmailJob` is currently a stub that logs the job. Wire in `EmailService` (in `src/core/utils/email.ts`) when you have an email provider.

**Graceful shutdown:** `SIGINT`/`SIGTERM` call `closeQueueResources()` which drains the worker, closes the queue, and quits the Redis connection.

---

## 16. Utilities Reference

| File | What it provides |
|------|-----------------|
| `src/core/utils/api_response.ts` | `api_response`, `sendResponse`, `ApiResponse<T>`, `APIError`, `AuthError` |
| `src/core/utils/time.ts` | `formatUptime(ms)` — human-readable duration string |
| `src/core/utils/email.ts` | `EmailService` stub — replace `.send()` with your provider |
| `src/core/utils/cache.ts` | Single-use in-memory `Cache` — values auto-delete on first `get()` |
| `src/core/utils/types.ts` | Shared enums (`ROLE`, `CATEGORY`, `EventCategory`) and CSV row types |
| `src/core/utils/seed_utility.ts` | CSV parsing helpers and `exportCredentialsToCSV()` for seeding scripts |
| `src/lib/password.ts` | `hashPassword()` / `compareHashedPassword()` — PBKDF2-SHA512, no external deps |
| `src/lib/shutdown.ts` | `shutdown_handler(signal, server)` — graceful shutdown orchestration |

---

## 17. Anomalies & Known Gaps

These were found during the documentation pass:

| Location | Issue | Status |
|----------|-------|--------|
| `src/core/middlewares/rbac.middleware.ts` | Entire file is commented out. RBAC is not implemented — the `User` type has no `role` field yet. | Intentional stub — extend when roles are added to the `users` table |
| `src/core/utils/types.ts` | Contains domain-specific enums (`EventCategory`, `CATEGORY`, `UserCSVRow`) that belong to a specific project, not a generic template | Carry-over from original project — clean up when adapting the template |
| `src/core/utils/seed_utility.ts` | Contains project-specific seeding logic (CSV parsing, team name extraction) | Same as above — template carry-over |
| `src/core/utils/cache.ts` | `Cache` constructor and `get()` call `log.warn()` on every use, which is noisy | Change to `log.debug()` for non-production noise reduction |
| `src/modules/user/` | Directory exists with empty files (`user.handler.ts`, `user.schema.ts`, `user.service.ts`) | Scaffolded placeholder — populate or remove |
| `src/db/deseed.ts` | File is empty | Remove or implement |
| `EmailService.send()` | Logs a warning and does nothing | Wire to a real provider (Resend, Nodemailer, SES, etc.) |
| `processEmailJob()` in queues | Only logs — does not call `EmailService` | Connect to `EmailService` when provider is ready |
