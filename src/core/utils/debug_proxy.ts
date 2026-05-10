import { log } from "~/core/middlewares";

/**
 * Wraps a class instance in a Proxy that logs every method call with its
 * arguments, duration, and any thrown error using the project logger.
 *
 * Usage:
 *   const service = createDebugProxy(new AuthService(repo, eventBus), "AuthService");
 */
export function createDebugProxy<T extends object>(target: T, prefix: string): T {
    return new Proxy(target, {
        get(target, prop, receiver) {
            const value = Reflect.get(target, prop, receiver);

            if (typeof value === "function") {
                return async (...args: unknown[]) => {
                    const start = Date.now();

                    log.debug({ args }, `[${prefix}.${String(prop)}] --> START`);

                    try {
                        const result = await (value as (...a: unknown[]) => unknown).apply(
                            target,
                            args,
                        );

                        log.debug(
                            { duration: `${Date.now() - start}ms` },
                            `[${prefix}.${String(prop)}] <-- END`,
                        );

                        return result;
                    } catch (error) {
                        log.debug(
                            {
                                duration: `${Date.now() - start}ms`,
                                error: error instanceof Error ? error.message : String(error),
                            },
                            `[${prefix}.${String(prop)}] <-- ERROR`,
                        );

                        throw error;
                    }
                };
            }

            return value;
        },
    });
}
