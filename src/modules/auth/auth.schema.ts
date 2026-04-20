import { z } from "zod";

export const register_schema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
});

export const login_schema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
});

export type RegisterInput = z.infer<typeof register_schema>;
export type LoginInput = z.infer<typeof login_schema>;
