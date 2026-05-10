import type { Express } from "express";
import type { AppDependencies } from "~/core/middlewares";
import { AuthController } from "~/modules/auth/auth.controller";
import { HealthController } from "~/modules/health/health.controller";
import { UserController } from "~/modules/user/user.controller";

/**
 * Mount HTTP routes for this application. Paths are fixed here; add or remove
 * `app.use` lines per project (not toggled via config.yaml).
 *
 * Each controller is instantiated with the shared `dependencies` object so
 * that repositories and services receive their dependencies via constructor
 * injection rather than through `res.locals`.
 */
export function registerHttpRoutes(
    app: Express,
    apiPrefix: string,
    dependencies: AppDependencies,
): void {
    const health = new HealthController();
    const auth = new AuthController(dependencies);
    const user = new UserController(dependencies);

    app.use(`${apiPrefix}/health`, health.router);
    app.use(`${apiPrefix}/auth`, auth.router);
    app.use(`${apiPrefix}/users`, user.router);
}
