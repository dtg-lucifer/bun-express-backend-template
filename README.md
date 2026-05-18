# backend-template-expressjs

Express + TypeScript + Bun backend template focused on fast iteration and production-ready structure.

## What this template includes

- PostgreSQL access via `pg` with connection pooling
- Query modules in `src/db/queries` (SQL stays out of services)
- SQL migrations via `node-pg-migrate`
- Explicit route registry — mount routers in `src/modules/index.ts`
- Zod validation middleware (`validate(schema)`) applied per-route
- Service-layer response pattern — services return `ApiResponse`, handlers just send
- Zod-to-OpenAPI docs with Scalar UI (schemas defined once in Zod for both validation and docs)
- JWT authentication middleware (access + refresh tokens)
- Typed domain event bus (Node `EventEmitter` wrapper)
- Socket.IO realtime support (same HTTP server port)
- BullMQ job queue (API process enqueues, separate worker process consumes)
- Winston structured logging — console level is config-driven, files always capture everything
- Per-request UUID (`X-Request-ID` header)
- Audit logging — every authenticated request is written to `audit_logs`
- Scalar UI at `/api/v1/docs`

For a full explanation of every component, see [WORKFLOW.md](WORKFLOW.md).

---

## Setup

### 1. Install dependencies

```bash
bun install
```

### 2. Start infrastructure (PostgreSQL + Redis)

```bash
make db
```

### 3. Create `.env`

```bash
cp .env.example .env
```

Minimum required values:

```env
DATABASE_URL=postgresql://piush:root_access@localhost:5432/test_db
REDIS_URL=redis://localhost:6379
JWT_SECRET=replace-me
JWT_REFRESH_SECRET=replace-me
PORT=8998
HOST=0.0.0.0
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

### 4. Run database migrations

```bash
bun run db:migrate
```

### 5. Start the API server

```bash
bun run dev
```

### 6. (Optional) Start the BullMQ worker

```bash
bun run worker:dev
```

---

## Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Start API in watch mode |
| `bun run build` | Bundle to `dist/` |
| `bun run start` | Run built bundle |
| `bun run worker:dev` | Start BullMQ worker in watch mode |
| `bun run worker:start` | Start BullMQ worker (no watch) |
| `bun run typecheck` | TypeScript type check (no emit) |
| `bun run lint` | Biome lint check |
| `bun run lint:fix` | Biome lint + auto-fix |
| `bun run format` | Biome format |
| `bun run docs:generate` | Generate OpenAPI spec to `openapi.yaml` |
| `bun run db:migrate` | Apply pending migrations |
| `bun run db:migrate:status` | Show migration status |
| `bun run db:migrate:down` | Roll back one migration |
| `bun run db:migrate:new -- <name>` | Create a new SQL migration file |

---

## Docker Compose

Local infrastructure lives in `docker/docker-compose.yaml`.

```bash
make db        # PostgreSQL + Redis only
make worker    # BullMQ worker container
make infra     # PostgreSQL + Redis + worker
```

---

## Project Structure

```
src/
  index.ts                  API entrypoint
  workers/index.ts          BullMQ worker entrypoint (separate process)
  config/index.ts           Config manager — validates config.yaml + env vars
  core/
    server.ts               Server class — wires all subsystems
    events/bus.ts           Typed domain event bus
    queues/index.ts         BullMQ queue + worker factory
    realtime/socket.ts      Socket.IO setup
    middlewares/            All Express middleware (logger, jwt, validation, audit, etc.)
    routes/                 (legacy location — now use src/modules/index.ts)
    utils/                  api_response, sendResponse, time, email, cache, types, debug_proxy
  db/
    queries/                SQL query functions (one file per domain)
    migrations/             SQL migration files
  modules/
    index.ts                Route registry — mount routers here
    auth/                   auth.routes.ts, auth.service.ts, auth.schema.ts, auth.events.ts
    health/                 health.ts
    user/                   (scaffolded, empty)
  lib/
    password.ts             PBKDF2-SHA512 hash + compare
    shutdown.ts             Graceful shutdown handler
