import { env } from "~/config/env";
import { BullMqQueueProvider } from "./providers/bullmq.provider";
import { RabbitMqQueueProvider } from "./providers/rabbitmq.provider";

/**
 * Queue provider interface for different queue implementations
 */
export interface QueueJob<JobData = unknown> {
	id: string;
	name: string;
	data: JobData;
}

export interface EnqueueJobInput<JobData = unknown> {
	queue: string;
	name: string;
	data: JobData;
	deduplicationId?: string;
	attempts?: number;
	backoffMs?: number;
}

export interface QueueWorkerOptions {
	concurrency?: number;
	prefetch?: number;
}

export interface QueueWorkerHandle {
	close(): Promise<void>;
}

export interface IQueueProvider {
	readonly name: "bullmq" | "rabbitmq";

	enqueue<JobData>(input: EnqueueJobInput<JobData>): Promise<QueueJob<JobData>>;

	startWorker<JobData>(queue: string, processor: (job: QueueJob<JobData>) => Promise<void>, options?: QueueWorkerOptions): Promise<QueueWorkerHandle>;

	close(): Promise<void>;
}

let queueProviderInstance: IQueueProvider | null = null;

export function getQueueProvider() {
	if (queueProviderInstance) {
		return queueProviderInstance;
	}

	queueProviderInstance = env.QUEUE_PROVIDER === "rabbitmq" ? new RabbitMqQueueProvider() : new BullMqQueueProvider();

	return queueProviderInstance;
}

export function getQueueProviderName() {
	return getQueueProvider().name;
}

export async function closeQueueProvider() {
	if (!queueProviderInstance) {
		return;
	}

	await queueProviderInstance.close();
	queueProviderInstance = null;
}
