import type { NextFunction, Request, Response } from "express";
import * as jwt from "jsonwebtoken";
import { UnauthorizedError } from "~/shared/errors";
import { ErrorCode } from "~/shared/errors/errorCodes";
import { logger } from "~/shared/logging";

interface TokenPayload {
    id: string;
    email: string;
    role?: string;
}

function parsePayload(decoded: string | jwt.JwtPayload): TokenPayload | null {
    if (typeof decoded === "string") return null;
    const { id, email, role } = decoded as Record<string, unknown>;
    if (typeof id !== "string" || typeof email !== "string") return null;
    return { id, email, role: typeof role === "string" ? role : undefined };
}

export function verifyAccessToken(token: string): TokenPayload | null {
    try {
        const decoded = jwt.verify(token, Bun.env["JWT_SECRET"] ?? "template-secret");
        return parsePayload(decoded);
    } catch {
        return null;
    }
}

export function generateAccessToken(payload: object, expiresIn = "24h"): string {
    return jwt.sign(payload, Bun.env["JWT_SECRET"] ?? "template-secret", {
        expiresIn,
    } as jwt.SignOptions);
}

export function generateRefreshToken(payload: object): string {
    return jwt.sign(payload, Bun.env["JWT_REFRESH_SECRET"] ?? "refresh-secret", {
        expiresIn: "30d",
    } as jwt.SignOptions);
}

/**
 * Require a valid Bearer JWT. Attaches decoded payload to req.user.
 */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
    try {
        const authHeader = req.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            throw new UnauthorizedError("No token provided", ErrorCode.TOKEN_MISSING);
        }

        const token = authHeader.substring(7);
        const decoded = verifyAccessToken(token);

        if (!decoded) {
            throw new UnauthorizedError("Invalid or expired token", ErrorCode.TOKEN_INVALID);
        }

        req.user = decoded;
        next();
    } catch (error) {
        if (error instanceof Error && error.name === "TokenExpiredError") {
            next(new UnauthorizedError("Token has expired", ErrorCode.TOKEN_EXPIRED));
            return;
        }
        next(error);
    }
}

/**
 * Attach user if a valid token is present, but don't reject if missing.
 */
export function optionalAuthenticate(req: Request, _res: Response, next: NextFunction): void {
    try {
        const authHeader = req.get("Authorization");
        if (authHeader?.startsWith("Bearer ")) {
            const decoded = verifyAccessToken(authHeader.substring(7));
            if (decoded) req.user = decoded;
        }
        next();
    } catch {
        logger.debug("Optional authentication failed");
        next();
    }
}

/**
 * Require the authenticated user to have one of the specified roles.
 */
export function authorize(...roles: string[]) {
    return (req: Request, _res: Response, next: NextFunction) => {
        if (!req.user) {
            next(new UnauthorizedError("Authentication required", ErrorCode.UNAUTHORIZED));
            return;
        }
        if (req.user.role && !roles.includes(req.user.role)) {
            next(
                new UnauthorizedError(
                    "Insufficient permissions",
                    ErrorCode.INSUFFICIENT_PERMISSIONS,
                ),
            );
            return;
        }
        next();
    };
}
