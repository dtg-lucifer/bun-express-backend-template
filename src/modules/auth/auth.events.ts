import { configManager } from "~/config";
import type { IEventBus } from "~/shared/events";
import { eventBus } from "~/shared/events";
import { logger } from "~/shared/logging";
import { enqueueWelcomeEmailJob } from "~/shared/queues";

let handlersRegistered = false;

export interface AuthEventDependencies {
	events?: IEventBus;
}

/**
 * Registers domain-event listeners for auth-related events.
 * Safe to call multiple times.
 */
export function registerAuthEventListeners(dependencies: AuthEventDependencies = {}): void {
	if (handlersRegistered) {
		return;
	}

	handlersRegistered = true;

	const events = dependencies.events ?? eventBus;

	events.on("auth.user.registered", async (payload) => {
		const workersConfig = configManager.getWorkersConfig();

		if (!workersConfig.notification_jobs.enabled) {
			logger.info(`[EVENTS] notification_jobs disabled; skip welcome email for ${payload.email}`);
			return;
		}

		try {
			const job = await enqueueWelcomeEmailJob({
				userId: payload.userId,
				email: payload.email,
			});

			events.emit("queue.job.enqueued", {
				queue: "email-jobs",
				jobName: job.name,
				jobId: String(job.id ?? "unknown"),
			});

			logger.info(`[EVENTS] Queued welcome email job for ${payload.email}`);
		} catch (error) {
			logger.error("[EVENTS] Failed to enqueue welcome email job", { err: error });
		}
	});
}

/**
 * @deprecated Use `registerAuthEventListeners`.
 */
export const registerAuthEventHandlers = (_eventBus?: unknown): void => {
	registerAuthEventListeners();
};
