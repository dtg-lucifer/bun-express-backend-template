import type { Request, Response } from "express";
import { UnauthorizedError } from "~/shared/errors";
import { ErrorCode } from "~/shared/errors/errorCodes";
import { asyncHandler } from "~/shared/utils/asyncHandler";
import { createdResponse, successResponse } from "~/shared/utils/response";
import type { AuthRepository } from "./auth.repository";
import { AuthService } from "./auth.service";

export class AuthController {
    private readonly authService: AuthService;

    constructor(authRepository: AuthRepository) {
        this.authService = AuthService.withDebug(authRepository);
    }

    register = asyncHandler(async (req: Request, res: Response) => {
        const result = await this.authService.register(req.body);
        createdResponse(res, result, "User registered");
    });

    login = asyncHandler(async (req: Request, res: Response) => {
        const result = await this.authService.login(req.body);
        successResponse(res, result, "Login successful");
    });

    me = asyncHandler(async (req: Request, res: Response) => {
        const userId = req.user?.id;

        if (!userId) {
            throw new UnauthorizedError("User not authenticated", ErrorCode.UNAUTHORIZED);
        }

        const result = await this.authService.getCurrentUser(userId);
        successResponse(res, result, "Current user");
    });
}
