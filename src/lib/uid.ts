import crypto from "node:crypto";

/**
 * Generate a unique identifier with a given prefix
 * @param prefix - The prefix for the UID (e.g., "SA_", "DL_", "PART_")
 * @returns A unique identifier in format: PREFIX + 8-character hex
 */
function generateUID(prefix: string): string {
	const validPrefixes = [
		"SA_", // Super Admin
		"DL_", // Domain Lead
		"CA_", // Campus Ambassador
		"CC_", // Checkin Crew
		"CAM_", // Campus
		"TEAM_", // Team
		"PART_", // Participant
		"TKT_", // Ticket
	];

	if (!validPrefixes.includes(prefix)) {
		throw new Error(`Invalid prefix "${prefix}". Must be one of: ${validPrefixes.join(", ")}`);
	}

	return `${prefix}${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
}

export { generateUID };
