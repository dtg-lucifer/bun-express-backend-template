import "dotenv/config";
import { logger } from "~/shared/logging";
import { startServer } from "./server";

startServer().catch((error: unknown) => {
    logger.error("[SERVER] Bootstrap failed", { err: error });
    process.exit(1);
});
