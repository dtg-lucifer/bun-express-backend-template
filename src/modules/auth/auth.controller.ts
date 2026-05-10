import { type Response, Router } from "express";
import type { AppDependencies, AuthRequest } from "~/core/middlewares";
import { asyncHandler, authenticate, validate } from "~/core/middlewares";
import { sendResponse } from "~/core/utils/api_response";
import { login_schema, register_schema } from "./auth.schema";
import { AuthService } from "./auth.service";

export class AuthController {
    readonly router: Router;
    private readonly service: AuthService;

    constructor(dependencies: AppDependencies) {
        this.router = Router();
        this.service = AuthService.withDebug(dependencies.db, dependencies.eventBus);
        this.registerRoutes();
    }

    private registerRoutes(): void {
        this.router.post("/register", validate(register_schema), asyncHandler(this.register));
        this.router.post("/login", validate(login_schema), asyncHandler(this.login));
        this.router.get("/me", authenticate, asyncHandler(this.me));
    }

    private register = async (req: AuthRequest, res: Response): Promise<void> => {
        const response = await this.service.register(req.body);
        sendResponse(res, response);
    };

    private login = async (req: AuthRequest, res: Response): Promise<void> => {
        const response = await this.service.login(req.body);
        sendResponse(res, response);
    };

    private me = async (req: AuthRequest, res: Response): Promise<void> => {
        if (!req.user) {
            return sendResponse(res, {
                success: false,
                message: "User not authenticated",
                statusCode: 401,
            });
        }
        const response = await this.service.getCurrentUser(req.user.id);
        sendResponse(res, response);
    };
}
