import { ConflictError, ErrorCode, NotFoundError, UnauthorizedError } from "~/shared/errors";

export class UserAlreadyExistsError extends ConflictError {
	constructor(email: string) {
		super(`User with email '${email}' already exists`, ErrorCode.USER_ALREADY_EXISTS);
	}
}

export class InvalidCredentialsError extends UnauthorizedError {
	constructor() {
		super("Invalid email or password", ErrorCode.INVALID_CREDENTIALS);
	}
}

export class InactiveUserError extends UnauthorizedError {
	constructor() {
		super("User account is inactive", ErrorCode.USER_INACTIVE);
	}
}

export class AuthUserNotFoundError extends NotFoundError {
	constructor() {
		super("User not found", ErrorCode.USER_NOT_FOUND);
	}
}
