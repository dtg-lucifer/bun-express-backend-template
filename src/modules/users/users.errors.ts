import { ErrorCode, NotFoundError } from "~/shared/errors";

export class UserNotFoundError extends NotFoundError {
	constructor() {
		super("User not found", ErrorCode.USER_NOT_FOUND);
	}
}
