import { configManager } from "~/config";
import { logger } from "~/shared/logging";
import { getQueueProvider, type QueueJob, type QueueWorkerHandle } from "~/shared/queue";

export interface WelcomeEmailJobData {
	email: string;
	userId: string;
}

const EMAIL_QUEUE_NAME = "email-jobs";
let emailWorker: QueueWorkerHandle | null = null;

const getDefaultQueueOptions = () => {
	const queueConfig = configManager.getQueueConfig();

	return {
		attempts: queueConfig.bullmq.default_attempts,
		backoffMs: queueConfig.bullmq.default_backoff_ms,
	};
};

const assertQueueEnabled = () => {
	const queueConfig = configManager.getQueueConfig();
	const provider = getQueueProvider();

	if (provider.name === "bullmq" && !queueConfig.bullmq.enabled) {
		throw new Error("BullMQ is disabled in config.yaml");
	}
};

export const enqueueWelcomeEmailJob = async (data: WelcomeEmailJobData): Promise<QueueJob<WelcomeEmailJobData>> => {
	assertQueueEnabled();

	const queue = getQueueProvider();
	return queue.enqueue({
		queue: EMAIL_QUEUE_NAME,
		name: "send-welcome-email",
		data,
		deduplicationId: `welcome-email:${data.userId}`,
		...getDefaultQueueOptions(),
	});
};

const processEmailJob = async (job: QueueJob<WelcomeEmailJobData>) => {
	logger.info(`[QUEUE:${getQueueProvider().name}] Processing ${job.name} for ${job.data.email}`);
};

export const startQueueWorker = async () => {
	const workersConfig = configManager.getWorkersConfig();
	if (!workersConfig.notification_jobs.enabled) {
		logger.info("[QUEUE] notification_jobs disabled in config.yaml; worker not started");
		return null;
	}

	assertQueueEnabled();

	if (emailWorker) {
		return emailWorker;
	}

	const queue = getQueueProvider();
	emailWorker = await queue.startWorker(EMAIL_QUEUE_NAME, processEmailJob, {
		concurrency: 5,
		prefetch: 5,
	});

	logger.info(`[QUEUE] Worker started using provider '${queue.name}'`);
	return emailWorker;
};

export const closeQueueResources = async () => {
	if (emailWorker) {
		await emailWorker.close();
		emailWorker = null;
	}

	const queue = getQueueProvider();
	await queue.close();
};
