import type { DomainEventBus } from "~/core/events";
import { log } from "~/core/middlewares";

let handlersRegistered = false;

export const registerUserEventHandlers = (eventBus: DomainEventBus): void => {
    if (handlersRegistered) {
        return;
    }

    handlersRegistered = true;

    // Placeholder: add user domain event handlers here as the module grows.
    log.debug("[EVENTS] User event handlers registered");
    void eventBus; // suppress unused-variable warning until handlers are added
};
