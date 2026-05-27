import { configManager } from "~/config";
import { closeQueueResources } from "~/core/queues";
import { registerAuthEventListeners } from "~/modules/auth/auth.events";
import { closeDatabaseConnection, initializeDatabase } from "~/shared/database";
import { logger } from "~/shared/logging";
import { createApp } from "./app";

let isShuttingDown = false;

async function gracefulShutdown(signal: string): Promise<void> {
    if (isShuttingDown) {
        return;
    }

    isShuttingDown = true;
    logger.info(`[SERVER] Received ${signal}. Starting graceful shutdown...`);

    try {
        await closeQueueResources();
        await closeDatabaseConnection();
        logger.info("[SERVER] Shutdown completed");
        process.exit(0);
    } catch (error) {
        logger.error("[SERVER] Shutdown failed", { err: error });
        process.exit(1);
    }
}

export async function startServer(): Promise<void> {
    const serverConfig = configManager.getServerConfig();

    await initializeDatabase();
    registerAuthEventListeners();

    const app = createApp();
    const server = app.listen(serverConfig.port, () => {
        logger.info(`[SERVER] Started on http://${serverConfig.host}:${serverConfig.port}`);
        logger.info(`[SERVER] API prefix: ${serverConfig.api_prefix}`);
    });

    server.on("error", (error: Error & { code?: string }) => {
        if (error.code === "EADDRINUSE") {
            logger.error(`[SERVER] Port ${serverConfig.port} is already in use`);
            process.exit(1);
        }

        logger.error("[SERVER] Failed to start server", { err: error });
        process.exit(1);
    });

    process.on("SIGTERM", () => {
        void gracefulShutdown("SIGTERM");
    });

    process.on("SIGINT", () => {
        void gracefulShutdown("SIGINT");
    });
}
