import { EventEmitter } from "node:events";
import { logger } from "~/shared/logging";

/**
 * Typed domain event map — add new events here as the app grows.
 */
export interface DomainEventMap {
	"auth.user.registered": { userId: string; email: string };
	"queue.job.enqueued": { queue: string; jobName: string; jobId: string };
}

export type DomainEventName = keyof DomainEventMap;

type Listener<E extends DomainEventName> = (payload: DomainEventMap[E]) => void | Promise<void>;

export interface IEventBus {
	emit<E extends DomainEventName>(event: E, payload: DomainEventMap[E]): void;
	on<E extends DomainEventName>(event: E, listener: Listener<E>): void;
}

class DomainEventBus implements IEventBus {
	private readonly emitter = new EventEmitter();

	emit<E extends DomainEventName>(event: E, payload: DomainEventMap[E]): void {
		this.emitter.emit(event, payload);
	}

	on<E extends DomainEventName>(event: E, listener: (payload: DomainEventMap[E]) => void | Promise<void>): void {
		this.emitter.on(event, (payload: DomainEventMap[E]) => {
			void Promise.resolve(listener(payload)).catch((err: unknown) => {
				logger.error(`[EVENTS] Listener failed for ${String(event)}`, { err });
			});
		});
	}
}

/**
 * Creates a new instance of the DomainEventBus.
 */
export function createDomainEventBus(): DomainEventBus {
	return new DomainEventBus();
}

// Default event bus instance (singleton)
export const eventBus: IEventBus = new DomainEventBus();
export { DomainEventBus };
