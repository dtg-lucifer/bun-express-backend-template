import type { Request, Response } from "express";
import { NotFoundError } from "~/shared/errors";

export function notFoundMiddleware(req: Request, _res: Response): void {
	throw new NotFoundError(`Route not found: ${req.method} ${req.url}`);
}
