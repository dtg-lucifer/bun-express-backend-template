import { Router } from "express";
import { UsersRepository } from "~/shared/database/repositories/users.repository";
import { authenticate } from "~/shared/middleware/auth.middleware";
import { validateQuery } from "~/shared/middleware/validate.middleware";
import { UsersController } from "./users.controller";
import { getUserByEmailQuerySchema } from "./users.validator";

const router = Router();
const usersRepository = new UsersRepository();
const usersController = new UsersController(usersRepository);

router.get(
    "/",
    authenticate,
    validateQuery(getUserByEmailQuerySchema),
    usersController.getUserByEmail,
);
router.get("/me", authenticate, usersController.me);

export default router;
