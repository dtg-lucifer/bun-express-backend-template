/**
 * Common shared types used across the application
 */

export interface PaginationParams {
	page: number;
	limit: number;
	offset: number;
}

export interface PaginationMeta {
	page: number;
	limit: number;
	total: number;
	totalPages: number;
	hasNextPage: boolean;
	hasPreviousPage: boolean;
}

export enum SortOrder {
	ASC = "asc",
	DESC = "desc",
}

/**
 * Generic response wrapper — used by controllers to send consistent JSON.
 */
export interface ApiResponse<T = unknown> {
	success: boolean;
	data?: T;
	message?: string;
	meta?: Record<string, unknown>;
	errors?: Array<{
		field?: string;
		message: string;
		code?: string;
	}>;
}

export enum HealthStatus {
	HEALTHY = "healthy",
	UNHEALTHY = "unhealthy",
	DEGRADED = "degraded",
}
