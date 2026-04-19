import crypto from "node:crypto";

const iterations = 120000;
const keyLength = 64;
const digest = "sha512";

export const hashPassword = async (password: string): Promise<string> => {
    const salt = crypto.randomBytes(16).toString("hex");
    const derived = crypto
        .pbkdf2Sync(password, salt, iterations, keyLength, digest)
        .toString("hex");
    return [iterations, salt, derived].join(":");
};

export const compareHashedPassword = async (
    password: string,
    hashedPassword: string,
): Promise<boolean> => {
    const [storedIterations, salt, storedHash] = hashedPassword.split(":");
    if (!(storedIterations && salt && storedHash)) {
        return false;
    }

    const derived = crypto
        .pbkdf2Sync(
            password,
            salt,
            Number.parseInt(storedIterations, 10),
            storedHash.length / 2,
            digest,
        )
        .toString("hex");

    return crypto.timingSafeEqual(Buffer.from(storedHash, "hex"), Buffer.from(derived, "hex"));
};
