/**
 * Configuration management
 * Reads and validates configuration from config.yaml and environment variables
 * @maintainer dtg-lucifer <dev.bosepiush@gmail.com>
 */

import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";
import { z } from "zod";

/**
 * Simple bootstrap logger for config initialization
 * Used before the main winston logger is available
 */
const bootstrapLogger = {
    error: (...args: unknown[]) => {
        process.stderr.write(`\x1b[31m${args.join(" ")}\x1b[0m\n`);
    },
    warn: (...args: unknown[]) => {
        process.stdout.write(`\x1b[33m${args.join(" ")}\x1b[0m\n`);
    },
    info: (...args: unknown[]) => {
        process.stdout.write(`\x1b[36m${args.join(" ")}\x1b[0m\n`);
    },
    success: (...args: unknown[]) => {
        process.stdout.write(`\x1b[32m${args.join(" ")}\x1b[0m\n`);
    },
};

const routeSchema = z.object({
    enabled: z.boolean(),
    path: z.string().trim().min(1, "Path is required"),
});

const serverSchema = z
    .object({
        host: z.string().trim().min(1, "server.host is required"),
        port: z.number().int().positive("server.port must be a positive number"),
        api_prefix: z.string().trim().min(1, "server.api_prefix is required"),
        environment: z.enum(["development", "production", "staging"]),
    })
    .strict();

const securitySchema = z
    .object({
        helmet: z
            .object({
                enabled: z.boolean(),
                content_security_policy: z.boolean(),
            })
            .strict(),
        cors: z
            .object({
                enabled: z.boolean(),
                origins: z
                    .array(z.string().trim().min(1, "Origin cannot be empty"))
                    .min(1, "At least one CORS origin is required"),
            })
            .strict(),
        rate_limit: z
            .object({
                enabled: z.boolean(),
                window_ms: z.number().int().positive(),
                max_requests: z.number().int().positive(),
                skip_localhost: z.boolean(),
            })
            .strict(),
    })
    .strict();

const databaseSchema = z
    .object({
        pool_size: z.number().int().positive(),
        connection_timeout: z.number().int().nonnegative(),
    })
    .strict();

const redisSchema = z
    .object({
        default_ttl: z.number().int().nonnegative(),
        participant_cache_ttl: z.number().int().nonnegative(),
    })
    .strict();

const loggingSchema = z
    .object({
        level: z.enum(["error", "warn", "info", "debug"]),
        format: z.enum(["json", "simple"]),
        enable_colors: z.boolean(),
        log_requests: z.boolean(),
        log_errors: z.boolean(),
    })
    .strict();

const middlewareSchema = z
    .object({
        request_id: z
            .object({
                enabled: z.boolean(),
                header_name: z.string().trim().min(1),
            })
            .strict(),
        body_parser: z
            .object({
                enabled: z.boolean(),
                json_limit: z.string().trim().min(1),
                urlencoded_limit: z.string().trim().min(1),
            })
            .strict(),
        dependency_injection: z
            .object({
                enabled: z.boolean(),
            })
            .strict(),
        logger: z
            .object({
                enabled: z.boolean(),
            })
            .strict(),
    })
    .strict();

const routesSchema = z
    .object({
        health: routeSchema,
        auth: routeSchema,
        events: routeSchema,
        admin: routeSchema,
        participants: routeSchema,
        domain_leads: routeSchema,
        checkin_crew: routeSchema,
        campuses: routeSchema,
        registrations: routeSchema,
    })
    .strict();

const documentationSchema = z
    .object({
        swagger: z
            .object({
                enabled: z.boolean(),
                path: z.string().trim().min(1),
                openapi_file: z.string().trim().min(1),
            })
            .strict(),
    })
    .strict();

const rbacSchema = z
    .object({
        enabled: z.boolean(),
        roles: z.array(z.string().trim().min(1)).min(1),
        permissions: z.record(z.string().trim().min(1), z.array(z.string().trim().min(1)).min(1)),
    })
    .strict();

const appConfigSchema = z
    .object({
        server: serverSchema,
        security: securitySchema,
        database: databaseSchema,
        redis: redisSchema,
        logging: loggingSchema,
        middlewares: middlewareSchema,
        routes: routesSchema,
        documentation: documentationSchema,
        rbac: rbacSchema.optional(),
    })
    .passthrough();

