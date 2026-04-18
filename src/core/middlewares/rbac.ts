import type { NextFunction, Response } from "express";
import { api_response } from "../utils/api_response";
import type { AuthRequest } from "./jwt";

export const require_roles = (roles: string[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user) {
            const response = api_response.error("User not authenticated", 401, undefined, res);
            return res.status(response.statusCode).json(response);
        }

        if (!roles.includes(req.user.role)) {
            const response = api_response.error("Insufficient permissions", 403, undefined, res);
            return res.status(response.statusCode).json(response);
        }

        next();
    };
};
