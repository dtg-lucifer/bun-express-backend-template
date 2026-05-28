import type { NextFunction, Request, Response } from "express";
import type { z } from "zod";
import { log as logger } from "./logger.middleware";

export const validate =
	(schema: z.ZodSchema) =>
	(req: Request, res: Response, next: NextFunction): void => {
		const result = schema.safeParse({
			body: req.body,
			query: req.query,
			params: req.params,
		});

		if (!result.success) {
			logger.warn("Validation failed", { path: req.path, errors: result.error.issues });

			// Build per-field error map from Zod issues
			const fieldErrors: Record<string, string[]> = {};
			for (const issue of result.error.issues) {
				// Build a readable field path, skipping the top-level "body"/"query"/"params" key
				const pathParts = issue.path.map(String);
				const fieldPath = pathParts.length > 1 ? pathParts.slice(1).join(".") : pathParts.join(".");
				if (!fieldErrors[fieldPath]) {
					fieldErrors[fieldPath] = [];
				}
				fieldErrors[fieldPath].push(issue.message);
			}

			// Build a human-readable summary message
			const errorDetails = Object.entries(fieldErrors)
				.map(([field, messages]) => `${field}: ${messages[0]}`)
				.join(", ");

			const message = errorDetails || "Validation failed";

			res.status(400).json({
				success: false,
				message,
				errors: fieldErrors,
			});
			return;
		}

		const data = result.data as Record<string, unknown>;
		if (data.body !== undefined) req.body = data.body;

		logger.debug("Validation successful", { path: req.path });
		next();
	};
