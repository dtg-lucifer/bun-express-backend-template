import { extendZodWithOpenApi, OpenAPIRegistry, OpenApiGeneratorV3 } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

// Extend Zod globally — importing this file is sufficient
extendZodWithOpenApi(z);

export const registry = new OpenAPIRegistry();

registry.registerComponent("securitySchemes", "BearerAuth", {
	type: "http",
	scheme: "bearer",
	bearerFormat: "JWT",
});

export function generateOpenApiDocument() {
	const generator = new OpenApiGeneratorV3(registry.definitions);
	return generator.generateDocument({
		openapi: "3.0.0",
		info: {
			version: "1.0.0",
			title: "Backend Template API",
			description: "Express + TypeScript backend API documentation",
		},
		servers: [{ url: "/api/v1", description: "API server" }],
		security: [{ BearerAuth: [] }],
	});
}
