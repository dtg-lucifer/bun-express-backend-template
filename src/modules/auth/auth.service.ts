import type { Pool } from "pg";
import type { DomainEventBus } from "~/core/events";
import { type ApiResponse, api_response } from "~/core/utils/api_response";
import { createAuthQueries } from "~/db/queries";
import { compareHashedPassword, hashPassword } from "~/lib/password";
import { generateRefreshToken, generateToken } from "~/core/middlewares";
import type { LoginInput, RegisterInput } from "./auth.schema";

export class AuthService {
    private readonly authQueries: ReturnType<typeof createAuthQueries>;

    constructor(
        db: Pool,
        private readonly eventBus: DomainEventBus,
    ) {
        this.authQueries = createAuthQueries(db);
    }

    async register(input: RegisterInput): Promise<ApiResponse> {
        const existing = await this.authQueries.findUserIdByEmail(input.email);
        if (existing) {
            return api_response.error("Email already registered", 409);
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

        return api_response.success("User registered", { user }, 201);
    }

    async login(input: LoginInput): Promise<ApiResponse> {
        const user = await this.authQueries.findUserForLogin(input.email);

        if (!user) {
            return api_response.error("Invalid email or password", 401);
        }

        const passwordOk = await compareHashedPassword(input.password, user.password_hash);
        if (!passwordOk) {
            return api_response.error("Invalid email or password", 401);
        }

        const payload = { id: user.id, email: user.email };
        const accessToken = generateToken(payload);
        const refreshToken = generateRefreshToken(payload);

        return api_response.success(
            "Login successful",
            { user: payload, accessToken, refreshToken },
            200,
        );
    }

    async getCurrentUser(userId: string): Promise<ApiResponse> {
        const user = await this.authQueries.getCurrentUser(userId);

        if (!user) {
            return api_response.error("User not found", 404);
        }

        return api_response.success("Current user", { user }, 200);
    }
}
