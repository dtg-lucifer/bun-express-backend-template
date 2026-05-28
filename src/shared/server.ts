import { createServer, type Server as HTTPServer } from "node:http";
import cors from "cors";
import express, { type Express } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { Pool } from "pg";
import type { Server as SocketIOServer } from "socket.io";
import { env } from "~/config/env";
import { type AppConfig, configManager } from "~/config/index";
import { registerHttpRoutes } from "~/modules";
import { registerAuthEventListeners } from "~/modules/auth/auth.events";
import { createDomainEventBus, type DomainEventBus } from "~/shared/events";
import { closeQueueResources } from "~/shared/queues";
import { setupSocketServer } from "~/shared/realtime";
import { type AppDependencies, audit_logger, createDependencyInjectionMiddleware, log, requestid_middleware, winston_logger } from "./middlewares";

export interface ServerCfg {
	port: number;
	api_prefix: string;
	origins: string[];
	listen_addr: string;
}

export class Server {
	app: Express;
	httpServer: HTTPServer;
	io: SocketIOServer | null;
	config: ServerCfg;
	appConfig: AppConfig;
	db: Pool | null;
	eventBus: DomainEventBus;

	constructor(cfg: Partial<ServerCfg>) {
		this.app = express();
		this.httpServer = createServer(this.app);
		this.io = null;
		this.appConfig = configManager.getConfig();
		this.config = Object.assign<ServerCfg, Partial<ServerCfg>>(this.defaultConfig(), cfg);
		this.db = null;
		this.eventBus = createDomainEventBus();
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
		this.setupRealtime();
		this.setupEventHandlers();
		this.setupMiddlewares();
		this.setupRoutes();

		log.info("[SERVER] Setup completed successfully");
	}

	private getDependencies(): AppDependencies {
		if (!this.db) {
			throw new Error("Database is not initialized");
		}

		return {
			db: this.db,
			eventBus: this.eventBus,
			io: this.io ?? undefined,
		};
	}

	async setupDatabase() {
		const dbConfig = configManager.getDatabaseConfig();

		this.db = new Pool({
			connectionString: env.DATABASE_URL,
			max: dbConfig.pool_size,
			connectionTimeoutMillis: dbConfig.connection_timeout,
			idleTimeoutMillis: dbConfig.idle_timeout,
		});

		await this.db.query("SELECT 1");

		log.info("[DATABASE] PostgreSQL connected successfully");
		log.info(`[DATABASE] Pool size: ${dbConfig.pool_size}`);
	}

	setupEventHandlers() {
		const queueConfig = configManager.getQueueConfig();

		if (queueConfig.bullmq.enabled) {
			registerAuthEventListeners();
			log.info("[EVENTS] Registered domain event handlers");
			return;
		}

		log.info("[EVENTS] Queue-backed auth handlers are disabled");
	}

	setupRealtime() {
		const realtimeConfig = configManager.getRealtimeConfig();

		if (!realtimeConfig.socketio.enabled) {
			return;
		}

		this.io = setupSocketServer({
			server: this.httpServer,
			origins: this.config.origins,
			path: realtimeConfig.socketio.path,
			eventBus: this.eventBus,
		});

		log.info(`[SOCKET] Socket.IO enabled at ${realtimeConfig.socketio.path}`);
	}

	setupRoutes() {
		const dependencies = this.getDependencies();
		registerHttpRoutes(this.app, this.config.api_prefix, dependencies);
		log.info(`[ROUTES] Mounted under ${this.config.api_prefix} (edit src/modules/index.ts to change)`);
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
									scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
									imgSrc: ["'self'", "data:", "https:"],
									workerSrc: ["'self'", "blob:"],
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
			const dependencies = this.getDependencies();
			this.app.use(createDependencyInjectionMiddleware(dependencies));
			this.app.use(audit_logger(dependencies.db));
		}
	}

	start() {
		this.httpServer.listen(this.config.port, () => {
			log.info(`[SERVER] Started on ${this.config.listen_addr}`);
		});
	}

	async shutdown() {
		await closeQueueResources();

		if (this.io) {
			await new Promise<void>((resolve) => {
				this.io?.close(() => resolve());
			});
			this.io = null;
			log.info("[SERVER] Socket.IO server closed");
		}

		if (this.httpServer.listening) {
			await new Promise<void>((resolve, reject) => {
				this.httpServer.close((error) => {
					if (error) {
						reject(error);
						return;
					}

					resolve();
				});
			});
			log.info("[SERVER] HTTP server closed");
		}

		if (this.db) {
			await this.db.end();
			this.db = null;
			log.info("[SERVER] Database connection closed");
		}
	}
}
