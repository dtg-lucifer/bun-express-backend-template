import { z } from "zod";
import { registry } from "~/config/openapi";

const UserSchema = z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    isActive: z.boolean(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
});

registry.registerPath({
    method: "get",
    path: "/users",
    tags: ["Users"],
    summary: "Get user by email",
    security: [{ BearerAuth: [] }],
    request: {
        query: z.object({
            email: z.string().email(),
        }),
    },
    responses: {
        200: {
            description: "User found",
            content: {
                "application/json": {
                    schema: z.object({
                        success: z.boolean(),
                        message: z.string(),
                        data: z.object({ user: UserSchema }),
                    }),
                },
            },
        },
    },
});

registry.registerPath({
    method: "get",
    path: "/users/me",
    tags: ["Users"],
    summary: "Get currently authenticated user",
    security: [{ BearerAuth: [] }],
    responses: {
        200: {
            description: "Current user",
            content: {
                "application/json": {
                    schema: z.object({
                        success: z.boolean(),
                        message: z.string(),
                        data: z.object({ user: UserSchema }),
                    }),
                },
            },
        },
    },
});
