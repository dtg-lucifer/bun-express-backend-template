import type { PaginationMeta, PaginationParams } from "~/shared/types/common.types";

export function calculatePagination(page: number = 1, limit: number = 10): PaginationParams {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(Math.max(1, limit), 100);
    return { page: safePage, limit: safeLimit, offset: (safePage - 1) * safeLimit };
}

export function calculatePaginationMeta(
    page: number,
    limit: number,
    total: number,
): PaginationMeta {
    const totalPages = Math.ceil(total / limit);
    return {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
    };
}

export function parsePaginationParams(query: {
    page?: string | number;
    limit?: string | number;
}): PaginationParams {
    const page = typeof query.page === "string" ? parseInt(query.page, 10) : (query.page ?? 1);
    const limit = typeof query.limit === "string" ? parseInt(query.limit, 10) : (query.limit ?? 10);
    return calculatePagination(page, limit);
}
