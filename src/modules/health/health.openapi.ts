import { z } from "zod";
import { registry } from "~/config/openapi";

// ── GET /health ───────────────────────────────────────────────────────────────

registry.registerPath({
	method: "get",
	path: "/health",
	tags: ["Health"],
	summary: "Health check — returns server status and metrics",
	security: [],
	responses: {
		200: {
			description: "Server is healthy",
			content: {
				"application/json": {
					schema: z.object({
						success: z.boolean().openapi({ example: true }),
						message: z.string().openapi({ example: "Server is up and running!!" }),
						data: z.object({
							status: z.string().openapi({ example: "healthy" }),
							timestamp: z.string().openapi({ example: "2026-05-18T10:00:00.000Z" }),
							environment: z.string().openapi({ example: "development" }),
							uptime: z.object({
								milliseconds: z.number().openapi({ example: 123456 }),
								formatted: z.string().openapi({ example: "2m 3s" }),
								startedAt: z.string().openapi({ example: "2026-05-18T09:57:57.000Z" }),
							}),
							memory: z.object({
								used: z.number().openapi({ example: 42 }),
								total: z.number().openapi({ example: 128 }),
								unit: z.literal("MB"),
							}),
							services: z.object({
								database: z.enum(["connected", "error"]).openapi({ example: "connected" }),
							}),
							ping: z.object({
								database: z.union([z.number(), z.literal("error")]).openapi({ example: 3 }),
								server: z.number().openapi({ example: 1 }),
								unit: z.literal("ms"),
							}),
						}),
						statusCode: z.number().openapi({ example: 200 }),
					}),
				},
			},
		},
		500: {
			description: "Health check failed",
			content: {
				"application/json": {
					schema: z.object({
						success: z.boolean().openapi({ example: false }),
						message: z.string().openapi({ example: "Health check failed" }),
						statusCode: z.number().openapi({ example: 500 }),
					}),
				},
			},
		},
	},
});
