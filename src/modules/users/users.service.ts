import type { UserRow, UsersRepository } from "~/shared/database/repositories/users.repository";
import { createDebugProxy } from "~/shared/logging";
import { UserNotFoundError } from "./users.errors";
import type { UserResponse } from "./users.types";

function toResponse(user: UserRow): UserResponse {
    return {
        id: user.id,
        email: user.email,
        isActive: user.is_active,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
    };
}

export class UsersService {
    constructor(private readonly usersRepository: UsersRepository) {}

    async getUserByEmail(email: string): Promise<UserResponse> {
        const user = await this.usersRepository.findByEmail(email);
        if (!user) {
            throw new UserNotFoundError();
        }

        return toResponse(user);
    }

    async getCurrentUser(userId: string): Promise<UserResponse> {
        const user = await this.usersRepository.findById(userId);
        if (!user) {
            throw new UserNotFoundError();
        }

        return toResponse(user);
    }

    static withDebug(usersRepository: UsersRepository): UsersService {
        return createDebugProxy(new UsersService(usersRepository), "UsersService");
    }
}