const envSchema = z.object({
    DATABASE_URL: z.string().trim().min(1, "PostgreSQL connection string is required"),
    JWT_SECRET: z.string().trim().min(1, "JWT secret key is required"),
    REDIS_URL: z.string().trim().min(1, "Redis connection URL is required"),
    ALLOWED_ORIGINS: z.string().trim().min(1, "Allowed CORS origins are required"),
    PORT: z.string().trim().regex(/^\d+$/, "PORT must be a valid number"),
    HOST: z.string().trim().min(1, "HOST must not be empty"),
});

export type ServerConfig = z.infer<typeof serverSchema>;
export type SecurityConfig = z.infer<typeof securitySchema>;
export type DatabaseConfig = z.infer<typeof databaseSchema>;
export type RedisConfig = z.infer<typeof redisSchema>;
export type LoggingConfig = z.infer<typeof loggingSchema>;
export type MiddlewareConfig = z.infer<typeof middlewareSchema>;
export type RouteConfig = z.infer<typeof routesSchema>;
export type DocumentationConfig = z.infer<typeof documentationSchema>;
export type RbacConfig = z.infer<typeof rbacSchema>;
export type AppConfig = z.infer<typeof appConfigSchema>;

class ConfigManager {
    private config: AppConfig;
    private configPath: string;

    constructor(configPath?: string) {
        this.configPath = configPath || path.join(process.cwd(), "config", "config.yaml");
        this.config = this.loadConfig();
        this.validateConfig();
        this.applyEnvironmentOverrides();
    }

    private logZodIssues(title: string, issues: z.ZodIssue[]): void {
        bootstrapLogger.error(`\n[ERROR] ${title}`);

        for (const issue of issues) {
            const location = issue.path.length > 0 ? issue.path.join(".") : "root";
            bootstrapLogger.error(`   [X] ${location}: ${issue.message}`);
        }

        bootstrapLogger.error("");
    }

    /**
     * Load configuration from YAML file
     */
    private loadConfig(): AppConfig {
        try {
            if (!fs.existsSync(this.configPath)) {
                bootstrapLogger.error("\n[ERROR] CONFIGURATION ERROR: Config file not found");
                bootstrapLogger.error(`   Expected location: ${this.configPath}`);
                bootstrapLogger.error(
                    "   Please ensure config/config.yaml exists in your project root.\n",
                );
                throw new Error(`Configuration file not found: ${this.configPath}`);
            }

            const fileContents = fs.readFileSync(this.configPath, "utf8");
            let config: unknown;

            try {
                config = YAML.parse(fileContents);
            } catch (parseError) {
                bootstrapLogger.error("\n[ERROR] CONFIGURATION ERROR: Invalid YAML syntax");
                bootstrapLogger.error(`   File: ${this.configPath}`);
                bootstrapLogger.error(`   Error: ${parseError}`);
                bootstrapLogger.error("   Please check your config.yaml file for syntax errors.\n");
                throw parseError;
            }

            if (!config) {
                bootstrapLogger.error(
                    "\n[ERROR] CONFIGURATION ERROR: Config file is empty or invalid",
                );
                bootstrapLogger.error(`   File: ${this.configPath}\n`);
                throw new Error("Invalid YAML configuration");
            }

            const parsedConfig = appConfigSchema.safeParse(config);

            if (!parsedConfig.success) {
                this.logZodIssues(
                    "CONFIGURATION ERROR: config.yaml failed schema validation",
                    parsedConfig.error.issues,
                );

                bootstrapLogger.error(
                    "[ACTION REQUIRED] Update config/config.yaml so it matches the expected schema.\n",
                );

                throw new Error("Configuration schema validation failed");
            }

            bootstrapLogger.success("[OK] config.yaml schema validation passed");
            return parsedConfig.data;
        } catch (error) {
            bootstrapLogger.error("Failed to load configuration:", error);
            throw error;
        }
    }

    /**
     * Validate required configuration fields from config.yaml
     */
    private validateConfig(): void {
        bootstrapLogger.info("[OK] Validating environment variables...");

        const envResult = envSchema.safeParse(Bun.env);
        if (!envResult.success) {
            this.logZodIssues(
                "CONFIGURATION VALIDATION FAILED - Missing or invalid environment variables",
                envResult.error.issues,
            );

            bootstrapLogger.error("\n[ACTION REQUIRED]");
            bootstrapLogger.error("   1. Ensure config/config.yaml matches the declared schema");
            bootstrapLogger.error(
                "   2. Create a .env file with all required environment variables",
            );
            bootstrapLogger.error("   3. See config/config.yaml for the expected structure\n");

            throw new Error("Configuration validation failed - server cannot start");
        }

        bootstrapLogger.success("[OK] Environment variable validation passed\n");
    }

