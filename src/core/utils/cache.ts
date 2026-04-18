/**
 * Cache class
 * @maintainer dtg-lucifer <dev.bosepiush@gmail.com>
 */

import { log } from "../middlewares/logger";

/**
 * This is a single-use cache implementation for storing temporary data needed during a request-response cycle
 * rather than storing it in the request object itself.
 *
 * Key characteristics:
 * - Values are automatically deleted after being retrieved with get()
 * - Each key can only store one value at a time
 * - Designed for temporary storage of data that should be used exactly once
 *
 * @example
 * ```ts
 * const cache = new Cache();
 * cache.set("key", "value");
 * cache.get("key"); // "value"
 * cache.get("key"); // undefined (value was automatically deleted after first get)
 * cache.get("key1"); // undefined
 *
 * // Manually managing cache
 * cache.set("temp", "data");
 * cache.has("temp"); // true
 * cache.clear();
 * cache.has("temp"); // false
 * ```
 */
export class Cache {
    private cache: Map<string, unknown>;

    constructor() {
        log.warn("Cache has been initialized");
        this.cache = new Map<string, unknown>();
    }

    /**
     * Set the value for the key in the cache store
     * @param key Key of the cache store
     * @param value Value for the key
     * @example
     * ```ts
     * const cache = new Cache();
     * cache.set("key", "value");
     * cache.get("key"); // "value" (and removes the key-value pair)
     * ```
     */
    public set(key: string, value: unknown): void {
        this.cache.set(key, value);
    }

    /**
     * Get the value for the key in the cache store and automatically delete it
     * @param key Key of the cache store
     * @returns Value of the key in the cache store if it is present otherwise undefined
     * @note This is a destructive read - the key-value pair is removed after retrieval
     * @example
     * ```ts
     * const cache = new Cache();
     * cache.set("key", "value");
     * cache.get("key"); // "value" (and removes the key-value pair)
     * cache.get("key"); // undefined (already removed)
     * ```
     */
    public get(key: string): unknown | undefined {
        const v = this.cache.get(key);
        this.delete(key);
        log.warn("Popped value from cache", v);
        return v;
    }

    /**
     * Delete the value for the key in the cache store
     * @param key Key of the cache store
     * @example
     * ```ts
     * const cache = new Cache();
     * cache.set("key", "value");
     * cache.delete("key");
     * cache.get("key"); // undefined
     * ```
     */
    private delete(key: string): void {
        this.cache.delete(key);
    }

    /**
     * Clear the entire cache store
     * @example
     * ```ts
     * const cache = new Cache();
     * cache.set("key", "value");
     * cache.clear();
     * cache.get("key"); // undefined
     * ```
     */
    public clear(): void {
        this.cache.clear();
    }

    /**
     * Check if the key is present in the cache store
     * @param key Key of the cache store
     * @returns true if the key is present in the cache store otherwise false
     * @example
     * ```ts
     * const cache = new Cache();
     * cache.set("key", "value");
     * cache.has("key"); // true
     * cache.has("key1"); // false
     * cache.get("key"); // "value" (and removes the key-value pair)
     * cache.has("key"); // false (already removed)
     * ```
     */
    public has(key: string): boolean {
        return this.cache.has(key);
    }
}
