import type { NextFunction, Request, Response } from "express";
import type { Pool } from "pg";
import type { AuthRequest } from "./jwt.middleware";
import { log } from "./logger.middleware";

export const audit_logger = (db: Pool) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const startedAt = Date.now();

        res.on("finish", async () => {
            const authReq = req as AuthRequest;
            const actor = authReq.user;

            if (!actor || req.path.includes("/health")) {
                return;
            }

            const action = `${req.method} ${req.originalUrl}`;

            try {
                await db.query(
                    `
                    INSERT INTO audit_logs (actor_user_id, action, entity, entity_id, metadata, ip_address, user_agent)
                    VALUES ($1, $2, $3, $4, $5::jsonb, $6::inet, $7)
                    `,
                    [
                        actor.id,
                        action,
                        "http_request",
                        null,
                        JSON.stringify({
                            statusCode: res.statusCode,
                            durationMs: Date.now() - startedAt,
                        }),
                        req.ip || null,
                        req.headers["user-agent"] || null,
                    ],
                );
            } catch (error) {
                log.warn(`[AUDIT] Failed to write audit log for ${action}: ${String(error)}`);
            }
        });

        next();
    };
};
