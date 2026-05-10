import type { Pool } from "pg";
import { type ApiResponse, api_response } from "~/core/utils/api_response";
import { createDebugProxy } from "~/core/utils/debug_proxy";
import { UserRepository } from "~/db/queries";

export class UserService {
    private readonly repo: UserRepository;

    constructor(db: Pool) {
        this.repo = new UserRepository(db);
    }

    async getUserByEmail(email: string): Promise<ApiResponse> {
        const user = await this.repo.getUserByEmail(email);

        if (!user) {
            return api_response.error("User not found", 404);
        }

        return api_response.success("User found", { user }, 200);
    }

    /**
     * Returns a debug-proxied instance of this service that logs every method
     * call (args, duration, errors) via the project logger at `debug` level.
     */
    static withDebug(db: Pool): UserService {
        return createDebugProxy(new UserService(db), "UserService");
    }
}
