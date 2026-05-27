import type { NextFunction, Request, RequestHandler, Response } from "express";

/**
 * Wraps an async route handler so unhandled promise rejections are forwarded
 * to Express's next(error) instead of crashing the process.
 */
export function asyncHandler(fn: RequestHandler): RequestHandler {
    return (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}
