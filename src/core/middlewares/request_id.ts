import type { NextFunction, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { configManager } from "../../config";

export function requestid_middleware(req: Request, res: Response, next: NextFunction) {
    const requestId = uuidv4();

    // Get header name from config
    const headerName = configManager.getMiddlewareConfig().request_id.header_name;

    // Store in res.locals for easy access in route handlers
    res.locals.requestId = requestId;

    // Also keep backward compatibility
    (req as Request & { request_id?: string }).request_id = requestId;
    (res as Response & { request_id?: string }).request_id = requestId;

    res.setHeader(headerName, requestId);

    next();
}
