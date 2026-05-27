import { EventEmitter } from "node:events";
import { logger } from "~/shared/logging";
import type { DomainEventMap, DomainEventName, IEventBus } from "./eventBus.interface";

class DomainEventBus implements IEventBus {
    private readonly emitter = new EventEmitter();

    emit<E extends DomainEventName>(event: E, payload: DomainEventMap[E]): void {
        this.emitter.emit(event, payload);
    }

    on<E extends DomainEventName>(
        event: E,
        listener: (payload: DomainEventMap[E]) => void | Promise<void>,
    ): void {
        this.emitter.on(event, (payload: DomainEventMap[E]) => {
            void Promise.resolve(listener(payload)).catch((err: unknown) => {
                logger.error(`[EVENTS] Listener failed for ${String(event)}`, { err });
            });
        });
    }
}

export const eventBus: IEventBus = new DomainEventBus();
