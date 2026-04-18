# backend-template-expressjs

Express + TypeScript backend template with:

- PostgreSQL via `pg`
- SQL migrations via `node-pg-migrate`
- Health route scaffold
- Basic auth routes (`register`, `login`, `me`)
- JWT auth middleware
- RBAC middleware starter
- Audit logging table + middleware hook

## Setup

1. Install dependencies:

```bash
pnpm install
```

2. Create `.env` with at least:

```bash
DATABASE_URL=postgres://postgres:postgres@localhost:5432/template_db
JWT_SECRET=replace-me
JWT_REFRESH_SECRET=replace-me
PORT=8989
HOST=localhost
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

3. Run migrations:

```bash
pnpm db:migrate
```

4. Start development server:

```bash
pnpm dev
```

## Database Scripts

- `pnpm db:migrate`
- `pnpm db:migrate:down`
- `pnpm db:migrate:status`
- `pnpm db:migrate:new <name>`

## Included Starter Routes

- `GET /api/v1/healthcheck`
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me` (JWT protected)
- `GET /api/v1/auth/admin-only` (JWT + RBAC `admin`)
