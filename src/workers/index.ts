import "dotenv/config";
import { configManager } from "@config/index";
import { log } from "@core/middlewares";
import { closeQueueResources, startQueueWorker } from "@core/queues";

const workersConfig = configManager.getWorkersConfig();
const queueConfig = configManager.getQueueConfig();

if (!workersConfig.process.enabled) {
    log.info("[WORKER] workers.process.enabled is false in config.yaml; exiting");
    process.exit(0);
}

if (!queueConfig.bullmq.enabled) {
    log.info("[WORKER] queues.bullmq.enabled is false in config.yaml; exiting");
    process.exit(0);
}

const worker = startQueueWorker();
if (!worker) {
    log.info("[WORKER] No queue workers started (e.g. notification_jobs disabled); exiting");
    process.exit(0);
}

log.info("[WORKER] BullMQ worker started");

const shutdownWorker = async (signal: string): Promise<void> => {
    log.info(`[WORKER] Received ${signal}. Closing worker resources...`);
    await closeQueueResources();
    process.exit(0);
};

process.on("SIGINT", () => {
    void shutdownWorker("SIGINT");
});

process.on("SIGTERM", () => {
    void shutdownWorker("SIGTERM");
});
