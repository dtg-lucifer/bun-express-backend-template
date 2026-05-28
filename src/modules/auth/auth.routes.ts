import { Router } from "express";
import type { IEventBus } from "~/shared/events";
import { eventBus } from "~/shared/events";
import { authenticate } from "~/shared/middleware/auth.middleware";
import { validateBody } from "~/shared/middleware/validate.middleware";
import { AuthController } from "./auth.controller";
import { AuthRepository, type IAuthRepository } from "./auth.repository";
import { AuthService, type IAuthService } from "./auth.service";
import { loginSchema, registerSchema } from "./auth.validator";

export interface AuthModuleDependencies {
	repository?: IAuthRepository;
	service?: IAuthService;
	controller?: AuthController;
	events?: IEventBus;
}

export function createAuthRouter(dependencies: AuthModuleDependencies = {}) {
	const router = Router();

	const repository = dependencies.repository ?? new AuthRepository();
	const service = dependencies.service ?? AuthService.withDebug(repository, dependencies.events ?? eventBus);
	const controller = dependencies.controller ?? new AuthController(service);

	router.post("/register", validateBody(registerSchema), controller.register);
	router.post("/login", validateBody(loginSchema), controller.login);
	router.get("/me", authenticate, controller.me);

	return router;
}

export default createAuthRouter();
