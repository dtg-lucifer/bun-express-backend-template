import { NotFoundError } from "~/shared/errors";
import { ErrorCode } from "~/shared/errors/errorCodes";

export class UserNotFoundError extends NotFoundError {
    constructor() {
        super("User not found", ErrorCode.USER_NOT_FOUND);
    }
}
