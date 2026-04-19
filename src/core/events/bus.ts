import { EventEmitter } from "node:events";

export interface DomainEventMap {
    "auth.user.registered": {
        userId: string;
        email: string;
    };
    "queue.job.enqueued": {
        queue: string;
        jobName: string;
        jobId: string;
    };
}

type DomainEventName = keyof DomainEventMap;
type DomainEventListener<EventName extends DomainEventName> = (
    payload: DomainEventMap[EventName],
) => void | Promise<void>;

export class DomainEventBus {
    private readonly emitter = new EventEmitter();

    on<EventName extends DomainEventName>(
        eventName: EventName,
        listener: DomainEventListener<EventName>,
    ): void {
        this.emitter.on(eventName, (payload: DomainEventMap[EventName]) => {
            void Promise.resolve(listener(payload)).catch((error: unknown) => {
                console.error(`[EVENTS] Listener failed for ${String(eventName)}`, error);
            });
        });
    }

    emit<EventName extends DomainEventName>(
        eventName: EventName,
        payload: DomainEventMap[EventName],
    ): void {
        this.emitter.emit(eventName, payload);
    }
}

export const createDomainEventBus = (): DomainEventBus => new DomainEventBus();
