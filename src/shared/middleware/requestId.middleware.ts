import crypto from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { configManager } from "~/config";

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
	const headerName = (() => {
		try {
			return configManager.getMiddlewareConfig().request_id.header_name;
		} catch {
			return "X-Request-ID";
		}
	})();

	const requestId = req.get(headerName) ?? crypto.randomUUID();
	req.requestId = requestId;
	res.setHeader(headerName, requestId);
	next();
}
