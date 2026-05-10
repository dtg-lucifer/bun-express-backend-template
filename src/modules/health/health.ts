/**
 * @deprecated Use `HealthController` from `./health.controller` directly.
 * This shim is kept for backward compatibility during the OOP migration.
 */
export { HealthController } from "./health.controller";

// Legacy named export used by old route registration code
import { HealthController } from "./health.controller";
export const healthcheck_router = new HealthController().router;
