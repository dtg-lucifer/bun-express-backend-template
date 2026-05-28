import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
	NODE_ENV: z.enum(["development", "production", "staging"]).default("development"),
	HOST: z.string().trim().min(1).default("0.0.0.0"),
	PORT: z.coerce.number().int().positive().default(8989),

	DATABASE_URL: z.string().trim().min(1),
	REDIS_URL: z.string().trim().min(1).default("redis://localhost:6379"),
	RABBITMQ_URL: z.string().trim().min(1).default("amqp://localhost:5672"),
	QUEUE_PROVIDER: z.enum(["bullmq", "rabbitmq"]).default("bullmq"),

	JWT_SECRET: z.string().trim().min(1),
	JWT_REFRESH_SECRET: z.string().trim().min(1),

	ALLOWED_ORIGINS: z.string().trim().min(1).default("http://localhost:3000,http://localhost:5173"),

	EMAIL: z.string().email().optional(),
	APP_PASSWORD: z.string().trim().min(1).optional(),
	APP_URL: z.string().trim().min(1).default("http://localhost:8989"),
	SUPER_ADMIN_EMAIL: z.string().email().optional(),
	SUPER_ADMIN_PASS: z.string().trim().min(1).optional(),

	npm_package_version: z.string().trim().min(1).optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
	const issues = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("\n");

	throw new Error(`Invalid environment configuration:\n${issues}`);
}

const values = parsed.data;

export const env = Object.freeze({
	...values,
	ALLOWED_ORIGINS_LIST: values.ALLOWED_ORIGINS.split(",")
		.map((origin) => origin.trim())
		.filter((origin) => origin.length > 0),
	isDevelopment: values.NODE_ENV === "development",
	isProduction: values.NODE_ENV === "production",
	isStaging: values.NODE_ENV === "staging",
});

export type Env = typeof env;
