import type { Pool, PoolClient } from "pg";

/**
 * Database connection interface — abstracts the pg.Pool so repositories
 * can be tested with a mock without touching a real database.
 */
export interface IDatabase {
    getPool(): Pool;
    query<T extends object = Record<string, unknown>>(
        sql: string,
        params?: unknown[],
    ): Promise<T[]>;
    connect(): Promise<PoolClient>;
    isConnected(): boolean;
}
