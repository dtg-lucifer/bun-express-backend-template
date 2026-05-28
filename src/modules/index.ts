import type { Express } from "express";
import { createAuthRouter } from "~/modules/auth/auth.routes";
import { createSystemRouter } from "~/modules/system/system.routes";
import { createUsersRouter } from "~/modules/users/users.routes";
import type { AppDependencies } from "~/shared/middlewares";

export function registerHttpRoutes(app: Express, apiPrefix: string, dependencies: AppDependencies): void {
	app.use(apiPrefix, createSystemRouter({ apiPrefix, db: dependencies.db }));
	app.use(`${apiPrefix}/auth`, createAuthRouter());
	app.use(`${apiPrefix}/users`, createUsersRouter());
}
