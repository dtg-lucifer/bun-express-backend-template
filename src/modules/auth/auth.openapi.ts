import { z } from "zod";
import { registry } from "~/config/openapi";

// ── Shared schemas ────────────────────────────────────────────────────────────

const UserSchema = z
    .object({
        id: z.string().uuid().openapi({ example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890" }),
        email: z.string().email().openapi({ example: "user@example.com" }),
    })
    .openapi("User");

const ErrorResponseSchema = z
    .object({
        success: z.boolean().openapi({ example: false }),
        message: z.string().openapi({ example: "Error message" }),
        errors: z.record(z.string(), z.array(z.string())).optional(),
        statusCode: z.number().openapi({ example: 400 }),
        requestId: z.string().optional().openapi({ example: "req-uuid" }),
    })
    .openapi("ErrorResponse");

// ── POST /auth/register ───────────────────────────────────────────────────────

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
                        email: z.string().email().openapi({ example: "user@example.com" }),
                        password: z.string().min(8).openapi({ example: "password123" }),
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
                        success: z.boolean().openapi({ example: true }),
                        message: z.string().openapi({ example: "User registered" }),
                        data: z.object({ user: UserSchema }),
                        statusCode: z.number().openapi({ example: 201 }),
                    }),
                },
            },
        },
        409: {
            description: "Email already registered",
            content: { "application/json": { schema: ErrorResponseSchema } },
        },
        400: {
            description: "Validation error",
            content: { "application/json": { schema: ErrorResponseSchema } },
        },
    },
});

// ── POST /auth/login ──────────────────────────────────────────────────────────

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
                        email: z.string().email().openapi({ example: "user@example.com" }),
                        password: z.string().min(1).openapi({ example: "password123" }),
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
                        success: z.boolean().openapi({ example: true }),
                        message: z.string().openapi({ example: "Login successful" }),
                        data: z.object({
                            user: UserSchema,
                            accessToken: z.string().openapi({ example: "eyJhbGci..." }),
                            refreshToken: z.string().openapi({ example: "eyJhbGci..." }),
                        }),
                        statusCode: z.number().openapi({ example: 200 }),
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

// ── GET /auth/me ──────────────────────────────────────────────────────────────

registry.registerPath({
    method: "get",
    path: "/auth/me",
    tags: ["Authentication"],
    summary: "Get the currently authenticated user",
    security: [{ BearerAuth: [] }],
    responses: {
        200: {
            description: "Current user returned",
            content: {
                "application/json": {
                    schema: z.object({
                        success: z.boolean().openapi({ example: true }),
                        message: z.string().openapi({ example: "Current user" }),
                        data: z.object({ user: UserSchema }),
                        statusCode: z.number().openapi({ example: 200 }),
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