docs/
  (removed — docs are now generated from *.openapi.ts files)
```

---

## Adding a New Route Module

1. Create the module directory:
    ```
    src/modules/<name>/
      <name>.schema.ts    Zod schemas (wrap fields under body/params/query)
      <name>.service.ts   Business logic returning ApiResponse
      <name>.routes.ts    Router with validate() + controller + route declarations
      <name>.openapi.ts   OpenAPI path registrations via zod-to-openapi registry
    ```

2. Register the router in `src/modules/index.ts`:
    ```ts
    app.use(`${apiPrefix}/your-module`, createYourRouter(dependencies));
    ```

3. Add OpenAPI docs:
    ```ts
    // src/modules/<name>/<name>.openapi.ts
    import { registry } from "~/config/openapi";
    
    registry.registerPath({
      method: "post",
      path: "/your-module",
      summary: "Create a thing",
      request: { body: create_thing_schema },
      responses: {
        201: { description: "Thing created" },
        400: { description: "Bad request" },
      },
    });
    ```
    Add `import "~/modules/<name>/<name>.openapi"` to both `src/core/server.ts` and `src/scripts/generate-openapi.ts`.

### Schema convention

Schemas must wrap fields under `body`, `params`, or `query` so the `validate()` middleware can parse and assign them correctly:

```ts
export const create_thing_schema = z.object({
  body: z.object({
    name: z.string().min(1),
  }),
  params: z.object({
    id: z.string().uuid(),
  }),
});
```

### Service convention

Services return `ApiResponse` — no access to `res`:

```ts
async createThing(input: CreateThingInput): Promise<ApiResponse> {
  const thing = await this.queries.insert(input);
  return api_response.success("Thing created", { thing }, 201);
}
```

### Route handler convention

```ts
const c = {
  create: asyncHandler(async (req, res) => {
    const response = await service.createThing(req.body);
    sendResponse(res, response);
  }),
};

router.post("/", validate(create_thing_schema), c.create);
```

---

## Feature Flags (`config.yaml`)

Toggle infrastructure — not individual HTTP routes:

| Flag | Effect |
|------|--------|
| `realtime.socketio.enabled` | Attach Socket.IO to the HTTP server |
| `queues.bullmq.enabled` | Create BullMQ queue clients in the API process |
| `workers.process.enabled` | Worker entrypoint runs (false = immediate exit) |
| `workers.notification_jobs.enabled` | Email worker starts and jobs are enqueued |

Combine `queues.bullmq.enabled: false` + `workers.process.enabled: false` to run without Redis entirely.

---

## Logging

Console output level is controlled by `config.yaml → logging.level`. File transports always capture everything regardless of this setting.

| Level | Console shows |
|-------|--------------|
| `error` | errors only |
| `warn` | errors + warnings |
| `info` | errors + warnings + info |
| `http` | all of the above + HTTP request logs |
| `debug` | everything |

Log files:
- `logs/app.log` — all levels
- `logs/error.log` — errors only

---

## Migrations

```bash
# Create a new migration
bun run db:migrate:new -- add_posts_table

# Apply all pending
bun run db:migrate

# Check status
bun run db:migrate:status

# Roll back one
bun run db:migrate:down
```

Migration file format:

```sql
-- migrate:up
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- migrate:down
DROP TABLE IF EXISTS posts;
```

---

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/health` | — | Server health, DB ping, memory, uptime |
| `POST` | `/api/v1/auth/register` | — | Register a new user |
| `POST` | `/api/v1/auth/login` | — | Login, returns access + refresh tokens |
| `GET` | `/api/v1/auth/me` | Bearer | Current authenticated user |

Scalar UI: `http://localhost:8998/api/v1/docs`
