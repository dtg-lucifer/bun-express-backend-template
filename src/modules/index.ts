import type { Express } from "express";
import type { AppDependencies } from "~/core/middlewares";
import { createAuthRouter } from "~/modules/auth/auth.routes";
import { healthcheck_router } from "~/modules/health/health";

/**
 * Mount HTTP routes for this application. Paths are fixed here; add or remove
 * `app.use` lines per project (not toggled via config.yaml).
 */
export function registerHttpRoutes(
    app: Express,
    apiPrefix: string,
    dependencies: AppDependencies,
): void {
    app.use(`${apiPrefix}/health`, healthcheck_router);
    app.use(`${apiPrefix}/auth`, createAuthRouter(dependencies));
}
