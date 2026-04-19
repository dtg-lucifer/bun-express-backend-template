# AGENTS.md

Guidance for AI coding agents working in this repository.

## What This Project Is

Express + TypeScript backend running on Bun, with PostgreSQL (`pg`), BullMQ + Redis, Socket.IO, TypeSpec docs, and Biome lint/format.

Primary overview: [README.md](README.md)

## Fast Start Commands

- Install: `bun install`
- Dev API: `bun run dev`
- Dev worker: `bun run worker:dev`
- Typecheck: `bun run typecheck`
- Lint: `bun run lint`
- Format: `bun run format`
- Migrations up: `bun run db:migrate`
- Migration status: `bun run db:migrate:status`
- New SQL migration: `bun run db:migrate:new -- <name>`
- Build docs: `bun run docs:build`

Infra shortcuts: [Makefile](Makefile), [docker/docker-compose.yaml](docker/docker-compose.yaml)

## Architecture Map

- API entrypoint: [src/index.ts](src/index.ts)
- Worker entrypoint: [src/workers/index.ts](src/workers/index.ts)
- Server composition and wiring: [src/core/server.ts](src/core/server.ts)
- Route registry (explicit mount points): [src/core/routes/index.ts](src/core/routes/index.ts)
- Middlewares and auth/audit behavior: [src/core/middlewares](src/core/middlewares)
- Domain events bus: [src/core/events/bus.ts](src/core/events/bus.ts)
- Queue integration: [src/core/queues/index.ts](src/core/queues/index.ts)
- Business modules: [src/modules](src/modules)
- DB queries and migrations: [src/db/queries](src/db/queries), [src/db/migrations](src/db/migrations)
- Runtime config: [src/config/index.ts](src/config/index.ts), [config.yaml](config.yaml)

## Conventions To Follow

- Keep business logic in `*.service.ts`, transport concerns in `*.handler.ts`, validation in `*.dto.ts`.
- Keep SQL in `src/db/queries/*`; avoid embedding SQL in handlers/services.
- Wrap async Express handlers with `asyncHandler` from [src/core/middlewares/index.ts](src/core/middlewares/index.ts).
- Use existing response helpers and error types in [src/core/utils/api_response.ts](src/core/utils/api_response.ts).
- Prefer path aliases from [tsconfig.json](tsconfig.json) (for example `~/core/*`, `~/modules/*`, `~/db/*`) over deep relative imports.
- Keep changes scoped and consistent with current module/file layout.

## Important Project Behaviors

- HTTP routes are code-registered in [src/core/routes/index.ts](src/core/routes/index.ts); they are not auto-enabled from `config.yaml`.
- Queue behavior depends on feature flags in [config.yaml](config.yaml):
  - `queues.bullmq.enabled`
  - `workers.process.enabled`
  - `workers.notification_jobs.enabled`
- Realtime Socket.IO attachment is controlled by `realtime.socketio.enabled` in [config.yaml](config.yaml).
- Runtime secrets come from environment variables (see [README.md](README.md) and [src/config/index.ts](src/config/index.ts)).

## Editing Guardrails

- Do not introduce new frameworks or large structural rewrites unless explicitly requested.
- Reuse existing utilities (logging, API response, auth middleware, event bus) before adding new abstractions.
- If adding endpoints:
  1. Add handler/service/dto in the relevant module.
  2. Register route in [src/core/routes/index.ts](src/core/routes/index.ts).
  3. Update TypeSpec docs in [docs/routes](docs/routes) and [docs/main.tsp](docs/main.tsp).

## Validation Before Hand-off

Run the smallest relevant checks for your change:

- `bun run typecheck`
- `bun run lint`
- `bun run db:migrate:status` (if migration-related)
- `bun run docs:build` (if API docs/typespec changed)

## Existing Reusable Skill

Project-local backend skill: [.agents/skills/nodejs-backend-patterns/SKILL.md](.agents/skills/nodejs-backend-patterns/SKILL.md)