    /**
     * Apply environment variable overrides
     */
    private applyEnvironmentOverrides(): void {
        // Override server config from environment
        if (Bun.env.HOST) {
            this.config.server.host = Bun.env.HOST;
        }

        if (Bun.env.PORT) {
            this.config.server.port = parseInt(Bun.env.PORT, 10);
        }

        if (Bun.env.NODE_ENV) {
            this.config.server.environment = Bun.env.NODE_ENV as
                | "development"
                | "production"
                | "staging";
        }

        // Override CORS origins from environment
        if (Bun.env.ALLOWED_ORIGINS) {
            this.config.security.cors.origins = Bun.env.ALLOWED_ORIGINS.split(",").map((origin) =>
                origin.trim(),
            );
        }
    }

    /**
     * Get full configuration
     */
    public getConfig(): AppConfig {
        return this.config;
    }

    /**
     * Get server configuration
     */
    public getServerConfig(): ServerConfig {
        return this.config.server;
    }

    /**
     * Get security configuration
     */
    public getSecurityConfig(): SecurityConfig {
        return this.config.security;
    }

    /**
     * Get database configuration
     */
    public getDatabaseConfig(): DatabaseConfig {
        return this.config.database;
    }

    /**
     * Get Redis configuration
     */
    public getRedisConfig(): RedisConfig {
        return this.config.redis;
    }

    /**
     * Get logging configuration
     */
    public getLoggingConfig(): LoggingConfig {
        return this.config.logging;
    }

    /**
     * Get middleware configuration
     */
    public getMiddlewareConfig(): MiddlewareConfig {
        return this.config.middlewares;
    }

    /**
     * Get routes configuration
     */
    public getRoutesConfig(): RouteConfig {
        return this.config.routes;
    }

    /**
     * Get documentation configuration
     */
    public getDocumentationConfig(): DocumentationConfig {
        return this.config.documentation;
    }

    /**
     * Get RBAC configuration
     */
    public getRbacConfig(): RbacConfig | undefined {
        return this.config.rbac;
    }

    /**
     * Get list of enabled routes with their paths
     */
    public getEnabledRoutes(): Array<{ name: string; path: string }> {
        const routes = this.config.routes;
        return Object.entries(routes)
            .filter(([_, config]) => config.enabled)
            .map(([name, config]) => ({
                name,
                path: config.path,
            }));
    }

    /**
     * Get list of enabled middlewares
     */
    public getEnabledMiddlewares(): string[] {
        const middlewares = this.config.middlewares;
        return Object.entries(middlewares)
            .filter(([_, config]) => config.enabled)
            .map(([name]) => name);
    }

    /**
     * Get listen address for server
     */
    public getListenAddress(): string {
        const { host, port } = this.config.server;
        return `http://${host}:${port}`;
    }

    /**
     * Check if running in production
     */
    public isProduction(): boolean {
        return this.config.server.environment === "production";
    }

    /**
     * Check if running in development
     */
    public isDevelopment(): boolean {
        return this.config.server.environment === "development";
    }
}

// Export singleton instance
export const configManager = new ConfigManager();

// Export getters for convenience
export const getConfig = () => configManager.getConfig();
export const getServerConfig = () => configManager.getServerConfig();
export const getSecurityConfig = () => configManager.getSecurityConfig();
export const getDatabaseConfig = () => configManager.getDatabaseConfig();
export const getRedisConfig = () => configManager.getRedisConfig();
export const getLoggingConfig = () => configManager.getLoggingConfig();
export const getMiddlewareConfig = () => configManager.getMiddlewareConfig();
export const getRoutesConfig = () => configManager.getRoutesConfig();
export const getDocumentationConfig = () => configManager.getDocumentationConfig();
export const getRbacConfig = () => configManager.getRbacConfig();
export const getEnabledRoutes = () => configManager.getEnabledRoutes();
export const getEnabledMiddlewares = () => configManager.getEnabledMiddlewares();
export const getListenAddress = () => configManager.getListenAddress();
export const isProduction = () => configManager.isProduction();
export const isDevelopment = () => configManager.isDevelopment();
