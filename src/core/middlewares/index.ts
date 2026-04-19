import type { NextFunction, Request, Response } from "express";

export { debug, error, info, log, warn, winston_logger } from "./logger";

export function asyncHandler<TRequest extends Request = Request>(
    fn: (req: TRequest, res: Response, next: NextFunction) => Promise<void>,
) {
    return (req: TRequest, res: Response, next: NextFunction): void => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

export { audit_logger } from "./audit";
export {
    type AuthRequest,
    authenticate,
    generateRefreshToken,
    generateToken,
    optionalAuth,
    verifyRefreshToken,
    verifyToken,
} from "./jwt";
export {
    type AppDependencies,
    createDependencyInjectionMiddleware,
} from "./locals";
export { requestid_middleware } from "./request_id";
