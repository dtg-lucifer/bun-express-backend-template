import type { Pool } from "pg";
import { z } from "zod";

const UserSchema = z.object({
	id: z.string().uuid(),
	email: z.string().email(),
	created_at: z.coerce.date(),
});

export type UserRecord = z.infer<typeof UserSchema>;

export class UserRepository {
	constructor(private readonly db: Pool) {}

	async getUserByEmail(email: string): Promise<UserRecord | null> {
		const result = await this.db.query<UserRecord>(
			`
            SELECT id, email, created_at
            FROM users
            WHERE email = $1
            LIMIT 1
            `,
			[email],
		);
		const user = result.rows[0];

		if (!user) {
			return null;
		}

		return UserSchema.parse(user);
	}
}

/** @deprecated Use `UserRepository` class directly */
export const createUserQueries = (db: Pool) => new UserRepository(db);
