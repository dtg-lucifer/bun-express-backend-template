import { Router } from "express";
import { authenticate } from "~/shared/middleware/auth.middleware";
import { validateBody } from "~/shared/middleware/validate.middleware";
import { AuthController } from "./auth.controller";
import { AuthRepository } from "./auth.repository";
import { loginSchema, registerSchema } from "./auth.validator";

const router = Router();
const authRepository = new AuthRepository();
const authController = new AuthController(authRepository);

router.post("/register", validateBody(registerSchema), authController.register);
router.post("/login", validateBody(loginSchema), authController.login);
router.get("/me", authenticate, authController.me);

export default router;
