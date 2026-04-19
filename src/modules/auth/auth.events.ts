import { configManager } from "@config/index";
import type { DomainEventBus } from "@core/events";
import { log } from "@core/middlewares";
import { enqueueWelcomeEmailJob } from "@core/queues";

let handlersRegistered = false;

export const registerAuthEventHandlers = (eventBus: DomainEventBus): void => {
    if (handlersRegistered) {
        return;
    }

    handlersRegistered = true;

    eventBus.on("auth.user.registered", async (payload) => {
        const workersConfig = configManager.getWorkersConfig();
        if (!workersConfig.notification_jobs.enabled) {
            log.info(
                `[EVENTS] notification_jobs disabled in config.yaml; skip welcome email for ${payload.email}`,
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
                jobId: job.id ?? "unknown",
            });

            log.info(`[EVENTS] Queued welcome email job for ${payload.email}`);
        } catch (error) {
            log.error("[EVENTS] Failed to enqueue welcome email job", error);
        }
    });
};
