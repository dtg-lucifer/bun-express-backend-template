import type { Pool } from "pg";
import type { DomainEventBus } from "~/core/events";
import { type ApiResponse, api_response } from "~/core/utils/api_response";
import { createDebugProxy } from "~/core/utils/debug_proxy";
import { AuthRepository } from "~/db/queries";
import { compareHashedPassword, hashPassword } from "~/lib/password";
import { generateRefreshToken, generateToken } from "~/core/middlewares";
import type { LoginInput, RegisterInput } from "./auth.schema";

export class AuthService {
    private readonly repo: AuthRepository;

    constructor(
        db: Pool,
        private readonly eventBus: DomainEventBus,
    ) {
        this.repo = new AuthRepository(db);
    }

    async register(input: RegisterInput): Promise<ApiResponse> {
        const existing = await this.repo.findUserIdByEmail(input.email);
        if (existing) {
            return api_response.error("Email already registered", 409);
        }

        const passwordHash = await hashPassword(input.password);
        const user = await this.repo.insertUserWithAudit({
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
        const user = await this.repo.findUserForLogin(input.email);

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
        const user = await this.repo.getCurrentUser(userId);

        if (!user) {
            return api_response.error("User not found", 404);
        }

        return api_response.success("Current user", { user }, 200);
    }

    /**
     * Returns a debug-proxied instance of this service that logs every method
     * call (args, duration, errors) via the project logger at `debug` level.
     */
    static withDebug(db: Pool, eventBus: DomainEventBus): AuthService {
        return createDebugProxy(new AuthService(db, eventBus), "AuthService");
    }
}
