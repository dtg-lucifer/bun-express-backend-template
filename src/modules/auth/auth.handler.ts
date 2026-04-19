import { type Request, type Response, Router } from "express";
import type { AppDependencies } from "@core/middlewares";
import { api_response } from "@core/utils/api_response";
import {
    authenticate,
    type AuthRequest,
    generateRefreshToken,
    generateToken,
} from "@core/middlewares";
import { login_schema, register_schema } from "./auth.dto";
import { AuthService } from "./auth.service";

export const createAuthRouter = (dependencies: AppDependencies) => {
    const router = Router();
    const service = new AuthService(dependencies.db, dependencies.eventBus);

    router.post("/register", async (req: Request, res: Response) => {
        const parsed = register_schema.safeParse(req.body);
        if (!parsed.success) {
            const response = api_response.error(
                "Invalid payload",
                400,
                parsed.error.flatten(),
                res,
            );
            return res.status(response.statusCode).json(response);
        }

        try {
            const user = await service.register(parsed.data);
            const response = api_response.success("User registered", { user }, 201, res);
            return res.status(response.statusCode).json(response);
        } catch (error) {
            const response = api_response.error(
                String((error as Error).message),
                400,
                undefined,
                res,
            );
            return res.status(response.statusCode).json(response);
        }
    });

    router.post("/login", async (req: Request, res: Response) => {
        const parsed = login_schema.safeParse(req.body);
        if (!parsed.success) {
            const response = api_response.error(
                "Invalid payload",
                400,
                parsed.error.flatten(),
                res,
            );
            return res.status(response.statusCode).json(response);
        }

        try {
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
            return res.status(response.statusCode).json(response);
        } catch (error) {
            const response = api_response.error(
                String((error as Error).message),
                401,
                undefined,
                res,
            );
            return res.status(response.statusCode).json(response);
        }
    });

    router.get("/me", authenticate, async (req: AuthRequest, res: Response) => {
        if (!req.user) {
            const response = api_response.error("User not authenticated", 401, undefined, res);
            return res.status(response.statusCode).json(response);
        }

        const user = await service.getCurrentUser(req.user.id);
        if (!user) {
            const response = api_response.error("User not found", 404, undefined, res);
            return res.status(response.statusCode).json(response);
        }

        const response = api_response.success("Current user", { user }, 200, res);
        return res.status(response.statusCode).json(response);
    });

    return router;
};
