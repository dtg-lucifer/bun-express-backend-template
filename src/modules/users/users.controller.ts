import type { Request, Response } from "express";
import { ErrorCode, UnauthorizedError } from "~/shared/errors";
import { asyncHandler } from "~/shared/utils/asyncHandler";
import { successResponse } from "~/shared/utils/response";
import type { IUsersService } from "./users.service";

export class UsersController {
	constructor(private readonly usersService: IUsersService) {}

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
