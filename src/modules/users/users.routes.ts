import { Router } from "express";
import { type IUsersRepository, UsersRepository } from "~/shared/database/repositories/users.repository";
import { authenticate } from "~/shared/middleware/auth.middleware";
import { validateQuery } from "~/shared/middleware/validate.middleware";
import { UsersController } from "./users.controller";
import { type IUsersService, UsersService } from "./users.service";
import { getUserByEmailQuerySchema } from "./users.validator";

export interface UsersModuleDependencies {
	repository?: IUsersRepository;
	service?: IUsersService;
	controller?: UsersController;
}

export function createUsersRouter(dependencies: UsersModuleDependencies = {}) {
	const router = Router();

	const repository = dependencies.repository ?? new UsersRepository();
	const service = dependencies.service ?? UsersService.withDebug(repository);
	const controller = dependencies.controller ?? new UsersController(service);

	router.get("/", authenticate, validateQuery(getUserByEmailQuerySchema), controller.getUserByEmail);
	router.get("/me", authenticate, controller.me);

	return router;
}

export default createUsersRouter();
