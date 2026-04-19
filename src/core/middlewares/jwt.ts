import type { NextFunction, Request, Response } from "express";
import * as jwt from "jsonwebtoken";
import { log } from "./logger";
import { api_response } from "../utils/api_response";

export interface AuthRequest extends Request {
    user?: {
        id: string;
        email: string;
    };
    token?: string;
}

interface TokenPayload {
    id: string;
    email: string;
}

const parseTokenPayload = (decoded: string | jwt.JwtPayload): TokenPayload | null => {
    if (typeof decoded === "string") {
        return null;
    }

    const id = decoded.id;
    const email = decoded.email;

    if (typeof id !== "string" || typeof email !== "string") {
        return null;
    }

    return { id, email };
};

export const verifyToken = (token: string): TokenPayload | null => {
    try {
        const decoded = jwt.verify(token, Bun.env.JWT_SECRET || "template-secret");
        return parseTokenPayload(decoded);
    } catch (_) {
        return null;
    }
};

export const generateToken = (payload: object, expiresIn: string = "24h"): string => {
    return jwt.sign(payload, Bun.env.JWT_SECRET || "template-secret", {
        expiresIn: expiresIn as string,
    } as jwt.SignOptions);
};

export const generateRefreshToken = (payload: object): string => {
    return jwt.sign(payload, Bun.env.JWT_REFRESH_SECRET || "refresh-secret", {
        expiresIn: "30d",
    } as jwt.SignOptions);
};

export const verifyRefreshToken = (token: string): TokenPayload | null => {
    try {
        const decoded = jwt.verify(token, Bun.env.JWT_REFRESH_SECRET || "refresh-secret");
        return parseTokenPayload(decoded);
    } catch (_) {
        return null;
    }
};

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader?.startsWith("Bearer ")) {
            const response = api_response.error("Missing or invalid authorization header", 401);
            return res.status(response.statusCode).json(response);
        }

        const token = authHeader.substring(7);
        const decoded = verifyToken(token);

        if (!decoded) {
            const response = api_response.error("Invalid or expired token", 401);
            return res.status(response.statusCode).json(response);
        }

        req.user = decoded;
        res.locals.user = decoded;
        req.token = token;
        next();
    } catch (error) {
        log.error("Authentication error:", error);
        const response = api_response.error("Authentication failed", 401);
        return res.status(response.statusCode).json(response);
    }
};

export const optionalAuth = (req: AuthRequest, _res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;

        if (authHeader?.startsWith("Bearer ")) {
            const token = authHeader.substring(7);
            const decoded = verifyToken(token);

            if (decoded) {
                req.user = decoded;
                req.token = token;
            }
        }

        next();
    } catch (error) {
        log.error("Optional authentication error:", error);
        next();
    }
};
