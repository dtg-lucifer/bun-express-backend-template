import type { AppDependencies } from "@core/middlewares";
import {
    type AuthRequest,
    asyncHandler,
    authenticate,
    generateRefreshToken,
    generateToken,
} from "@core/middlewares";
import { api_response } from "@core/utils/api_response.js";
import { type NextFunction, type Request, type Response, Router } from "express";
import { login_schema, register_schema } from "./auth.dto";
import { AuthService } from "./auth.service";

export const createAuthRouter = (dependencies: AppDependencies) => {
    const router = Router();
    const service = new AuthService(dependencies.db, dependencies.eventBus);

    router.post(
        "/register",
        asyncHandler(async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
            const parsed = register_schema.safeParse(req.body);
            if (!parsed.success) {
                const response = api_response.error(
                    "Invalid payload",
                    400,
                    parsed.error.flatten(),
                    res,
                );
                res.status(response.statusCode).json(response);
                return;
            }

            const user = await service.register(parsed.data);
            const response = api_response.success("User registered", { user }, 201, res);
            res.status(response.statusCode).json(response);
        }),
    );

    router.post(
        "/login",
        asyncHandler(async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
            const parsed = login_schema.safeParse(req.body);
            if (!parsed.success) {
                const response = api_response.error(
                    "Invalid payload",
                    400,
                    parsed.error.flatten(),
                    res,
                );
                res.status(response.statusCode).json(response);
                return;
            }

            const user = await service.login(parsed.data);
            const accessToken = generateToken(user);
            const refreshToken = generateRefreshToken(user);

            const response = api_response.success(
                "Login successful",
                {
                    user,
                    accessToken,
                    refreshToken,
                },
                200,
                res,
            );
            res.status(response.statusCode).json(response);
        }),
    );

    router.get(
        "/me",
        authenticate,
        asyncHandler(
            async (req: AuthRequest, res: Response, _next: NextFunction): Promise<void> => {
                if (!req.user) {
                    const response = api_response.error(
                        "User not authenticated",
                        401,
                        undefined,
                        res,
                    );
                    res.status(response.statusCode).json(response);
                    return;
                }

                const user = await service.getCurrentUser(req.user.id);
                if (!user) {
                    const response = api_response.error("User not found", 404, undefined, res);
                    res.status(response.statusCode).json(response);
                    return;
                }

                const response = api_response.success("Current user", { user }, 200, res);
                res.status(response.statusCode).json(response);
            },
        ),
    );

    return router;
};
