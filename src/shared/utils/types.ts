export enum ROLE {
	ADMIN = "ADMIN",
	USER = "USER",
}

export enum CATEGORY {
	GENERAL = "GENERAL",
	TECH = "TECH",
	CULTURAL = "CULTURAL",
}

// Type definitions for CSV rows
export interface UserCSVRow {
	First_Name: string;
	Middle_Name: string;
	Last_Name: string;
	Email: string;
	Phone: string;
	Campus: string;
	Role: keyof typeof ROLE;
	Event_Category: string;
	Associated_Teams: string;
}

export enum EventCategory {
	ALL_ACCESS = "ALL_ACCESS",
	FLAGSHIP_EVENTS = "FLAGSHIP_EVENTS",
	FASHION_EVENTS = "FASHION_EVENTS",
	DANCING_EVENTS = "DANCING_EVENTS",
	DRAMATIC_EVENTS = "DRAMATIC_EVENTS",
	LITERARY_EVENTS = "LITERARY_EVENTS",
	PHOTOGRAPHY_EVENTS = "PHOTOGRAPHY_EVENTS",
	MOVIE_EVENTS = "MOVIE_EVENTS",
	ART_EVENTS = "ART_EVENTS",
	MUSIC_EVENTS = "MUSIC_EVENTS",
	DESIGNING_EVENTS = "DESIGNING_EVENTS",
}

export interface EventCSVRow {
	Timestamp: string;
	Event_Name: string;
	Description: string;
	Category: keyof typeof CATEGORY;
	Thumbnail: string;
	Max_Registrations: string;
	Domain_Lead_Email: string;
}
