import type { Pool } from "pg";
import { compareHashedPassword, hashPassword } from "@lib/password";
import type { LoginInput, RegisterInput } from "./auth.dto";

interface DbUser {
    id: string;
    email: string;
    password_hash: string;
    role: string;
}

export class AuthService {
    constructor(private readonly db: Pool) {}

    async register(input: RegisterInput) {
        const existing = await this.db.query<{ id: string }>(
            "SELECT id FROM users WHERE email = $1 LIMIT 1",
            [input.email],
        );

        if (existing.rowCount && existing.rowCount > 0) {
            throw new Error("Email already registered");
        }

        const selectedRole = input.role || "user";
        const roleResult = await this.db.query<{ id: number; name: string }>(
            "SELECT id, name FROM roles WHERE name = $1 LIMIT 1",
            [selectedRole],
        );

        const roleId = roleResult.rows[0]?.id;
        if (!roleId) {
            throw new Error("Invalid role");
        }

        const passwordHash = await hashPassword(input.password);

        const insertResult = await this.db.query<{ id: string; email: string; role: string }>(
            `
            INSERT INTO users (email, password_hash, role_id)
            VALUES ($1, $2, $3)
            RETURNING id, email, (SELECT name FROM roles WHERE id = role_id) AS role
            `,
            [input.email, passwordHash, roleId],
        );

        return insertResult.rows[0];
    }

    async login(input: LoginInput) {
        const result = await this.db.query<DbUser>(
            `
            SELECT users.id, users.email, users.password_hash, roles.name AS role
            FROM users
            JOIN roles ON users.role_id = roles.id
            WHERE users.email = $1
            LIMIT 1
            `,
            [input.email],
        );

        const user = result.rows[0];
        if (!user) {
            throw new Error("Invalid email or password");
        }

        const passwordOk = await compareHashedPassword(input.password, user.password_hash);
        if (!passwordOk) {
            throw new Error("Invalid email or password");
        }

        return {
            id: user.id,
            email: user.email,
            role: user.role,
        };
    }

    async getCurrentUser(userId: string) {
        const result = await this.db.query<{ id: string; email: string; role: string }>(
            `
            SELECT users.id, users.email, roles.name AS role
            FROM users
            JOIN roles ON users.role_id = roles.id
            WHERE users.id = $1
            LIMIT 1
            `,
            [userId],
        );

        return result.rows[0] || null;
    }
}
