import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";
import { z } from "zod";

const routeSchema = z.object({
    enabled: z.boolean(),
    path: z.string().trim().min(1),
});

const documentationSchema = z.object({
    swagger: z.object({
        enabled: z.boolean(),
        path: z.string().trim().min(1),
        openapi_file: z.string().trim().min(1),
    }),
});

const appConfigSchema = z.object({
    server: z.object({
        host: z.string().trim().min(1),
        port: z.number().int().positive(),
        api_prefix: z.string().trim().min(1),
        environment: z.enum(["development", "production", "staging"]),
    }),
    security: z.object({
        helmet: z.object({
            enabled: z.boolean(),
            content_security_policy: z.boolean(),
        }),
        cors: z.object({
            enabled: z.boolean(),
            origins: z.array(z.string().trim().min(1)).min(1),
        }),
        rate_limit: z.object({
            enabled: z.boolean(),
            window_ms: z.number().int().positive(),
            max_requests: z.number().int().positive(),
            skip_localhost: z.boolean(),
        }),
    }),
    database: z.object({
        pool_size: z.number().int().positive(),
        connection_timeout: z.number().int().nonnegative(),
    }),
    logging: z.object({
        level: z.enum(["error", "warn", "info", "debug"]),
        format: z.enum(["json", "simple"]),
        enable_colors: z.boolean(),
        log_requests: z.boolean(),
        log_errors: z.boolean(),
    }),
    middlewares: z.object({
        request_id: z.object({
            enabled: z.boolean(),
            header_name: z.string().trim().min(1),
        }),
        body_parser: z.object({
            enabled: z.boolean(),
            json_limit: z.string().trim().min(1),
            urlencoded_limit: z.string().trim().min(1),
        }),
        dependency_injection: z.object({
            enabled: z.boolean(),
        }),
        logger: z.object({
            enabled: z.boolean(),
        }),
    }),
    routes: z.object({
        health: routeSchema,
        auth: routeSchema,
    }),
    documentation: documentationSchema,
    rbac: z
        .object({
            enabled: z.boolean(),
            roles: z.array(z.string().trim().min(1)).min(1),
            permissions: z.record(z.string(), z.array(z.string().trim().min(1))),
        })
        .optional(),
});

const envSchema = z.object({
    DATABASE_URL: z.string().trim().min(1),
    JWT_SECRET: z.string().trim().min(1),
    JWT_REFRESH_SECRET: z.string().trim().min(1),
});

export type AppConfig = z.infer<typeof appConfigSchema>;
export type ServerConfig = AppConfig["server"];
export type SecurityConfig = AppConfig["security"];
export type DatabaseConfig = AppConfig["database"];
export type LoggingConfig = AppConfig["logging"];
export type MiddlewareConfig = AppConfig["middlewares"];
export type RouteConfig = AppConfig["routes"];
export type DocumentationConfig = AppConfig["documentation"];
export type RbacConfig = NonNullable<AppConfig["rbac"]>;

class ConfigManager {
    private readonly configPath: string;
    private config: AppConfig;

    constructor(configPath?: string) {
        this.configPath = configPath ?? path.join(process.cwd(), "config.yaml");
        this.config = this.loadConfig();
        this.validateEnvironment();
        this.applyEnvironmentOverrides();
    }

    private loadConfig(): AppConfig {
        if (!fs.existsSync(this.configPath)) {
            throw new Error(`Configuration file not found: ${this.configPath}`);
        }

        const raw = fs.readFileSync(this.configPath, "utf8");
        const parsed = YAML.parse(raw);
        const result = appConfigSchema.safeParse(parsed);

        if (!result.success) {
            throw new Error(`Invalid config.yaml: ${result.error.message}`);
        }

        return result.data;
    }

    private validateEnvironment(): void {
        const result = envSchema.safeParse(Bun.env);
        if (!result.success) {
            throw new Error(`Invalid environment variables: ${result.error.message}`);
        }
    }

    private applyEnvironmentOverrides(): void {
        if (Bun.env.HOST) {
            this.config.server.host = Bun.env.HOST;
        }

        if (Bun.env.PORT) {
            const parsedPort = Number.parseInt(Bun.env.PORT, 10);
            if (!Number.isNaN(parsedPort)) {
                this.config.server.port = parsedPort;
            }
        }

        if (Bun.env.NODE_ENV) {
            const env = Bun.env.NODE_ENV;
            if (env === "development" || env === "production" || env === "staging") {
                this.config.server.environment = env;
            }
        }

        if (Bun.env.ALLOWED_ORIGINS) {
            this.config.security.cors.origins = Bun.env.ALLOWED_ORIGINS.split(",").map((origin) =>
                origin.trim(),
            );
        }
    }

    public getConfig(): AppConfig {
        return this.config;
    }

    public getServerConfig(): ServerConfig {
        return this.config.server;
    }

    public getSecurityConfig(): SecurityConfig {
        return this.config.security;
    }

    public getDatabaseConfig(): DatabaseConfig {
        return this.config.database;
    }

    public getLoggingConfig(): LoggingConfig {
        return this.config.logging;
    }

    public getMiddlewareConfig(): MiddlewareConfig {
        return this.config.middlewares;
    }

    public getRoutesConfig(): RouteConfig {
        return this.config.routes;
    }

    public getDocumentationConfig(): DocumentationConfig {
        return this.config.documentation;
    }

    public getRbacConfig(): RbacConfig | undefined {
        return this.config.rbac;
    }

    public getEnabledRoutes(): Array<{ name: string; path: string }> {
        return Object.entries(this.config.routes)
            .filter(([, route]) => route.enabled)
            .map(([name, route]) => ({ name, path: route.path }));
    }

    public getListenAddress(): string {
        const { host, port } = this.config.server;
        return `http://${host}:${port}`;
    }

    public isProduction(): boolean {
        return this.config.server.environment === "production";
    }
}

export const configManager = new ConfigManager();

export const getConfig = () => configManager.getConfig();
export const getServerConfig = () => configManager.getServerConfig();
export const getSecurityConfig = () => configManager.getSecurityConfig();
export const getDatabaseConfig = () => configManager.getDatabaseConfig();
export const getLoggingConfig = () => configManager.getLoggingConfig();
export const getMiddlewareConfig = () => configManager.getMiddlewareConfig();
export const getRoutesConfig = () => configManager.getRoutesConfig();
export const getDocumentationConfig = () => configManager.getDocumentationConfig();
export const getRbacConfig = () => configManager.getRbacConfig();
export const getEnabledRoutes = () => configManager.getEnabledRoutes();
export const getListenAddress = () => configManager.getListenAddress();
export const isProduction = () => configManager.isProduction();
