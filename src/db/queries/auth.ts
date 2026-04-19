import type { Pool } from "pg";
import { z } from "zod";

const ExistingUserSchema = z.object({
    id: z.string().uuid(),
});

const LoginUserSchema = z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    password_hash: z.string().min(1),
});

const CurrentUserSchema = z.object({
    id: z.string().uuid(),
    email: z.string().email(),
});

export type ExistingUser = z.infer<typeof ExistingUserSchema>;
export type LoginUser = z.infer<typeof LoginUserSchema>;
export type CurrentUser = z.infer<typeof CurrentUserSchema>;

interface RegisterUserInput {
    email: string;
    passwordHash: string;
}

export const createAuthQueries = (db: Pool) => {
    const findUserIdByEmail = async (email: string): Promise<ExistingUser | null> => {
        const result = await db.query<ExistingUser>(
            `
            SELECT id
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

        return ExistingUserSchema.parse(user);
    };

    const insertUserWithAudit = async (input: RegisterUserInput): Promise<CurrentUser> => {
        const client = await db.connect();

        try {
            await client.query("BEGIN");

            const result = await client.query<CurrentUser>(
                `
                INSERT INTO users (email, password_hash)
                VALUES ($1, $2)
                RETURNING id, email
                `,
                [input.email, input.passwordHash],
            );
            const user = result.rows[0];

            if (!user) {
                throw new Error("Failed to create user");
            }

            await client.query(
                `
                INSERT INTO audit_logs (actor_user_id, action, entity, entity_id, metadata)
                VALUES ($1, $2, $3, $4, $5::jsonb)
                `,
                [user.id, "USER_CREATED", "users", user.id, JSON.stringify({ email: user.email })],
            );

            await client.query("COMMIT");

            return CurrentUserSchema.parse(user);
        } catch (error) {
            await client.query("ROLLBACK");
            throw error;
        } finally {
            client.release();
        }
    };

    const findUserForLogin = async (email: string): Promise<LoginUser | null> => {
        const result = await db.query<LoginUser>(
            `
            SELECT id, email, password_hash
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

        return LoginUserSchema.parse(user);
    };

    const getCurrentUser = async (userId: string): Promise<CurrentUser | null> => {
        const result = await db.query<CurrentUser>(
            `
            SELECT id, email
            FROM users
            WHERE id = $1
            LIMIT 1
            `,
            [userId],
        );
        const user = result.rows[0];

        if (!user) {
            return null;
        }

        return CurrentUserSchema.parse(user);
    };

    return {
        findUserForLogin,
        findUserIdByEmail,
        getCurrentUser,
        insertUserWithAudit,
    };
};
