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

const colors = {
    error: "red",
    warn: "yellow",
    info: "blue",
    http: "magenta",
    debug: "white",
};

winston.addColors(colors);

// ── Formats ──────────────────────────────────────────────────────────────────

const getConsoleLevel = (): string => {
    try {
        return configManager.getLoggingConfig().level;
    } catch {
        const env = process.env.NODE_ENV || "development";
        return env === "development" ? "debug" : "warn";
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

/** Human-readable format used for the console transport. */
const consoleFormat = () =>
    winston.format.combine(
        winston.format.timestamp({ format: "DD MMM, YYYY - HH:mm:SS A" }),
        useColors() ? winston.format.colorize({ all: true }) : winston.format.uncolorize(),
        winston.format.align(),
        winston.format.printf((info) => `[${info.timestamp}] ${info.level}: ${info.message}`),
        winston.format.splat(),
    );

/** JSON format used for file transports — no ANSI color codes. */
const fileFormat = () => {
    if (useJsonFormat()) {
        return winston.format.combine(
            winston.format.timestamp(),
            winston.format.uncolorize(),
            winston.format.json(),
        );
    }
    return winston.format.combine(
        winston.format.timestamp({ format: "DD MMM, YYYY - HH:mm:SS A" }),
        winston.format.uncolorize(),
        winston.format.align(),
        winston.format.printf((info) => `[${info.timestamp}] ${info.level}: ${info.message}`),
        winston.format.splat(),
    );
};

// ── Transports ────────────────────────────────────────────────────────────────

/**
 * Console: level is controlled by config.yaml → logging.level.
 * File transports always capture everything regardless of that setting.
 */
const transports: winston.transport[] = [
    // Console — limited by config level
    new winston.transports.Console({
        level: getConsoleLevel(),
        format: consoleFormat(),
    }),

    // app.log — captures every level (debug = lowest in our custom scale)
    new winston.transports.File({
        filename: "./logs/app.log",
        level: "debug",
        format: fileFormat(),
    }),

    // error.log — errors only
    new winston.transports.File({
        filename: "./logs/error.log",
        level: "error",
        format: fileFormat(),
    }),
];

// ── Logger instance ───────────────────────────────────────────────────────────

/**
 * The logger itself has no level cap so transports decide independently.
 * Setting the logger level to "debug" means nothing is filtered before
 * reaching the transports — each transport then applies its own level.
 */
const log = winston.createLogger({
    level: "debug",
    levels,
    transports,
});

const { info, warn, debug, error } = log;

// ── Morgan HTTP stream ────────────────────────────────────────────────────────

const stream = {
    write: (message: string) => log.http(message.trim()),
};

const skip = () => {
    try {
        return !configManager.getLoggingConfig().log_requests;
    } catch {
        const env = process.env.NODE_ENV || "development";
        return env !== "development";
    }
};

const getRequestIdHeader = () => {
    try {
        return configManager.getMiddlewareConfig().request_id.header_name;
    } catch {
        return "X-Request-ID";
    }
};

const winston_logger = morgan(
    `:remote-addr ":method :url HTTP/:http-version" :status - :response-time ms - :res[${getRequestIdHeader()}]`,
    { stream, skip },
);

export { debug, error, info, log, warn, winston_logger };
