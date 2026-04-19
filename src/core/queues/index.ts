import { configManager } from "@config/index";
import { log } from "@core/middlewares";
import { type Job, type JobsOptions, Queue, Worker } from "bullmq";
import IORedis from "ioredis";

export interface WelcomeEmailJobData {
    email: string;
    userId: string;
}

const EMAIL_QUEUE_NAME = "email-jobs";

let queueConnection: IORedis | null = null;
let emailQueue: Queue<WelcomeEmailJobData> | null = null;
let emailWorker: Worker<WelcomeEmailJobData> | null = null;

const getQueueConnection = (): IORedis => {
    if (!queueConnection) {
        queueConnection = new IORedis(Bun.env.REDIS_URL || "redis://localhost:6379", {
            maxRetriesPerRequest: null,
            enableReadyCheck: false,
        });

        queueConnection.on("error", (error) => {
            log.error("[BULLMQ] Redis connection error", error);
        });
    }

    return queueConnection;
};

const getDefaultJobOptions = (): JobsOptions => {
    const queueConfig = configManager.getQueueConfig();

    return {
        attempts: queueConfig.bullmq.default_attempts,
        backoff: {
            type: "exponential",
            delay: queueConfig.bullmq.default_backoff_ms,
        },
        removeOnComplete: 1000,
        removeOnFail: 5000,
    };
};

const assertQueueEnabled = (): void => {
    const queueConfig = configManager.getQueueConfig();
    if (!queueConfig.bullmq.enabled) {
        throw new Error("BullMQ is disabled in config.yaml");
    }
};

export const getEmailQueue = (): Queue<WelcomeEmailJobData> => {
    assertQueueEnabled();

    if (!emailQueue) {
        emailQueue = new Queue<WelcomeEmailJobData>(EMAIL_QUEUE_NAME, {
            connection: getQueueConnection(),
            defaultJobOptions: getDefaultJobOptions(),
        });
    }

    return emailQueue;
};

export const enqueueWelcomeEmailJob = async (
    data: WelcomeEmailJobData,
): Promise<Job<WelcomeEmailJobData>> => {
    const queue = getEmailQueue();

    return queue.add("send-welcome-email", data, {
        ...getDefaultJobOptions(),
        jobId: `welcome-email:${data.userId}`,
    });
};

const processEmailJob = async (job: Job<WelcomeEmailJobData>): Promise<void> => {
    log.info(`[BULLMQ] Processing ${job.name} for ${job.data.email}`);
};

export const startQueueWorker = (): Worker<WelcomeEmailJobData> | null => {
    const workersConfig = configManager.getWorkersConfig();
    if (!workersConfig.notification_jobs.enabled) {
        log.info("[BULLMQ] notification_jobs disabled in config.yaml; email worker not started");
        return null;
    }

    if (emailWorker) {
        return emailWorker;
    }

    emailWorker = new Worker<WelcomeEmailJobData>(EMAIL_QUEUE_NAME, processEmailJob, {
        connection: getQueueConnection(),
        concurrency: 5,
    });

    emailWorker.on("completed", (job) => {
        log.info(`[BULLMQ] Completed job ${job.id}`);
    });

    emailWorker.on("failed", (job, error) => {
        log.error(`[BULLMQ] Job failed: ${job?.id ?? "unknown"}`, error);
    });

    return emailWorker;
};

export const closeQueueResources = async (): Promise<void> => {
    if (emailWorker) {
        await emailWorker.close();
        emailWorker = null;
    }

    if (emailQueue) {
        await emailQueue.close();
        emailQueue = null;
    }

    if (queueConnection) {
        await queueConnection.quit();
        queueConnection = null;
    }
};
