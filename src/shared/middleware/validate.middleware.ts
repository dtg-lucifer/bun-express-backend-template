import type { NextFunction, Request, Response } from "express";
import type { z } from "zod";
import { ValidationError } from "~/shared/errors";
import { logger } from "~/shared/logging";

export enum ValidationTarget {
    BODY = "body",
    QUERY = "query",
    PARAMS = "params",
}

function replaceRequestData(req: Request, target: ValidationTarget, validated: unknown): void {
    const r = req as unknown as Record<string, unknown>;
    try {
        r[target] = validated;
    } catch {
        const current = r[target];
        if (current && typeof current === "object" && validated && typeof validated === "object") {
            const cur = current as Record<string, unknown>;
            for (const key of Object.keys(cur)) delete cur[key];
            Object.assign(cur, validated);
        }
    }
}

export function validate(schema: z.ZodSchema, target: ValidationTarget = ValidationTarget.BODY) {
    return (req: Request, _res: Response, next: NextFunction): void => {
        try {
            const data = (req as unknown as Record<string, unknown>)[target];
            const validated = schema.parse(data);
            replaceRequestData(req, target, validated);
            logger.debug("Validation successful", { path: req.path });
            next();
        } catch (error) {
            if (error instanceof Error && error.name === "ZodError") {
                const zodError = error as z.ZodError;
                const errors = zodError.issues.map((issue) => ({
                    field: issue.path.join("."),
                    message: issue.message,
                    code: issue.code,
                }));
                next(new ValidationError("Validation failed", errors));
                return;
            }
            next(error);
        }
    };
}

export const validateBody = (schema: z.ZodSchema) => validate(schema, ValidationTarget.BODY);
export const validateQuery = (schema: z.ZodSchema) => validate(schema, ValidationTarget.QUERY);
export const validateParams = (schema: z.ZodSchema) => validate(schema, ValidationTarget.PARAMS);
