import { log } from "@core/middlewares";
import type { Response } from "express";

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
        log.error(
            `APIError: ${this.message}, StatusCode: ${this.statusCode}, RequestId: ${this.requestId}`,
        );
    }
}

interface ApiResponseBase {
    success: boolean;
    message: string;
    statusCode: number;
    requestId?: string;
}

interface ApiSuccessResponse<T> extends ApiResponseBase {
    success: true;
    data?: T;
}

interface ApiErrorResponse extends ApiResponseBase {
    success: false;
    errors?: unknown;
}

/**
 * Standardized API Response Helper
 *
 * Automatically includes X-Request-ID from res.locals if Response object is provided
 */
export const api_response = {
    /**
     * Success response
     * @param message - Success message
     * @param data - Response data (optional)
     * @param statusCode - HTTP status code (default: 200)
     * @param res - Express Response object (optional, for auto-injecting requestId)
     */
    success: <T>(
        message: string,
        data?: T,
        statusCode: number = 200,
        res?: Response,
    ): ApiSuccessResponse<T> => {
        const response: ApiSuccessResponse<T> = {
            success: true,
            message,
            data,
            statusCode,
        };

        // Automatically inject requestId if res is provided
        if (res?.locals?.requestId) {
            response.requestId = res.locals.requestId;
        }

        return response;
    },

    /**
     * Error response
     * @param message - Error message
     * @param statusCode - HTTP status code (default: 500)
     * @param errors - Additional error details (optional)
     * @param res - Express Response object (optional, for auto-injecting requestId)
     */
    error: (
        message: string,
        statusCode: number = 500,
        errors?: unknown,
        res?: Response,
    ): ApiErrorResponse => {
        const response: ApiErrorResponse = {
            success: false,
            message,
            errors,
            statusCode,
        };

        // Automatically inject requestId if res is provided
        if (res?.locals?.requestId) {
            response.requestId = res.locals.requestId;
        }

        return response;
    },
};
