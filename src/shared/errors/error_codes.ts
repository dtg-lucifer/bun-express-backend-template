/**
 * Centralized error codes for the application
 */
export enum ErrorCode {
	// General errors (1000-1999)
	INTERNAL_SERVER_ERROR = "ERR_1000",
	VALIDATION_ERROR = "ERR_1001",
	NOT_FOUND = "ERR_1002",
	BAD_REQUEST = "ERR_1003",
	CONFLICT = "ERR_1004",
	UNPROCESSABLE_ENTITY = "ERR_1005",

	// Authentication errors (2000-2099)
	UNAUTHORIZED = "ERR_2000",
	INVALID_CREDENTIALS = "ERR_2001",
	TOKEN_EXPIRED = "ERR_2002",
	TOKEN_INVALID = "ERR_2003",
	TOKEN_MISSING = "ERR_2004",
	REFRESH_TOKEN_INVALID = "ERR_2005",
	REFRESH_TOKEN_EXPIRED = "ERR_2006",
	REFRESH_TOKEN_REUSED = "ERR_2007",

	// Authorization errors (2100-2199)
	FORBIDDEN = "ERR_2100",
	INSUFFICIENT_PERMISSIONS = "ERR_2101",

	// User errors (3000-3099)
	USER_NOT_FOUND = "ERR_3000",
	USER_ALREADY_EXISTS = "ERR_3001",
	USER_INACTIVE = "ERR_3002",
	USER_DELETED = "ERR_3003",
	INVALID_PASSWORD = "ERR_3004",

	// Database errors (4000-4099)
	DATABASE_CONNECTION_ERROR = "ERR_4000",
	DATABASE_QUERY_ERROR = "ERR_4001",
	DATABASE_TRANSACTION_ERROR = "ERR_4002",

	// Rate limiting errors (6000-6099)
	RATE_LIMIT_EXCEEDED = "ERR_6000",
}

export const ErrorMessages: Record<ErrorCode, string> = {
	[ErrorCode.INTERNAL_SERVER_ERROR]: "An internal server error occurred",
	[ErrorCode.VALIDATION_ERROR]: "Validation error",
	[ErrorCode.NOT_FOUND]: "Resource not found",
	[ErrorCode.BAD_REQUEST]: "Bad request",
	[ErrorCode.CONFLICT]: "Resource conflict",
	[ErrorCode.UNPROCESSABLE_ENTITY]: "Unprocessable entity",

	[ErrorCode.UNAUTHORIZED]: "Unauthorized",
	[ErrorCode.INVALID_CREDENTIALS]: "Invalid credentials",
	[ErrorCode.TOKEN_EXPIRED]: "Token has expired",
	[ErrorCode.TOKEN_INVALID]: "Invalid token",
	[ErrorCode.TOKEN_MISSING]: "Token is missing",
	[ErrorCode.REFRESH_TOKEN_INVALID]: "Invalid refresh token",
	[ErrorCode.REFRESH_TOKEN_EXPIRED]: "Refresh token has expired",
	[ErrorCode.REFRESH_TOKEN_REUSED]: "Refresh token reuse detected",

	[ErrorCode.FORBIDDEN]: "Forbidden",
	[ErrorCode.INSUFFICIENT_PERMISSIONS]: "Insufficient permissions",

	[ErrorCode.USER_NOT_FOUND]: "User not found",
	[ErrorCode.USER_ALREADY_EXISTS]: "User already exists",
	[ErrorCode.USER_INACTIVE]: "User account is inactive",
	[ErrorCode.USER_DELETED]: "User account has been deleted",
	[ErrorCode.INVALID_PASSWORD]: "Invalid password",

	[ErrorCode.DATABASE_CONNECTION_ERROR]: "Database connection error",
	[ErrorCode.DATABASE_QUERY_ERROR]: "Database query error",
	[ErrorCode.DATABASE_TRANSACTION_ERROR]: "Database transaction error",

	[ErrorCode.RATE_LIMIT_EXCEEDED]: "Rate limit exceeded",
};
