import fs from "node:fs";

import { log } from "~/shared/middlewares";

export enum EVENT_CATEGORY {
	GENERAL = "GENERAL",
	TECH = "TECH",
	CULTURAL = "CULTURAL",
}

const _BRACKET_REGEX = /^(.*?)\s*\((.*?)\)\s*$/;
const _TEAM_REGEX = /^([^(]+)/;

/**
 * Parse comma-separated values with proper trimming and quote handling
 */
export function parseCSVField(field: string): string[] {
	if (!field || field.trim() === "") return [];
	// Remove surrounding quotes if present
	const cleanedField = field.replace(/^["']|["']$/g, "").trim();
	if (!cleanedField) return [];

	return cleanedField
		.split(",")
		.map((item) => item.trim())
		.filter((item) => item.length > 0);
}

/**
 * Extract team names from complex format like "Team Phoenix(Fashion Team)"
 * Removes parenthetical descriptions and returns clean team names
 */
export function parseTeamNames(teamsString: string): string[] {
	if (!teamsString || teamsString.trim() === "") return [];

	// Remove surrounding quotes if present
	const cleanedString = teamsString.replace(/^["']|["']$/g, "").trim();
	if (!cleanedString) return [];

	const teams = cleanedString
		.split(",")
		.map((team) => {
			// Extract team name before parenthesis or use full string if no parenthesis
			const match = team.trim().match(_TEAM_REGEX);
			return match?.[1]?.trim() || team.trim();
		})
		.filter((team) => team.length > 0);

	return teams;
}

/**
 * Parse event categories and validate against EVENT_CATEGORY enum
 */
export function parseEventCategories(categoriesString: string): EVENT_CATEGORY[] {
	const categoryStrings = parseCSVField(categoriesString);
	const validCategories: EVENT_CATEGORY[] = [];

	for (const cat of categoryStrings) {
		const upperCat = cat.toUpperCase().replace(/\s+/g, "_");
		if (Object.values(EVENT_CATEGORY).includes(upperCat as EVENT_CATEGORY)) {
			validCategories.push(upperCat as EVENT_CATEGORY);
		}
	}

	return validCategories;
}

/**
 * Generate a URL-safe slug from a string
 * Converts to lowercase, replaces spaces/special chars with hyphens
 */
export function generateSlug(text: string): string {
	return text
		.toLowerCase()
		.trim()
		.replace(/[^\w\s-]/g, "") // Remove special characters
		.replace(/[\s_]+/g, "-") // Replace spaces and underscores with hyphens
		.replace(/-+/g, "-") // Replace multiple hyphens with single hyphen
		.replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
}

/**
 * Export user credentials to CSV file for admin distribution
 */
export function exportCredentialsToCSV(
	credentials: Array<{
		name: string;
		email: string;
		password: string;
	}>,
	filePath: string,
) {
	try {
		log.info("Exporting user credentials to CSV...");

		// Create CSV header
		const csvHeader = "Name,Email,Password\n";

		// Create CSV rows
		const csvRows = credentials.map((cred) => `"${cred.name}","${cred.email}","${cred.password}"`).join("\n");

		// Write to file
		fs.writeFileSync(filePath, csvHeader + csvRows, "utf-8");

		log.info(`[SEED] User credentials exported to: ${filePath}`);
		log.warn("[WARNING] Keep this file secure and delete it after sharing with admins!");
	} catch (error) {
		log.error("Error exporting credentials:", error);
	}
}
