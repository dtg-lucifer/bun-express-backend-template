import { type Job, type JobsOptions, Queue, type QueueOptions, Worker, type WorkerOptions } from "bullmq";
import IORedis from "ioredis";
import { configManager } from "~/config";
import { env } from "~/config/env";
import { logger } from "~/shared/logging";
import type { EnqueueJobInput, IQueueProvider, QueueJob, QueueWorkerHandle, QueueWorkerOptions } from "../queue";

interface QueueWithName {
	queue: Queue;
	name: string;
}

interface WorkerWithName {
	worker: Worker;
	queueName: string;
}

export class BullMqQueueProvider implements IQueueProvider {
	readonly name = "bullmq" as const;

	private connection: any | null = null;
	private readonly queues = new Map<string, QueueWithName>();
	private readonly workers = new Set<WorkerWithName>();

	private getConnection() {
		if (!this.connection) {
			this.connection = new IORedis(env.REDIS_URL, {
				maxRetriesPerRequest: null,
				enableReadyCheck: false,
			});

			this.connection.on("error", (error: Error) => {
				logger.error("[BULLMQ] Redis connection error", { err: error });
			});
		}

		return this.connection;
	}

	private getDefaultJobOptions(overrides?: Pick<JobsOptions, "attempts" | "backoff">) {
		const queueConfig = configManager.getQueueConfig();

		return {
			attempts: queueConfig.bullmq.default_attempts,
			backoff: {
				type: "exponential" as const,
				delay: queueConfig.bullmq.default_backoff_ms,
			},
			removeOnComplete: 1000,
			removeOnFail: 5000,
			...overrides,
		} satisfies JobsOptions;
	}

	private assertEnabled() {
		const queueConfig = configManager.getQueueConfig();

		if (!queueConfig.bullmq.enabled) {
			throw new Error("BullMQ is disabled in config.yaml");
		}
	}

	private getOrCreateQueue(queueName: string) {
		const existing = this.queues.get(queueName);
		if (existing) {
			return existing.queue;
		}

		const queueOptions: QueueOptions = {
			connection: this.getConnection(),
			defaultJobOptions: this.getDefaultJobOptions(),
		};

		const queue = new Queue(queueName, queueOptions);
		this.queues.set(queueName, { queue, name: queueName });

		return queue;
	}

	async enqueue<JobData>(input: EnqueueJobInput<JobData>) {
		this.assertEnabled();

		const queue = this.getOrCreateQueue(input.queue);
		const job = await queue.add(input.name, input.data as object, {
			...this.getDefaultJobOptions({
				attempts: input.attempts,
				backoff: input.backoffMs !== undefined ? { type: "exponential", delay: input.backoffMs } : undefined,
			}),
			jobId: input.deduplicationId,
		});

		return {
			id: String(job.id ?? "unknown"),
			name: job.name,
			data: job.data as JobData,
		} satisfies QueueJob<JobData>;
	}

	async startWorker<JobData>(queue: string, processor: (job: QueueJob<JobData>) => Promise<void>, options?: QueueWorkerOptions) {
		this.assertEnabled();

		const workerOptions: WorkerOptions = {
			connection: this.getConnection(),
			concurrency: options?.concurrency ?? 1,
		};

		const worker = new Worker(
			queue,
			async (job: Job) => {
				await processor({
					id: String(job.id ?? "unknown"),
					name: job.name,
					data: job.data as JobData,
				});
			},
			workerOptions,
		);

		worker.on("completed", (job) => {
			logger.info(`[BULLMQ] Completed job ${job.id}`);
		});

		worker.on("failed", (job, error) => {
			logger.error(`[BULLMQ] Job failed: ${job?.id ?? "unknown"}`, { err: error });
		});

		const wrapped = { worker, queueName: queue };
		this.workers.add(wrapped);

		const handle: QueueWorkerHandle = {
			close: async () => {
				await worker.close();
				this.workers.delete(wrapped);
			},
		};

		return handle;
	}

	async close() {
		await Promise.all([...this.workers].map(({ worker }) => worker.close()));
		this.workers.clear();

		await Promise.all([...this.queues.values()].map(({ queue }) => queue.close()));
		this.queues.clear();

		if (this.connection) {
			await this.connection.quit();
			this.connection = null;
		}
	}
}
