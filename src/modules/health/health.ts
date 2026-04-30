import { type NextFunction, type Request, type Response, Router } from "express";
import { asyncHandler } from "../../core/middlewares";
import { api_response, sendResponse } from "../../core/utils/api_response.js";
import { formatUptime } from "../../core/utils/time.js";

const healthcheck_router = Router();

healthcheck_router.get(
    "/",
    asyncHandler(async (_req: Request, res: Response, _next: NextFunction): Promise<void> => {
        const requestStartTime = Date.now();

        try {
            const { db } = res.locals;

            const metrics: Record<string, unknown> = {
                status: "healthy",
                timestamp: new Date().toISOString(),
                environment: Bun.env.NODE_ENV || "development",
            };

            const pings: Record<string, number | string> = {};

            if (db) {
                try {
                    const dbStart = Date.now();
                    await db.query("SELECT 1");
                    pings.database = Date.now() - dbStart;
                } catch (_dbError) {
                    pings.database = "error";
                }
            }

            const uptimeMs = process.uptime() * 1000;
            metrics.uptime = {
                milliseconds: Math.floor(uptimeMs),
                formatted: formatUptime(uptimeMs),
                startedAt: new Date(Date.now() - uptimeMs).toISOString(),
            };
            metrics.memory = {
                used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
                total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
                unit: "MB",
            };
            metrics.services = {
                database: pings.database !== "error" ? "connected" : "error",
            };
            metrics.ping = {
                database: pings.database ?? "unknown",
                unit: "ms",
            };

            const serverResponseTime = Date.now() - requestStartTime;
            (metrics.ping as Record<string, number | string>).server = serverResponseTime;

            const response = api_response.success("Server is up and running!!", metrics, 200);
            sendResponse(res, response);
        } catch (_error) {
            const response = api_response.error("Health check failed", 500);
            sendResponse(res, response);
        }
    }),
);

export { healthcheck_router };
