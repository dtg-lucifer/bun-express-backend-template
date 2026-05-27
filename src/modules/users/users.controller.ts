import type { Request, Response } from "express";
import type { UsersRepository } from "~/shared/database/repositories/users.repository";
import { UnauthorizedError } from "~/shared/errors";
import { ErrorCode } from "~/shared/errors/errorCodes";
import { asyncHandler } from "~/shared/utils/asyncHandler";
import { successResponse } from "~/shared/utils/response";
import { UsersService } from "./users.service";

export class UsersController {
    private readonly usersService: UsersService;

    constructor(usersRepository: UsersRepository) {
        this.usersService = UsersService.withDebug(usersRepository);
    }

    getUserByEmail = asyncHandler(async (req: Request, res: Response) => {
        const query = req.query as { email: string };
        const user = await this.usersService.getUserByEmail(query.email);
        successResponse(res, { user }, "User found");
    });

    me = asyncHandler(async (req: Request, res: Response) => {
        const userId = req.user?.id;
        if (!userId) {
            throw new UnauthorizedError("User not authenticated", ErrorCode.UNAUTHORIZED);
        }

        const user = await this.usersService.getCurrentUser(userId);
        successResponse(res, { user }, "Current user");
    });
}
