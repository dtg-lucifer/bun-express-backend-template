import { logger } from "./logger";

/**
 * Wraps a class instance in a Proxy that logs every method call with its
 * arguments, duration, and any thrown error using the project logger.
 *
 * Usage:
 *   const service = createDebugProxy(new AuthService(repo, eventBus), 'AuthService');
 */
export function createDebugProxy<T extends object>(target: T, prefix: string): T {
	return new Proxy(target, {
		get(target, prop, receiver) {
			const value = Reflect.get(target, prop, receiver);

			if (typeof value === "function") {
				return async (...args: unknown[]) => {
					const start = Date.now();
					logger.debug(`[${prefix}.${String(prop)}] --> START`, { args });

					try {
						const result = await (value as (...a: unknown[]) => unknown).apply(target, args);
						logger.debug(`[${prefix}.${String(prop)}] <-- END`, {
							duration: `${Date.now() - start}ms`,
						});
						return result;
					} catch (error) {
						logger.debug(`[${prefix}.${String(prop)}] <-- ERROR`, {
							duration: `${Date.now() - start}ms`,
							error: error instanceof Error ? error.message : String(error),
						});
						throw error;
					}
				};
			}

			return value;
		},
	});
}
