import { configManager } from "~/config";
import { enqueueWelcomeEmailJob } from "~/core/queues";
import { eventBus } from "~/shared/events";
import { logger } from "~/shared/logging";

let handlersRegistered = false;

/**
 * Registers domain-event listeners for auth-related events.
 * Safe to call multiple times.
 */
export function registerAuthEventListeners(): void {
    if (handlersRegistered) {
        return;
    }

    handlersRegistered = true;

    eventBus.on("auth.user.registered", async (payload) => {
        const workersConfig = configManager.getWorkersConfig();

        if (!workersConfig.notification_jobs.enabled) {
            logger.info(
                `[EVENTS] notification_jobs disabled; skip welcome email for ${payload.email}`,
            );
            return;
        }

        try {
            const job = await enqueueWelcomeEmailJob({
                userId: payload.userId,
                email: payload.email,
            });

            eventBus.emit("queue.job.enqueued", {
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
