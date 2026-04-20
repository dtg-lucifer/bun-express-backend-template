import type { Pool } from "pg";
import type { DomainEventBus } from "~/core/events";
import { createAuthQueries } from "~/db/queries";
import { compareHashedPassword, hashPassword } from "~/lib/password";
import type { LoginInput, RegisterInput } from "./auth.schema";

export class AuthService {
    private readonly authQueries: ReturnType<typeof createAuthQueries>;

    constructor(
        db: Pool,
        private readonly eventBus: DomainEventBus,
    ) {
        this.authQueries = createAuthQueries(db);
    }

    async register(input: RegisterInput) {
        const existing = await this.authQueries.findUserIdByEmail(input.email);
        if (existing) {
            throw new Error("Email already registered");
        }

        const passwordHash = await hashPassword(input.password);

        const user = await this.authQueries.insertUserWithAudit({
            email: input.email,
            passwordHash,
        });

        this.eventBus.emit("auth.user.registered", {
            userId: user.id,
            email: user.email,
        });

        return user;
    }

    async login(input: LoginInput) {
        const user = await this.authQueries.findUserForLogin(input.email);

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
        };
    }

    async getCurrentUser(userId: string) {
        return this.authQueries.getCurrentUser(userId);
    }
}
