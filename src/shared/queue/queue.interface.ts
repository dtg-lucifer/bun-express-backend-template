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
