/**
 * Utility functions for time formatting.
 * @module utils/time
 *
 * @maintainer Piush Bose <dev.bosepiush@gmail.com>
 * @github dtg-lucifer
 */

/**
 * Formats uptime given in milliseconds into a human-readable string.
 * @param milliseconds The uptime in milliseconds.
 * @returns A formatted string representing the uptime.
 */
export function formatUptime(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
        return `${days}d ${hours % 24}h ${minutes % 60}m`;
    } else if (hours > 0) {
        return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
        return `${minutes}m ${seconds % 60}s`;
    } else {
        return `${seconds}s`;
    }
}
