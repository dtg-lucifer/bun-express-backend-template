export interface RegisterInput {
	email: string;
	password: string;
}

export interface LoginInput {
	email: string;
	password: string;
}

export interface AuthUser {
	id: string;
	email: string;
	isActive: boolean;
	createdAt: Date;
	updatedAt: Date;
}

export interface AuthTokens {
	accessToken: string;
	refreshToken: string;
}

export interface AuthLoginResponse {
	user: AuthUser;
	tokens: AuthTokens;
}
