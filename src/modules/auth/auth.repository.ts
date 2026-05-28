import { z } from "zod";
import { BaseRepository } from "~/shared/database/repositories";

const AuthUserRowSchema = z.object({
	id: z.string().uuid(),
	email: z.string().email(),
	password_hash: z.string(),
	is_active: z.boolean(),
	created_at: z.coerce.date(),
	updated_at: z.coerce.date(),
});

export type AuthUserRow = z.infer<typeof AuthUserRowSchema>;

export interface IAuthRepository {
	findByEmail(email: string): Promise<AuthUserRow | null>;
	findById(id: string): Promise<AuthUserRow | null>;
	createWithAudit(input: { email: string; passwordHash: string }): Promise<AuthUserRow>;
}

export class AuthRepository extends BaseRepository implements IAuthRepository {
	async findByEmail(email: string): Promise<AuthUserRow | null> {
		const rows = await this.db.query<AuthUserRow>(
			`SELECT id, email, password_hash, is_active, created_at, updated_at
             FROM users
             WHERE LOWER(email) = LOWER($1)
             LIMIT 1`,
			[email],
		);

		const row = rows[0];
		return row ? AuthUserRowSchema.parse(row) : null;
	}

	async findById(id: string): Promise<AuthUserRow | null> {
		const rows = await this.db.query<AuthUserRow>(
			`SELECT id, email, password_hash, is_active, created_at, updated_at
             FROM users
             WHERE id = $1
             LIMIT 1`,
			[id],
		);

		const row = rows[0];
		return row ? AuthUserRowSchema.parse(row) : null;
	}

	async createWithAudit(input: { email: string; passwordHash: string }): Promise<AuthUserRow> {
		return this.transaction(async (client) => {
			const result = await client.query<AuthUserRow>(
				`INSERT INTO users (email, password_hash)
                 VALUES ($1, $2)
                 RETURNING id, email, password_hash, is_active, created_at, updated_at`,
				[input.email, input.passwordHash],
			);

			const row = result.rows[0];
			if (!row) {
				throw new Error("Failed to create user");
			}

			await client.query(
				`INSERT INTO audit_logs (actor_user_id, action, entity, entity_id, metadata)
                 VALUES ($1, $2, $3, $4, $5::jsonb)`,
				[row.id, "USER_CREATED", "users", row.id, JSON.stringify({ email: row.email })],
			);

			return AuthUserRowSchema.parse(row);
		});
	}
}
