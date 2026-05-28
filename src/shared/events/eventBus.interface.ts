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
