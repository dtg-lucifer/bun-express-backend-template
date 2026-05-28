import * as dotenv from "dotenv";
import { configManager } from "~/config/index";
import { shutdown_handler } from "~/lib/shutdown";
import { log } from "~/shared/middlewares";
import { Server, type ServerCfg } from "~/shared/server";

// Load environment variables first
dotenv.config();

// Configuration is validated during import of configManager
// If validation fails, the process will exit before reaching this point

const serverConfig = configManager.getServerConfig();
const securityConfig = configManager.getSecurityConfig();

// Parse CORS origins from environment variable (overrides config.yaml if set)
const allowedOrigins = Bun.env.ALLOWED_ORIGINS ? Bun.env.ALLOWED_ORIGINS.split(",").map((origin) => origin.trim()) : securityConfig.cors.origins;

const server_cfg: Partial<ServerCfg> = {
	port: Bun.env.PORT ? parseInt(Bun.env.PORT, 10) : serverConfig.port,
	api_prefix: serverConfig.api_prefix,
	origins: allowedOrigins,
};

const server = new Server(server_cfg);

// Graceful shutdown handling
process.on("SIGTERM", () => shutdown_handler("SIGTERM", server));
process.on("SIGINT", () => shutdown_handler("SIGINT", server));

// Initialize and start the server
server
	.setup()
	.then(() => {
		server.start();
	})
	.catch((err: unknown) => {
		log.error("Failed to start server", err);
		process.exit(1);
	});
