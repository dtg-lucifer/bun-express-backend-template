import { ErrorCode, ErrorMessages } from "./errorCodes";

/**
 * Base error class for all application errors.
 * Throw these from services/controllers — the global error handler catches them.
 */
export class AppError extends Error {
    public readonly statusCode: number;
    public readonly isOperational: boolean;
    public readonly code: ErrorCode;
    public readonly timestamp: string;
    public readonly details?: unknown;

    constructor(
        message: string,
        statusCode: number = 500,
        code: ErrorCode = ErrorCode.INTERNAL_SERVER_ERROR,
        isOperational: boolean = true,
        details?: unknown,
    ) {
        super(message);
        Object.setPrototypeOf(this, new.target.prototype);

        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = isOperational;
        this.timestamp = new Date().toISOString();
        this.details = details;

        Error.captureStackTrace(this, this.constructor);
    }

    toJSON() {
        return {
            message: this.message,
            code: this.code,
            statusCode: this.statusCode,
            timestamp: this.timestamp,
            ...((this.details && { details: this.details }) as Record<string, unknown>),
        };
    }
}

export class ValidationError extends AppError {
    constructor(message: string = ErrorMessages[ErrorCode.VALIDATION_ERROR], details?: unknown) {
        super(message, 400, ErrorCode.VALIDATION_ERROR, true, details);
    }
}

export class BadRequestError extends AppError {
    constructor(
        message: string = ErrorMessages[ErrorCode.BAD_REQUEST],
        code: ErrorCode = ErrorCode.BAD_REQUEST,
        details?: unknown,
    ) {
        super(message, 400, code, true, details);
    }
}

export class UnauthorizedError extends AppError {
    constructor(
        message: string = ErrorMessages[ErrorCode.UNAUTHORIZED],
        code: ErrorCode = ErrorCode.UNAUTHORIZED,
        details?: unknown,
    ) {
        super(message, 401, code, true, details);
    }
}

export class ForbiddenError extends AppError {
    constructor(
        message: string = ErrorMessages[ErrorCode.FORBIDDEN],
        code: ErrorCode = ErrorCode.FORBIDDEN,
        details?: unknown,
    ) {
        super(message, 403, code, true, details);
    }
}

export class NotFoundError extends AppError {
    constructor(
        message: string = ErrorMessages[ErrorCode.NOT_FOUND],
        code: ErrorCode = ErrorCode.NOT_FOUND,
        details?: unknown,
    ) {
        super(message, 404, code, true, details);
    }
}

export class ConflictError extends AppError {
    constructor(
        message: string = ErrorMessages[ErrorCode.CONFLICT],
        code: ErrorCode = ErrorCode.CONFLICT,
        details?: unknown,
    ) {
        super(message, 409, code, true, details);
    }
}

export class InternalServerError extends AppError {
    constructor(
        message: string = ErrorMessages[ErrorCode.INTERNAL_SERVER_ERROR],
        code: ErrorCode = ErrorCode.INTERNAL_SERVER_ERROR,
        details?: unknown,
    ) {
        super(message, 500, code, false, details);
    }
}
