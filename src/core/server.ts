import cors from "cors";
import express, { type Express } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import fs from "node:fs";
import path from "node:path";
import { Pool } from "pg";
import swaggerui from "swagger-ui-express";
import YAML from "yaml";

import {
    audit_logger,
    createDependencyInjectionMiddleware,
    log,
    requestid_middleware,
    winston_logger,
} from "./middlewares";
import { healthcheck_router } from "@core/routes";
import { createAuthRouter } from "@modules/auth/auth.handler";
import { type AppConfig, configManager } from "@config/index";

export interface ServerCfg {
    port: number;
    api_prefix: string;
    origins: string[];
    listen_addr: string;
}

export class Server {
    app: Express;
    config: ServerCfg;
    appConfig: AppConfig;
    db: Pool | null;

    constructor(cfg: Partial<ServerCfg>) {
        this.app = express();
        this.appConfig = configManager.getConfig();
        this.config = Object.assign<ServerCfg, Partial<ServerCfg>>(this.defaultConfig(), cfg);
        this.db = null;
    }

    defaultConfig(): ServerCfg {
        const serverConfig = configManager.getServerConfig();
        const securityConfig = configManager.getSecurityConfig();

        return {
            port: serverConfig.port,
            api_prefix: serverConfig.api_prefix,
            origins: securityConfig.cors.origins,
            listen_addr: configManager.getListenAddress(),
        };
    }

    async setup() {
        log.info(`Environment: ${this.appConfig.server.environment}`);
        log.info(`Server: ${this.appConfig.server.host}:${this.appConfig.server.port}`);
        log.info(`API Prefix: ${this.appConfig.server.api_prefix}`);

        await this.setupDatabase();
        this.setupMiddlewares();
        this.setupRoutes();
        this.setupDocumentation();

        log.info("[SERVER] Setup completed successfully");
    }

    async setupDatabase() {
        const dbConfig = configManager.getDatabaseConfig();
        if (!Bun.env.DATABASE_URL) {
            throw new Error("DATABASE_URL is required");
        }

        this.db = new Pool({
            connectionString: Bun.env.DATABASE_URL,
            max: dbConfig.pool_size,
            connectionTimeoutMillis: dbConfig.connection_timeout,
        });

        await this.db.query("SELECT 1");
        log.info("[DATABASE] PostgreSQL connected successfully");
    }

    setupRoutes() {
        const routesConfig = configManager.getRoutesConfig();

        if (routesConfig.health.enabled) {
            this.app.use(this.config.api_prefix + routesConfig.health.path, healthcheck_router);
            log.info(
                `[ROUTES] Health check: ${this.config.api_prefix}${routesConfig.health.path}healthcheck`,
            );
        }

        if (routesConfig.auth.enabled && this.db) {
            this.app.use(
                this.config.api_prefix + routesConfig.auth.path,
                createAuthRouter(this.db),
            );
            log.info(`[ROUTES] Auth: ${this.config.api_prefix}${routesConfig.auth.path}`);
        }
    }

    setupDocumentation() {
        const docConfig = configManager.getDocumentationConfig();

        if (!docConfig.swagger.enabled) {
            return;
        }

        const openapiPath = path.join(process.cwd(), docConfig.swagger.openapi_file);
        if (!fs.existsSync(openapiPath)) {
            log.warn(`[DOCS] OpenAPI file not found at ${openapiPath}`);
            return;
        }

        try {
            const openapiFile = fs.readFileSync(openapiPath, "utf-8");
            const openapiSpec = YAML.parse(openapiFile);

            this.app.use(
                this.config.api_prefix + docConfig.swagger.path,
                swaggerui.serve,
                swaggerui.setup(openapiSpec),
            );

            log.info(
                `[DOCS] Swagger UI: ${this.config.api_prefix}${docConfig.swagger.path} (source: ${docConfig.swagger.openapi_file})`,
            );
        } catch (error) {
            log.error("[DOCS] Failed to load OpenAPI spec", error);
        }
    }

    setupMiddlewares() {
        const middlewaresConfig = configManager.getMiddlewareConfig();
        const securityConfig = configManager.getSecurityConfig();

        if (middlewaresConfig.body_parser.enabled) {
            this.app.use(
                express.json({
                    limit: middlewaresConfig.body_parser.json_limit,
                }),
            );
            this.app.use(
                express.urlencoded({
                    extended: true,
                    limit: middlewaresConfig.body_parser.urlencoded_limit,
                }),
            );
        }

        if (securityConfig.helmet.enabled) {
            this.app.use(
                helmet({
                    contentSecurityPolicy: securityConfig.helmet.content_security_policy
                        ? {
                              directives: {
                                  defaultSrc: ["'self'"],
                                  styleSrc: ["'self'", "'unsafe-inline'"],
                                  scriptSrc: ["'self'"],
                                  imgSrc: ["'self'", "data:", "https:"],
                              },
                          }
                        : false,
                    crossOriginEmbedderPolicy: false,
                }),
            );
        }

        if (securityConfig.rate_limit.enabled) {
            this.app.use(
                rateLimit({
                    windowMs: securityConfig.rate_limit.window_ms,
                    max: securityConfig.rate_limit.max_requests,
                    standardHeaders: true,
                    legacyHeaders: false,
                }),
            );
        }

        if (securityConfig.cors.enabled) {
            this.app.use(
                cors({
                    origin: this.config.origins,
                    credentials: true,
                    allowedHeaders: ["Content-Type", "Authorization"],
                    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
                }),
            );
        }

        if (middlewaresConfig.logger.enabled) {
            this.app.use(winston_logger);
        }

        if (middlewaresConfig.request_id.enabled) {
            this.app.use(requestid_middleware);
        }

        if (middlewaresConfig.dependency_injection.enabled && this.db) {
            this.app.use(createDependencyInjectionMiddleware(this.db));
            this.app.use(audit_logger(this.db));
        }
    }

    start() {
        this.app.listen(this.config.port, () => {
            log.info(`[SERVER] Started on ${this.config.listen_addr}`);
        });
    }

    async shutdown() {
        if (this.db) {
            await this.db.end();
            log.info("[SERVER] Database connection closed");
        }
    }
}
