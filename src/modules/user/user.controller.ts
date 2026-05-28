import type { Request, Response } from "express";
import { Router } from "express";
import type { AppDependencies, AuthRequest } from "~/shared/middlewares";
import { asyncHandler, authenticate, validate } from "~/shared/middlewares";
import { sendResponse } from "~/shared/utils/api_response";
import { get_user_by_email_schema } from "./user.schema";
import { UserService } from "./user.service";

export class UserController {
	readonly router: Router;
	private readonly service: UserService;

	constructor(dependencies: AppDependencies) {
		this.router = Router();
		this.service = UserService.withDebug(dependencies.db);
		this.registerRoutes();
	}

	private registerRoutes(): void {
		this.router.get("/", authenticate, validate(get_user_by_email_schema), asyncHandler(this.getByEmail));
	}

	private getByEmail = async (req: Request, res: Response): Promise<void> => {
		const { email } = (req as AuthRequest).query as { email: string };
		const response = await this.service.getUserByEmail(email);
		sendResponse(res, response);
	};
}
