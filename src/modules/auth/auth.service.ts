import { compareHashedPassword, hashPassword } from "~/lib/password";
import type { IEventBus } from "~/shared/events";
import { eventBus } from "~/shared/events";
import { createDebugProxy } from "~/shared/logging";
import { generateAccessToken, generateRefreshToken } from "~/shared/middleware/auth.middleware";
import {
    AuthUserNotFoundError,
    InactiveUserError,
    InvalidCredentialsError,
    UserAlreadyExistsError,
} from "./auth.errors";
import type { AuthRepository, AuthUserRow } from "./auth.repository";
import type { AuthLoginResponse, AuthUser, LoginInput, RegisterInput } from "./auth.types";

function toAuthUser(user: AuthUserRow): AuthUser {
    return {
        id: user.id,
        email: user.email,
        isActive: user.is_active,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
    };
}

export class AuthService {
    constructor(
        private readonly authRepository: AuthRepository,
        private readonly events: IEventBus = eventBus,
    ) {}

    async register(input: RegisterInput): Promise<{ user: AuthUser }> {
        const existing = await this.authRepository.findByEmail(input.email);
        if (existing) {
            throw new UserAlreadyExistsError(input.email);
        }

        const passwordHash = await hashPassword(input.password);
        const user = await this.authRepository.createWithAudit({
            email: input.email,
            passwordHash,
        });

        this.events.emit("auth.user.registered", {
            userId: user.id,
            email: user.email,
        });

        return { user: toAuthUser(user) };
    }

    async login(input: LoginInput): Promise<AuthLoginResponse> {
        const user = await this.authRepository.findByEmail(input.email);

        if (!user) {
            throw new InvalidCredentialsError();
        }

        if (!user.is_active) {
            throw new InactiveUserError();
        }

        const passwordOk = await compareHashedPassword(input.password, user.password_hash);
        if (!passwordOk) {
            throw new InvalidCredentialsError();
        }

        const payload = { id: user.id, email: user.email };

        return {
            user: toAuthUser(user),
            tokens: {
                accessToken: generateAccessToken(payload),
                refreshToken: generateRefreshToken(payload),
            },
        };
    }

    async getCurrentUser(userId: string): Promise<{ user: AuthUser }> {
        const user = await this.authRepository.findById(userId);

        if (!user) {
            throw new AuthUserNotFoundError();
        }

        return { user: toAuthUser(user) };
    }

    static withDebug(authRepository: AuthRepository, events: IEventBus = eventBus): AuthService {
        return createDebugProxy(new AuthService(authRepository, events), "AuthService");
    }
}
