import type { Response } from "express";
import type { ApiResponse } from "~/shared/types/common.types";

/**
 * Send a 200 success response.
 */
export function successResponse<T>(res: Response, data: T, message?: string, statusCode: number = 200, meta?: Record<string, unknown>): void {
	const response: ApiResponse<T> = {
		success: true,
		data,
		...(message && { message }),
		...(meta && { meta }),
	};
	res.status(statusCode).json(response);
}

/**
 * Send a 201 created response.
 */
export function createdResponse<T>(res: Response, data: T, message: string = "Resource created successfully"): void {
	successResponse(res, data, message, 201);
}

/**
 * Send a 204 no-content response.
 */
export function noContentResponse(res: Response): void {
	res.status(204).send();
}

/**
 * Send an error response.
 */
export function errorResponse(res: Response, message: string, statusCode: number = 500, errors?: Array<{ field?: string; message: string; code?: string }>, meta?: Record<string, unknown>): void {
	const response: ApiResponse = {
		success: false,
		message,
		...(errors && { errors }),
		...(meta && { meta }),
	};
	res.status(statusCode).json(response);
}
