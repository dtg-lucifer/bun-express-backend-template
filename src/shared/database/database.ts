import { logger } from "~/shared/logging";
import type { IDatabase } from "./database.interface";
import { PostgresProvider } from "./providers/postgres.provider";

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
