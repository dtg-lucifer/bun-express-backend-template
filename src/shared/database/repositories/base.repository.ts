import type { PoolClient } from "pg";
import type { IDatabase } from "../database";
import { getDatabase } from "../database";

/**
 * Base repository — all module repositories extend this.
 *
 * Dependency injection: pass an IDatabase instance in the constructor
 * (defaults to the singleton) so repositories can be tested with a mock.
 */
export abstract class BaseRepository {
	protected readonly db: IDatabase;

	constructor(db: IDatabase = getDatabase()) {
		this.db = db;
	}

	/**
	 * Run a set of queries inside a single transaction.
	 * The callback receives a connected PoolClient; commit/rollback are
	 * handled automatically.
	 */
	protected async transaction<R>(callback: (client: PoolClient) => Promise<R>): Promise<R> {
		const client = await this.db.connect();
		try {
			await client.query("BEGIN");
			const result = await callback(client);
			await client.query("COMMIT");
			return result;
		} catch (error) {
			await client.query("ROLLBACK");
			throw error;
		} finally {
			client.release();
		}
	}
}
