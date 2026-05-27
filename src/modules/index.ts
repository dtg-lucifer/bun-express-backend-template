import type { Express } from "express";
import type { AppDependencies } from "~/core/middlewares";
import authRoutes from "~/modules/auth/auth.routes";
import { HealthController } from "~/modules/health/health.controller";
import usersRoutes from "~/modules/users/users.routes";

/**
 * Legacy route-registration entrypoint kept for backward compatibility with
 * `core/server.ts`.
 */
export function registerHttpRoutes(
    app: Express,
    apiPrefix: string,
    _dependencies: AppDependencies,
): void {
    const health = new HealthController();

    app.use(`${apiPrefix}/health`, health.router);
    app.use(`${apiPrefix}/auth`, authRoutes);
    app.use(`${apiPrefix}/users`, usersRoutes);
}
