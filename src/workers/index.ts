import { env } from "~/config/env";
import { configManager } from "~/config/index";
import { logger } from "~/shared/logging";
import { closeQueueResources, startQueueWorker } from "~/shared/queues";

const workersConfig = configManager.getWorkersConfig();
const queueConfig = configManager.getQueueConfig();

if (!workersConfig.process.enabled) {
	logger.info("[WORKER] workers.process.enabled is false in config.yaml; exiting");
	process.exit(0);
}

if (env.QUEUE_PROVIDER === "bullmq" && !queueConfig.bullmq.enabled) {
	logger.info("[WORKER] BullMQ is disabled in config.yaml; exiting");
	process.exit(0);
}

const worker = await startQueueWorker();
if (!worker) {
	logger.info("[WORKER] No queue workers started (e.g. notification_jobs disabled); exiting");
	process.exit(0);
}

logger.info(`[WORKER] Queue worker started (${env.QUEUE_PROVIDER})`);

const shutdownWorker = async (signal: string) => {
	logger.info(`[WORKER] Received ${signal}. Closing worker resources...`);
	await closeQueueResources();
	process.exit(0);
};

process.on("SIGINT", () => {
	void shutdownWorker("SIGINT");
});

process.on("SIGTERM", () => {
	void shutdownWorker("SIGTERM");
});
