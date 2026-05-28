import type { Response } from "express";
import { log } from "~/shared/middlewares";

export class AuthError extends Error {
	statusCode: number;
	message: string;
	name: string;
	requestId: string | null;

	constructor(message: string, statusCode: number, requestId: string | null = null) {
		super(message);
		this.message = message;
		this.statusCode = statusCode;
		this.requestId = requestId;
		this.name = "AuthError";
	}
}

export class APIError extends AuthError {
	constructor(message: string, statusCode: number, requestId: string | null = null) {
		super(message, statusCode, requestId);
		this.name = "APIError";
	}

	logError() {
		log.error(`APIError: ${this.message}, StatusCode: ${this.statusCode}, RequestId: ${this.requestId}`);
	}
}

interface ApiResponseBase {
	success: boolean;
	message: string;
	statusCode: number;
	requestId?: string;
}

export interface ApiSuccessResponse<T = unknown> extends ApiResponseBase {
	success: true;
	data?: T;
}

export interface ApiErrorResponse extends ApiResponseBase {
	success: false;
	errors?: unknown;
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Standardized API Response Helper
 *
 * Services use these to build responses without access to `res`.
 * Call `sendResponse(res, response)` in route handlers to send them.
 */
export const api_response = {
	success: <T>(message: string, data?: T, statusCode: number = 200): ApiSuccessResponse<T> => ({
		success: true,
		message,
		data,
		statusCode,
	}),

	error: (message: string, statusCode: number = 500, errors?: unknown): ApiErrorResponse => ({
		success: false,
		message,
		errors,
		statusCode,
	}),
};

/**
 * Sends an ApiResponse, automatically injecting requestId from res.locals.
 * Use this in route handlers instead of manually calling res.json().
 */
export function sendResponse<T>(res: Response, response: ApiResponse<T>): void {
	if (res.locals?.requestId) {
		response.requestId = res.locals.requestId;
	}
	res.status(response.statusCode).json(response);
}
