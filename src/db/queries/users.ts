import type { Pool } from "pg";
import { z } from "zod";

const UserSchema = z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    created_at: z.coerce.date(),
});

export type UserRecord = z.infer<typeof UserSchema>;

export const createUserQueries = (db: Pool) => {
    const getUserByEmail = async (email: string): Promise<UserRecord | null> => {
        const result = await db.query<UserRecord>(
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
    };

    return {
        getUserByEmail,
    };
};
