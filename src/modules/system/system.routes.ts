import { apiReference } from "@scalar/express-api-reference";
import { type Request, type Response, Router } from "express";
import type { Pool } from "pg";
import { configManager } from "~/config";
import { env } from "~/config/env";
import { generateOpenApiDocument } from "~/config/openapi";
import { HealthStatus } from "~/shared/types/common.types";
import { successResponse } from "~/shared/utils/response";

// OpenAPI path registration side-effects
import "~/modules/auth/auth.openapi";
import "~/modules/health/health.openapi";
import "~/modules/users/users.openapi";

interface SystemRoutesDependencies {
	apiPrefix: string;
	db: Pool;
}

export function createSystemRouter({ apiPrefix, db }: SystemRoutesDependencies) {
	const router = Router();

	router.get("/", (_req: Request, res: Response) => {
		const serverConfig = configManager.getServerConfig();
		const docsConfig = configManager.getDocumentationConfig();

		successResponse(res, {
			name: "Backend Template API",
			version: env.npm_package_version ?? "1.0.0",
			environment: serverConfig.environment,
			apiBasePath: serverConfig.api_prefix,
			documentation: docsConfig.swagger.enabled ? `${apiPrefix}${docsConfig.swagger.path}` : undefined,
		});
	});

	router.get("/health", async (_req: Request, res: Response) => {
		let databaseStatus: HealthStatus = HealthStatus.UNHEALTHY;
		let databasePing: number | "error" = "error";

		try {
			const startedAt = Date.now();
			await db.query("SELECT 1");
			databasePing = Date.now() - startedAt;
			databaseStatus = HealthStatus.HEALTHY;
		} catch {
			databaseStatus = HealthStatus.UNHEALTHY;
		}

		successResponse(res, {
			status: databaseStatus === HealthStatus.HEALTHY ? HealthStatus.HEALTHY : HealthStatus.DEGRADED,
			timestamp: new Date().toISOString(),
			uptime: process.uptime(),
			dependencies: {
				database: databaseStatus,
			},
			ping: {
				database: databasePing,
				unit: "ms",
			},
		});
	});

	router.get("/health/ready", async (_req: Request, res: Response) => {
		let ready = true;

		try {
			await db.query("SELECT 1");
		} catch {
			ready = false;
		}

		successResponse(
			res,
			{
				status: ready ? HealthStatus.HEALTHY : HealthStatus.UNHEALTHY,
				dependencies: {
					database: ready ? HealthStatus.HEALTHY : HealthStatus.UNHEALTHY,
				},
			},
			undefined,
			ready ? 200 : 503,
		);
	});

	const docsConfig = configManager.getDocumentationConfig();
	if (docsConfig.swagger.enabled) {
		router.use(
			docsConfig.swagger.path,
			apiReference({
				spec: { content: generateOpenApiDocument() },
			}),
		);

		router.get("/openapi.json", (_req: Request, res: Response) => {
			res.setHeader("Content-Type", "application/json; charset=utf-8");
			res.setHeader("Cache-Control", "no-store");
			res.status(200).send(JSON.stringify(generateOpenApiDocument(), null, 4));
		});
	}

	return router;
}
