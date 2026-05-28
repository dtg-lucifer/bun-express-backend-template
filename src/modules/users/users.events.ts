import { logger } from "~/shared/logging";

let handlersRegistered = false;

export function registerUserEventListeners(): void {
	if (handlersRegistered) {
		return;
	}

	handlersRegistered = true;
	logger.debug("[EVENTS] User event listeners registered");
}
