import type { Request, Response } from "express";
import { ErrorCode, UnauthorizedError } from "~/shared/errors";
import { asyncHandler } from "~/shared/utils/asyncHandler";
import { createdResponse, successResponse } from "~/shared/utils/response";
import type { IAuthService } from "./auth.service";

export class AuthController {
	constructor(private readonly authService: IAuthService) {}

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
