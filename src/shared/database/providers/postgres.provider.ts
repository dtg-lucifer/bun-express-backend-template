import type { PoolClient } from "pg";
import { Pool } from "pg";
import { configManager } from "~/config";
import { env } from "~/config/env";
import { logger } from "~/shared/logging";
import type { IDatabase } from "./../database";

/**
 * PostgreSQL provider backed by node-postgres (pg).
 * Reads connection settings from ConfigManager so config.yaml stays the
 * single source of truth for pool sizing and timeouts.
 */
export class PostgresProvider implements IDatabase {
	private readonly pool: Pool;
	private connected = false;

	constructor() {
		const dbConfig = configManager.getDatabaseConfig();

		this.pool = new Pool({
			connectionString: env.DATABASE_URL,
			max: dbConfig.pool_size,
			connectionTimeoutMillis: dbConfig.connection_timeout,
			idleTimeoutMillis: dbConfig.idle_timeout,
		});

		this.pool.on("error", (err) => {
			logger.error("[DATABASE] Unexpected pool error", { err });
		});
	}

	async query<T extends object = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]> {
		const result = await this.pool.query<T>(sql, params);
		return result.rows;
	}

	async connect(): Promise<PoolClient> {
		const client = await this.pool.connect();
		if (!this.connected) {
			await this.pool.query("SELECT 1");
			this.connected = true;
			logger.info("[DATABASE] PostgreSQL connected successfully");
			logger.info(`[DATABASE] Pool size: ${configManager.getDatabaseConfig().pool_size}`);
		}
		return client;
	}

	getPool(): Pool {
		return this.pool;
	}

	isConnected(): boolean {
		return this.connected;
	}

	async end(): Promise<void> {
		await this.pool.end();
		this.connected = false;
		logger.info("[DATABASE] PostgreSQL pool closed");
	}
}
