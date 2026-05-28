import type { NextFunction, Request, Response } from "express";

export { debug, error, info, log, warn, winston_logger } from "./logger.middleware";

export function asyncHandler<TRequest extends Request = Request>(fn: (req: TRequest, res: Response, next: NextFunction) => Promise<void>) {
	return (req: TRequest, res: Response, next: NextFunction): void => {
		Promise.resolve(fn(req, res, next)).catch(next);
	};
}

export { audit_logger } from "./audit.middleware";
export {
	type AuthRequest,
	authenticate,
	generateRefreshToken,
	generateToken,
	optionalAuth,
	verifyRefreshToken,
	verifyToken,
} from "./jwt.middleware";
export {
	type AppDependencies,
	createDependencyInjectionMiddleware,
} from "./locals.middleware";
export { requestid_middleware } from "./request_id.middleware";
export { validate } from "./validation.middleware";
