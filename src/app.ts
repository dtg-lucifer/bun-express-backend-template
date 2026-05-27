import cors from "cors";
import express, { type Application } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { configManager } from "~/config";
import { httpLogger } from "~/shared/logging";
import { errorHandler, notFoundMiddleware, requestIdMiddleware } from "~/shared/middleware";
import routes from "./routes";
import systemRoutes from "./system.routes";

export function createApp(): Application {
    const app = express();

    const securityConfig = configManager.getSecurityConfig();
    const middlewareConfig = configManager.getMiddlewareConfig();
    const serverConfig = configManager.getServerConfig();

    if (securityConfig.helmet.enabled) {
        app.use(
            helmet({
                contentSecurityPolicy: securityConfig.helmet.content_security_policy,
                crossOriginEmbedderPolicy: false,
            }),
        );
    }

    if (securityConfig.cors.enabled) {
        app.use(
            cors({
                origin: securityConfig.cors.origins,
                credentials: true,
                allowedHeaders: ["Content-Type", "Authorization", "X-Request-ID"],
                methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
            }),
        );
    }

    if (middlewareConfig.body_parser.enabled) {
        app.use(express.json({ limit: middlewareConfig.body_parser.json_limit }));
        app.use(
            express.urlencoded({
                extended: true,
                limit: middlewareConfig.body_parser.urlencoded_limit,
            }),
        );
    }

    if (middlewareConfig.request_id.enabled) {
        app.use(requestIdMiddleware);
    }

    if (middlewareConfig.logger.enabled) {
        app.use(httpLogger);
    }

    if (securityConfig.rate_limit.enabled) {
        app.use(
            rateLimit({
                windowMs: securityConfig.rate_limit.window_ms,
                max: securityConfig.rate_limit.max_requests,
                standardHeaders: true,
                legacyHeaders: false,
                skip: (req) => {
                    if (!securityConfig.rate_limit.skip_localhost) {
                        return false;
                    }

                    return req.ip === "127.0.0.1" || req.ip === "::1";
                },
            }),
        );
    }

    app.use(systemRoutes);
    app.use(serverConfig.api_prefix, routes);

    app.use(notFoundMiddleware);
    app.use(errorHandler);

    return app;
}
