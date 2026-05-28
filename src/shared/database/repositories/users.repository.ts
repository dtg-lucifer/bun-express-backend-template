import { z } from "zod";
import { BaseRepository } from "./base.repository";

const UserRowSchema = z.object({
	id: z.uuid(),
	email: z.email(),
	password_hash: z.string(),
	is_active: z.boolean(),
	created_at: z.coerce.date(),
	updated_at: z.coerce.date(),
});

export type UserRow = z.infer<typeof UserRowSchema>;

export interface IUsersRepository {
	findById(id: string): Promise<UserRow | null>;
	findByEmail(email: string): Promise<UserRow | null>;
	create(data: { email: string; passwordHash: string }): Promise<UserRow>;
	update(id: string, data: Partial<{ isActive: boolean }>): Promise<UserRow | null>;
}

export class UsersRepository extends BaseRepository implements IUsersRepository {
	async findById(id: string): Promise<UserRow | null> {
		const rows = await this.db.query<UserRow>(
			`SELECT id, email, password_hash, is_active, created_at, updated_at
             FROM users WHERE id = $1 LIMIT 1`,
			[id],
		);
		const row = rows[0];
		if (!row) {
			return null;
		}

		return UserRowSchema.parse(row);
	}

	async findByEmail(email: string): Promise<UserRow | null> {
		const rows = await this.db.query<UserRow>(
			`
			SELECT id, email, password_hash, is_active, created_at, updated_at
			FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1
		`,
			[email],
		);
		const row = rows[0];
		if (!row) {
			return null;
		}

		return UserRowSchema.parse(row);
	}

	async create(data: { email: string; passwordHash: string }): Promise<UserRow> {
		return this.transaction(async (client) => {
			const result = await client.query<UserRow>(
				`INSERT INTO users (email, password_hash)
                 VALUES ($1, $2)
                 RETURNING id, email, password_hash, is_active, created_at, updated_at`,
				[data.email, data.passwordHash],
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

			return UserRowSchema.parse(row);
		});
	}

	async update(id: string, data: Partial<{ isActive: boolean }>): Promise<UserRow | null> {
		const setClauses: string[] = [];
		const values: unknown[] = [];

		if (data.isActive !== undefined) {
			setClauses.push(`is_active = $${values.length + 1}`);
			values.push(data.isActive);
		}

		if (setClauses.length === 0) {
			return this.findById(id);
		}

		const rows = await this.db.query<UserRow>(
			`UPDATE users
             SET ${setClauses.join(", ")}, updated_at = CURRENT_TIMESTAMP
             WHERE id = $${values.length + 1}
             RETURNING id, email, password_hash, is_active, created_at, updated_at`,
			[...values, id],
		);
		const row = rows[0];
		if (!row) {
			return null;
		}

		return UserRowSchema.parse(row);
	}
}
