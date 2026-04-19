import morgan from "morgan";
import winston from "winston";
import { configManager } from "../../config";

const levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
};

const getLogLevel = () => {
    try {
        const loggingConfig = configManager.getLoggingConfig();
        return loggingConfig.level;
    } catch {
        // Fallback if config is not loaded yet
        const env = process.env.NODE_ENV || "development";
        return env === "development" ? "debug" : "warn";
    }
};

const colors = {
    error: "red",
    warn: "yellow",
    info: "blue",
    http: "magenta",
    debug: "white",
};

winston.addColors(colors);

const getLogFormat = () => {
    try {
        const loggingConfig = configManager.getLoggingConfig();
        const useColors = loggingConfig.enable_colors;

        if (loggingConfig.format === "json") {
            return winston.format.combine(
                winston.format.timestamp(),
                winston.format.printf(
                    (info) => `[${info.timestamp}] ${info.level}: ${info.message}`,
                ),
                winston.format.json(),
            );
        }

        // Simple format
        return winston.format.combine(
            winston.format.timestamp({ format: "DD MMM, YYYY - HH:mm:SS A" }),
            useColors ? winston.format.colorize({ all: true }) : winston.format.uncolorize(),
            winston.format.align(),
            winston.format.printf((info) => `[${info.timestamp}] ${info.level}: ${info.message}`),
            winston.format.splat(),
        );
    } catch {
        // Fallback format
        return winston.format.combine(
            winston.format.timestamp({ format: "DD MMM, YYYY - HH:mm:SS A" }),
            winston.format.colorize({ all: true }),
            winston.format.align(),
            winston.format.printf((info) => `[${info.timestamp}] ${info.level}: ${info.message}`),
            winston.format.splat(),
        );
    }
};

const jsonFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf((info) => `[${info.timestamp}] ${info.level}: ${info.message}`),
    winston.format.json(),
);

const transports = [
    new winston.transports.Console({}),
    new winston.transports.File({
        filename: "./logs/error.log",
        level: "error",
        format: jsonFormat,
    }),
    new winston.transports.File({
        filename: "./logs/app.log",
    }),
];

const log = winston.createLogger({
    level: getLogLevel(),
    levels,
    format: getLogFormat(),
    transports,
});

const { info, warn, debug, error } = log;

const stream = {
    write: (message: string) => log.http(message.trim()),
};

const skip = () => {
    try {
        const loggingConfig = configManager.getLoggingConfig();
        // Skip HTTP logging in production if log_requests is false
        return !loggingConfig.log_requests;
    } catch {
        // Fallback: skip in production
        const env = process.env.NODE_ENV || "development";
        return env !== "development";
    }
};

const getRequestIdHeader = () => {
    try {
        const middlewaresConfig = configManager.getMiddlewareConfig();
        return middlewaresConfig.request_id.header_name;
    } catch {
        return "X-Request-ID";
    }
};

const winston_logger = morgan(
    `:remote-addr ":method :url HTTP/:http-version" :status - :response-time ms - :res[${getRequestIdHeader()}]`,
    { stream, skip },
);

export { debug, error, info, log, warn, winston_logger };
