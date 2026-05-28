import crypto from "node:crypto";
import { env } from "~/config/env";
import { logger } from "~/shared/logging";
import type { EnqueueJobInput, IQueueProvider, QueueJob, QueueWorkerHandle, QueueWorkerOptions } from "../queue";

interface RabbitMessage {
	content: Buffer;
}

interface RabbitChannel {
	assertQueue(queue: string, options?: { durable?: boolean }): Promise<unknown>;
	sendToQueue(queue: string, content: Buffer, options?: { persistent?: boolean; messageId?: string }): boolean;
	consume(queue: string, onMessage: (message: RabbitMessage | null) => void, options?: { noAck?: boolean }): Promise<unknown>;
	prefetch(count: number): Promise<unknown> | unknown;
	ack(message: RabbitMessage): void;
	close(): Promise<void>;
}

interface RabbitConnection {
	createChannel(): Promise<RabbitChannel>;
	close(): Promise<void>;
}

interface RabbitModule {
	connect(url: string): Promise<RabbitConnection>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function isRabbitConnection(value: unknown): value is RabbitConnection {
	return isRecord(value) && typeof value.createChannel === "function" && typeof value.close === "function";
}

function asRabbitModule(candidate: unknown): RabbitModule {
	if (isRecord(candidate) && typeof candidate.connect === "function") {
		const connect = candidate.connect;

		return {
			connect: async (url: string) => {
				const connection = await Promise.resolve(connect(url));
				if (!isRabbitConnection(connection)) {
					throw new Error("Invalid RabbitMQ connection object returned by connect(url)");
				}

				return connection;
			},
		};
	}

	throw new Error("Invalid RabbitMQ module shape. Expected a connect(url) export.");
}

async function loadRabbitMqModule() {
	const moduleName = "amqplib";

	try {
		const moduleCandidate = await import(moduleName);
		if (isRecord(moduleCandidate) && "default" in moduleCandidate) {
			return asRabbitModule(moduleCandidate.default);
		}

		return asRabbitModule(moduleCandidate);
	} catch (error) {
		throw new Error("Failed to load RabbitMQ provider. Install 'amqplib' to use QUEUE_PROVIDER=rabbitmq.", { cause: error });
	}
}

export class RabbitMqQueueProvider implements IQueueProvider {
	readonly name = "rabbitmq" as const;

	private connection: RabbitConnection | null = null;
	private channel: RabbitChannel | null = null;

	private async getChannel() {
		if (this.channel) {
			return this.channel;
		}

		const rabbit = await loadRabbitMqModule();
		this.connection = await rabbit.connect(env.RABBITMQ_URL);
		this.channel = await this.connection.createChannel();

		return this.channel;
	}

	async enqueue<JobData>(input: EnqueueJobInput<JobData>) {
		const channel = await this.getChannel();
		await channel.assertQueue(input.queue, { durable: true });

		const jobId = input.deduplicationId ?? crypto.randomUUID();
		const payload = Buffer.from(
			JSON.stringify({
				id: jobId,
				name: input.name,
				data: input.data,
			}),
			"utf8",
		);

		channel.sendToQueue(input.queue, payload, {
			persistent: true,
			messageId: jobId,
		});

		return {
			id: jobId,
			name: input.name,
			data: input.data,
		} satisfies QueueJob<JobData>;
	}

	async startWorker<JobData>(queue: string, processor: (job: QueueJob<JobData>) => Promise<void>, options?: QueueWorkerOptions) {
		const channel = await this.getChannel();
		await channel.assertQueue(queue, { durable: true });

		const prefetchCount = options?.prefetch ?? options?.concurrency ?? 1;
		await Promise.resolve(channel.prefetch(prefetchCount));

		await channel.consume(
			queue,
			(message) => {
				if (!message) {
					return;
				}

				void (async () => {
					try {
						const parsed = JSON.parse(message.content.toString("utf8")) as {
							id?: string;
							name?: string;
							data: JobData;
						};

						await processor({
							id: parsed.id ?? crypto.randomUUID(),
							name: parsed.name ?? "unnamed-job",
							data: parsed.data,
						});

						channel.ack(message);
					} catch (error) {
						logger.error("[RABBITMQ] Failed to process message", { err: error });
					}
				})();
			},
			{ noAck: false },
		);

		const handle: QueueWorkerHandle = {
			close: async () => {
				await this.close();
			},
		};

		return handle;
	}

	async close() {
		if (this.channel) {
			await this.channel.close();
			this.channel = null;
		}

		if (this.connection) {
			await this.connection.close();
			this.connection = null;
		}
	}
}
