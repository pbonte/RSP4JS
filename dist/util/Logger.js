"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = exports.LogDestination = exports.LogLevel = void 0;
const fs = __importStar(require("fs"));
/* eslint-disable no-unused-vars */
var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["TRACE"] = 0] = "TRACE";
    LogLevel[LogLevel["DEBUG"] = 1] = "DEBUG";
    LogLevel[LogLevel["INFO"] = 2] = "INFO";
    LogLevel[LogLevel["CONFIG"] = 3] = "CONFIG";
    LogLevel[LogLevel["WARN"] = 4] = "WARN";
    LogLevel[LogLevel["ERROR"] = 5] = "ERROR";
    LogLevel[LogLevel["FATAL"] = 6] = "FATAL";
    LogLevel[LogLevel["SEVERE"] = 7] = "SEVERE";
    LogLevel[LogLevel["AUDIT"] = 8] = "AUDIT";
    LogLevel[LogLevel["STATS"] = 9] = "STATS";
})(LogLevel = exports.LogLevel || (exports.LogLevel = {}));
var LogDestination;
(function (LogDestination) {
    LogDestination[LogDestination["CONSOLE"] = 0] = "CONSOLE";
    LogDestination[LogDestination["FILE"] = 1] = "FILE";
})(LogDestination = exports.LogDestination || (exports.LogDestination = {}));
/* eslint-enable no-unused-vars */
/**
 * Logger class to log messages based on the log level, loggable classes, and log destination.
 */
class Logger {
    /**
     * Constructor for the Logger class.
     * @param {LogLevel} logLevel - The log level to be set for the logger. The log level can be one of the values from the LogLevel enum.
     * @param {string[]} loggableClasses - The classes which are loggable by the logger.
     * @param {any} logDestination - The destination to which the logs are to be written. The destination can be one of the values from the LogDestination enum which is either console or file.
     */
    constructor(logLevel, loggableClasses, logDestination) {
        this.log_level = logLevel;
        this.loggable_classes = loggableClasses;
        this.log_destination = logDestination;
        console.log(`Logger initialized with log level ${this.log_level}, loggable classes ${this.loggable_classes}, and log destination ${this.log_destination}`);
    }
    /**
     * Set the log level for the logger.
     * @param {LogLevel} logLevel - The log level to be set for the logger. The log level can be one of the values from the LogLevel enum.
     */
    setLogLevel(logLevel) {
        this.log_level = logLevel;
    }
    /**
     * Set the loggable classes for the logger.
     * @param {string[]} loggableClasses - The classes which are loggable by the logger.
     */
    setLoggableClasses(loggableClasses) {
        this.loggable_classes = loggableClasses;
    }
    /**
     * Set the log destination for the logger.
     * @param {LogDestination} logDestination - The destination to which the logs are to be written. The destination can be one of the values from the LogDestination enum which is either console or file.
     */
    setLogDestination(logDestination) {
        this.log_destination = logDestination;
    }
    /**
     * Log the message based on the log level, loggable classes, and log destination.
     * @param {LogLevel} level - The log level to be set for the logger. The log level can be one of the values from the LogLevel enum.
     * @param {string} message - The message to be logged.
     * @param {string} className - The class name from which the log message is being logged.
     */
    log(level, message, className) {
        if (level >= this.log_level && this.loggable_classes.includes(className)) {
            const logPrefix = `[${LogLevel[level]}] [${className}]`;
            const logMessage = `${Date.now()} ${logPrefix} ${message}`;
            switch (this.log_destination) {
                case 'CONSOLE':
                    console.log(logMessage);
                    break;
                case 'FILE':
                    try {
                        fs.appendFileSync(`./logs/${className}.log`, `${logMessage}\n`);
                    }
                    catch (error) {
                        console.error(`Error writing to file: ${error}`);
                    }
                    break;
                default:
                    console.log(`Invalid log destination: ${this.log_destination}`);
            }
        }
    }
    /**
     * Log the message with the TRACE log level.
     * @param {string} message - The message to be logged.
     * @param {string} className - The class name from which the log message is being logged.
     */
    trace(message, className) {
        this.log(LogLevel.TRACE, message, className);
    }
    /**
     * Log the message with the DEBUG log level.
     * @param {string} message - The message to be logged.
     * @param {string} className - The class name from which the log message is being logged.
     */
    debug(message, className) {
        this.log(LogLevel.DEBUG, message, className);
    }
    /**
     * Log the message with the INFO log level.
     * @param {string} message - The message to be logged.
     * @param {string} className - The class name from which the log message is being logged.
     */
    info(message, className) {
        this.log(LogLevel.INFO, message, className);
    }
    /**
     * Log the message with the CONFIG log level.
     * @param {string} message - The message to be logged.
     * @param {string} className - The class name from which the log message is being logged.
     */
    config(message, className) {
        this.log(LogLevel.CONFIG, message, className);
    }
    /**
     * Log the message with the WARN log level.
     * @param {string} message - The message to be logged.
     * @param {string} className - The class name from which the log message is being logged.
     */
    warn(message, className) {
        this.log(LogLevel.WARN, message, className);
    }
    /**
     * Log the message with the ERROR log level.
     * @param {string} message - The message to be logged.
     * @param {string} className - The class name from which the log message is being logged.
     */
    error(message, className) {
        this.log(LogLevel.ERROR, message, className);
    }
    /**
     * Log the message with the FATAL log level.
     * @param {string} message - The message to be logged.
     * @param {string} className - The class name from which the log message is being logged.
     */
    fatal(message, className) {
        this.log(LogLevel.FATAL, message, className);
    }
    /**
     * Log the message with the SEVERE log level.
     * @param {string} message - The message to be logged.
     * @param {string} className - The class name from which the log message is being logged.
     */
    severe(message, className) {
        this.log(LogLevel.SEVERE, message, className);
    }
    /**
     * Log the message with the AUDIT log level.
     * @param {string} message - The message to be logged.
     * @param {string} className - The class name from which the log message is being logged.
     */
    audit(message, className) {
        this.log(LogLevel.AUDIT, message, className);
    }
    /**
     * Log the message with the STATS log level.
     * @param {string} message - The message to be logged.
     * @param {string} className - The class name from which the log message is being logged.
     */
    stats(message, className) {
        this.log(LogLevel.STATS, message, className);
    }
    /**
     * Get the logger with the specified log level, loggable classes, and log destination.
     * @param {LogLevel} logLevel - The log level to be set for the logger. The log level can be one of the values from the LogLevel enum.
     * @param {string[]} loggableClasses - The classes which are loggable by the logger.
     * @param {LogDestination} logDestination - The destination to which the logs are to be written. The destination can be one of the values from the LogDestination enum which is either console or file.
     * @returns {Logger} - The logger with the specified log level, loggable classes, and log destination.
     */
    static getLogger(logLevel, loggableClasses, logDestination) {
        return new Logger(logLevel, loggableClasses, logDestination);
    }
    /**
     * Get the logger with the default log level, loggable classes, and log destination.
     * @returns {Logger} - The logger with the default log level, loggable classes, and log destination.
     */
    static getLoggerWithDefaults() {
        return new Logger(LogLevel.INFO, [], LogDestination.CONSOLE);
    }
}
exports.Logger = Logger;
