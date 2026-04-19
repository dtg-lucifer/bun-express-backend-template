import { log } from "~/core/middlewares";
import type { Server } from "~/core/server";

export const shutdown_handler = async (signal: string, server: Server) => {
    log.info(`Received ${signal}, starting graceful shutdown...`);
    try {
        await server.shutdown();
        process.exit(0);
    } catch (err: unknown) {
        log.error("Error during graceful shutdown", err);
        process.exit(1);
    }
};
