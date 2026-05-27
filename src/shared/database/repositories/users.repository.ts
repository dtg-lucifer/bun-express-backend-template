import { z } from "zod";
import { BaseRepository } from "./base.repository";

// ── Row schema ────────────────────────────────────────────────────────────────

const UserRowSchema = z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    password_hash: z.string(),
    is_active: z.boolean(),
    created_at: z.coerce.date(),
    updated_at: z.coerce.date(),
});

export type UserRow = z.infer<typeof UserRowSchema>;

// ── Repository ────────────────────────────────────────────────────────────────

export class UsersRepository extends BaseRepository {
    async findById(id: string): Promise<UserRow | null> {
        const rows = await this.db.query<UserRow>(
            `SELECT id, email, password_hash, is_active, created_at, updated_at
             FROM users WHERE id = $1 LIMIT 1`,
            [id],
        );
        const row = rows[0];
        if (!row) return null;
        return UserRowSchema.parse(row);
    }

    async findByEmail(email: string): Promise<UserRow | null> {
        const rows = await this.db.query<UserRow>(
            `SELECT id, email, password_hash, is_active, created_at, updated_at
             FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1`,
            [email],
        );
        const row = rows[0];
        if (!row) return null;
        return UserRowSchema.parse(row);
    }

    async create(data: { email: string; passwordHash: string }): Promise<UserRow> {
        const client = await this.db.connect();
        try {
            await client.query("BEGIN");

            const result = await client.query<UserRow>(
                `INSERT INTO users (email, password_hash)
                 VALUES ($1, $2)
                 RETURNING id, email, password_hash, is_active, created_at, updated_at`,
                [data.email, data.passwordHash],
            );
            const row = result.rows[0];
            if (!row) throw new Error("Failed to create user");

            await client.query(
                `INSERT INTO audit_logs (actor_user_id, action, entity, entity_id, metadata)
                 VALUES ($1, $2, $3, $4, $5::jsonb)`,
                [row.id, "USER_CREATED", "users", row.id, JSON.stringify({ email: row.email })],
            );

            await client.query("COMMIT");
            return UserRowSchema.parse(row);
        } catch (err) {
            await client.query("ROLLBACK");
            throw err;
        } finally {
            client.release();
        }
    }

    async update(id: string, data: Partial<{ isActive: boolean }>): Promise<UserRow | null> {
        const setClauses: string[] = [];
        const values: unknown[] = [];

        if (data.isActive !== undefined) {
            setClauses.push(`is_active = $${values.length + 1}`);
            values.push(data.isActive);
        }

        if (setClauses.length === 0) return this.findById(id);

        const rows = await this.db.query<UserRow>(
            `UPDATE users
             SET ${setClauses.join(", ")}, updated_at = CURRENT_TIMESTAMP
             WHERE id = $${values.length + 1}
             RETURNING id, email, password_hash, is_active, created_at, updated_at`,
            [...values, id],
        );
        const row = rows[0];
        if (!row) return null;
        return UserRowSchema.parse(row);
    }
}
