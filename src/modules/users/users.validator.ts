import { z } from "zod";

export const getUserByEmailQuerySchema = z.object({
	email: z.string().email(),
});

export const userIdParamSchema = z.object({
	id: z.string().uuid(),
});
