import { Router } from "express";
import type { Response } from "express";
import type { AppDependencies, AuthRequest } from "~/core/middlewares";
import { asyncHandler, authenticate, validate } from "~/core/middlewares";
import { sendResponse } from "~/core/utils/api_response";
import { login_schema, register_schema } from "./auth.schema";
import { AuthService } from "./auth.service";

export const createAuthRouter = (dependencies: AppDependencies) => {
    const router = Router();
    const service = new AuthService(dependencies.db, dependencies.eventBus);

    const c = {
        register: asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
            const response = await service.register(req.body);
            sendResponse(res, response);
        }),

        login: asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
            const response = await service.login(req.body);
            sendResponse(res, response);
        }),

        me: asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
            if (!req.user) {
                return sendResponse(res, {
                    success: false,
                    message: "User not authenticated",
                    statusCode: 401,
                });
            }
            const response = await service.getCurrentUser(req.user.id);
            sendResponse(res, response);
        }),
    };

    router.post("/register", validate(register_schema), c.register);
    router.post("/login", validate(login_schema), c.login);
    router.get("/me", authenticate, c.me);

    return router;
};
