import { z } from "zod";
import { registry } from "~/config/openapi";

const AuthUserSchema = z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    isActive: z.boolean(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
});

const ErrorResponseSchema = z.object({
    success: z.boolean(),
    message: z.string(),
    code: z.string().optional(),
    requestId: z.string().optional(),
});

registry.registerPath({
    method: "post",
    path: "/auth/register",
    tags: ["Authentication"],
    summary: "Register a new user",
    security: [],
    request: {
        body: {
            content: {
                "application/json": {
                    schema: z.object({
                        email: z.string().email(),
                        password: z.string().min(8),
                    }),
                },
            },
        },
    },
    responses: {
        201: {
            description: "User registered successfully",
            content: {
                "application/json": {
                    schema: z.object({
                        success: z.boolean(),
                        message: z.string(),
                        data: z.object({ user: AuthUserSchema }),
                    }),
                },
            },
        },
        409: {
            description: "Email already registered",
            content: { "application/json": { schema: ErrorResponseSchema } },
        },
    },
});

registry.registerPath({
    method: "post",
    path: "/auth/login",
    tags: ["Authentication"],
    summary: "Login with email and password",
    security: [],
    request: {
        body: {
            content: {
                "application/json": {
                    schema: z.object({
                        email: z.string().email(),
                        password: z.string().min(1),
                    }),
                },
            },
        },
    },
    responses: {
        200: {
            description: "Login successful",
            content: {
                "application/json": {
                    schema: z.object({
                        success: z.boolean(),
                        message: z.string(),
                        data: z.object({
                            user: AuthUserSchema,
                            tokens: z.object({
                                accessToken: z.string(),
                                refreshToken: z.string(),
                            }),
                        }),
                    }),
                },
            },
        },
        401: {
            description: "Invalid credentials",
            content: { "application/json": { schema: ErrorResponseSchema } },
        },
    },
});

registry.registerPath({
    method: "get",
    path: "/auth/me",
    tags: ["Authentication"],
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
                        data: z.object({ user: AuthUserSchema }),
                    }),
                },
            },
        },
        401: {
            description: "Not authenticated",
            content: { "application/json": { schema: ErrorResponseSchema } },
        },
    },
});
