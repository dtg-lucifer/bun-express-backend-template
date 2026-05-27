import { apiReference } from "@scalar/express-api-reference";
import { type Request, type Response, Router } from "express";
import { configManager } from "~/config";
import { generateOpenApiDocument } from "~/config/openapi";
import { getDatabase } from "~/shared/database";
import { HealthStatus } from "~/shared/types/common.types";
import { successResponse } from "~/shared/utils/response";

// OpenAPI path registration side-effects
import "~/modules/auth/auth.openapi";
import "~/modules/health/health.openapi";
import "~/modules/users/users.openapi";

const router = Router();

router.get("/health", (_req: Request, res: Response) => {
    const db = getDatabase();

    successResponse(res, {
        status: db.isConnected() ? HealthStatus.HEALTHY : HealthStatus.DEGRADED,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    });
});

router.get("/health/ready", (_req: Request, res: Response) => {
    const db = getDatabase();
    const ready = db.isConnected();

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

router.get("/", (_req: Request, res: Response) => {
    const serverConfig = configManager.getServerConfig();
    const docsConfig = configManager.getDocumentationConfig();

    successResponse(res, {
        name: "Backend Template API",
        version: process.env.npm_package_version ?? "1.0.0",
        environment: serverConfig.environment,
        apiBasePath: serverConfig.api_prefix,
        documentation: docsConfig.swagger.enabled ? docsConfig.swagger.path : undefined,
    });
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

export default router;
