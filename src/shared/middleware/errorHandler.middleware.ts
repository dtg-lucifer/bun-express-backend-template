import type { NextFunction, Request, Response } from "express";
import { configManager } from "~/config";
import { AppError } from "~/shared/errors";
import { logger } from "~/shared/logging";

/**
 * Global error handler — must be registered last in the Express middleware chain.
 */
export function errorHandler(
    error: Error | AppError,
    req: Request,
    res: Response,
    _next: NextFunction,
): void {
    const isAppError = error instanceof AppError;
    const statusCode = isAppError ? error.statusCode : 500;
    const message = isAppError ? error.message : "Internal server error";
    const code = isAppError ? error.code : "ERR_1000";
    const isOperational = isAppError ? error.isOperational : false;

    const logCtx = {
        error: {
            message: error.message,
            stack: error.stack
                ?.split("\n")
                .filter((l) => !l.includes("node_modules"))
                .join("\n"),
            code: isAppError ? error.code : undefined,
            statusCode,
        },
        request: {
            method: req.method,
            url: req.url,
            requestId: req.requestId,
            ip: req.ip,
        },
    };

    if (isOperational) {
        logger.warn("Operational error", logCtx);
    } else {
        logger.error("Unexpected error", logCtx);
    }

    const isDev = (() => {
        try {
            return !configManager.isProduction();
        } catch {
            return true;
        }
    })();

    res.status(statusCode).json({
        success: false,
        message,
        code,
        requestId: req.requestId,
        ...(isAppError && error.details ? { details: error.details } : {}),
        ...(isDev ? { stack: error.stack } : {}),
    });
}
