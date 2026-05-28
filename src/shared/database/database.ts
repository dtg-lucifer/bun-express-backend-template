import type { Pool, PoolClient } from "pg";
import { logger } from "~/shared/logging";
import { PostgresProvider } from "./providers/postgres.provider";

/**
 * Database connection interface — abstracts the pg.Pool so repositories
 * can be tested with a mock without touching a real database.
 */
export interface IDatabase {
	getPool(): Pool;
	query<T extends object = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
	connect(): Promise<PoolClient>;
	isConnected(): boolean;
}

let instance: PostgresProvider | null = null;

export function getDatabase(): IDatabase {
	if (!instance) {
		instance = new PostgresProvider();
	}
	return instance;
}

export async function initializeDatabase(): Promise<void> {
	const db = getDatabase() as PostgresProvider;
	await db.connect();
}

export async function closeDatabaseConnection(): Promise<void> {
	if (instance) {
		await instance.end();
		instance = null;
	} else {
		logger.warn("[DATABASE] closeDatabaseConnection called but no instance exists");
	}
}
