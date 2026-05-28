import morgan from "morgan";
import winston from "winston";
import { configManager } from "~/config";
import { env } from "~/config/env";

const levels = { error: 0, warn: 1, info: 2, http: 3, debug: 4 };
const colors = { error: "red", warn: "yellow", info: "blue", http: "magenta", debug: "white" };

winston.addColors(colors);

const getConsoleLevel = (): string => {
	try {
		return configManager.getLoggingConfig().level;
	} catch {
		return env.isProduction ? "warn" : "debug";
	}
};

const useColors = (): boolean => {
	try {
		return configManager.getLoggingConfig().enable_colors;
	} catch {
		return true;
	}
};

const useJsonFormat = (): boolean => {
	try {
		return configManager.getLoggingConfig().format === "json";
	} catch {
		return false;
	}
};

const consoleFormat = () =>
	winston.format.combine(
		winston.format.timestamp({ format: "DD MMM, YYYY - HH:mm:ss A" }),
		useColors() ? winston.format.colorize({ all: true }) : winston.format.uncolorize(),
		winston.format.align(),
		winston.format.printf((info) => `[${info.timestamp}] ${info.level}: ${info.message}`),
		winston.format.splat(),
	);

const fileFormat = () => {
	if (useJsonFormat()) {
		return winston.format.combine(winston.format.timestamp(), winston.format.uncolorize(), winston.format.json());
	}
	return winston.format.combine(
		winston.format.timestamp({ format: "DD MMM, YYYY - HH:mm:ss A" }),
		winston.format.uncolorize(),
		winston.format.align(),
		winston.format.printf((info) => `[${info.timestamp}] ${info.level}: ${info.message}`),
		winston.format.splat(),
	);
};

const transports: winston.transport[] = [
	new winston.transports.Console({ level: getConsoleLevel(), format: consoleFormat() }),
	new winston.transports.File({
		filename: "./logs/app.log",
		level: "debug",
		format: fileFormat(),
	}),
	new winston.transports.File({
		filename: "./logs/error.log",
		level: "error",
		format: fileFormat(),
	}),
];

export const logger = winston.createLogger({ level: "debug", levels, transports });

// Morgan HTTP stream
const stream = { write: (message: string) => logger.http(message.trim()) };

const skip = () => {
	try {
		return !configManager.getLoggingConfig().log_requests;
	} catch {
		return !env.isDevelopment;
	}
};

const getRequestIdHeader = () => {
	try {
		return configManager.getMiddlewareConfig().request_id.header_name;
	} catch {
		return "X-Request-ID";
	}
};

export const httpLogger = morgan(`:remote-addr ":method :url HTTP/:http-version" :status - :response-time ms - :res[${getRequestIdHeader()}]`, { stream, skip });
