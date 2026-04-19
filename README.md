# backend-template-expressjs

Express + TypeScript + Bun backend template focused on fast iteration and production-ready structure.

## What this template includes

- PostgreSQL access via `pg` with connection pooling
- Query modules in `src/db/queries` (keep SQL out of services)
- SQL migrations via `node-pg-migrate` (SQL files)
- Route module registry for easy route onboarding
- TypeSpec docs split per route (`docs/routes/*.tsp`)
- JWT middleware starter
- Typed domain event bus (EventEmitter)
- Socket.IO realtime support
- BullMQ queue support (Bun worker + Redis)
- Audit logging hooks

## Setup (Bun)

1. Install dependencies:

```bash
bun install
```

2. Create `.env`:

```bash
DATABASE_URL=postgres://postgres:postgres@localhost:5432/template_db
REDIS_URL=redis://localhost:6379
JWT_SECRET=replace-me
JWT_REFRESH_SECRET=replace-me
PORT=8989
HOST=localhost
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

3. Run database migrations:

```bash
bun run db:migrate
```

4. Start API server:

```bash
bun run dev
```

5. (Optional) Start BullMQ worker:

```bash
bun run worker:dev
```

## Scripts

- `bun run dev` - Start API in watch mode
- `bun run worker:dev` - Start BullMQ worker in watch mode
- `bun run worker:start` - Start BullMQ worker (no watch)
- `bun run docs:build` - Compile TypeSpec to OpenAPI
- `bun run docs:watch` - Watch TypeSpec and recompile docs
- `bun run db:migrate` - Apply migrations
- `bun run db:migrate:status` - Show migration status
- `bun run db:migrate:down` - Roll back one migration
- `bun run db:migrate:new -- <name>` - Create SQL migration file

## Docker compose

Local infra and worker support live in `docker/docker-compose.yaml`.

- PostgreSQL + Redis:

```bash
make db
```

- BullMQ worker container:

```bash
make worker
```

- Full infra:

```bash
make infra
```

## Route + docs workflow

HTTP routes are **not** feature-flagged in `config.yaml` (paths differ per project). Mount routers explicitly in code.

To add a new route module quickly:

1. Add route handler in `src/modules/<module>/<module>.handler.ts`.
2. Register the router in `src/core/routes/index.ts` (`registerHttpRoutes`) with the desired path prefix.
3. Add TypeSpec file in `docs/routes/<module>.tsp`.
4. Import the TypeSpec route file in `docs/main.tsp`.
5. Run `bun run docs:build`.

## Feature flags (`config.yaml`)

Toggle infrastructure, not individual HTTP routes:

| Section | Effect |
|--------|--------|
| `realtime.socketio.enabled` | When `false`, Socket.IO is not attached to the HTTP server. |
| `queues.bullmq.enabled` | When `false`, queue clients / event handlers that enqueue jobs are skipped in the API process. |
| `workers.process.enabled` | When `false`, the standalone worker entrypoint (`worker:start` / `worker:dev`) exits immediately. |
| `workers.notification_jobs.enabled` | When `false`, welcome-email (notification-style) jobs are not enqueued and the BullMQ email worker is not started. |

Combine `queues.bullmq.enabled: false` with `workers.process.enabled: false` if you do not use Redis queues at all.

### TypeSpec conventions

- Keep shared response/domain models in `docs/models/common.tsp`.
- Keep each route group documentation in its own `docs/routes/*.tsp` file.
- Keep `docs/main.tsp` as the only entry file and import all models/routes there.

## Migrations workflow (SQL)

Create a migration file:

```bash
bun run db:migrate:new -- add_users_table
```

Apply and inspect migrations:

```bash
bun run db:migrate
bun run db:migrate:status
bun run db:migrate:down
```

Migration file format:

```sql
-- migrate:up
CREATE TABLE IF NOT EXISTS example_table (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	name TEXT NOT NULL,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- migrate:down
DROP TABLE IF EXISTS example_table;
```

## Query-layer workflow

Use `src/db/queries` to keep SQL centralized and testable.

Example read query pattern (`src/db/queries/users.ts`):

```ts
const result = await db.query(
	`
	SELECT id, email, created_at
	FROM users
	WHERE email = $1
	LIMIT 1
	`,
	[email],
);

const user = result.rows[0];
```

Example write transaction pattern (`pg` client transaction):

```ts
const client = await db.connect();

try {
	await client.query("BEGIN");

	const result = await client.query(
		`
		INSERT INTO users (email)
		VALUES ($1)
		RETURNING *
		`,
		[email],
	);
	const user = result.rows[0];

	await client.query(
		`INSERT INTO audit_logs (action) VALUES ($1)`,
		["USER_CREATED"],
	);

	await client.query("COMMIT");
	return user;
} catch (error) {
	await client.query("ROLLBACK");
	throw error;
} finally {
	client.release();
}
```

## Included starter endpoints

- `GET /api/v1/healthcheck`
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`
