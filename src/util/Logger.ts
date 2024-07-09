import * as fs from 'fs';
/* eslint-disable no-unused-vars */
export enum LogLevel {
    TRACE,
    DEBUG,
    INFO,
    CONFIG,
    WARN,
    ERROR,
    FATAL,
    SEVERE,
    AUDIT,
    STATS
}

export enum LogDestination {
    CONSOLE,
    FILE,
}
/* eslint-enable no-unused-vars */

/**
 * Logger class to log messages based on the log level, loggable classes, and log destination.
 */
export class Logger {
    private log_level: LogLevel;
    private loggable_classes: string[];
    private log_destination: any;

    /**
     * Constructor for the Logger class.
     * @param {LogLevel} logLevel - The log level to be set for the logger. The log level can be one of the values from the LogLevel enum.
     * @param {string[]} loggableClasses - The classes which are loggable by the logger.
     * @param {any} logDestination - The destination to which the logs are to be written. The destination can be one of the values from the LogDestination enum which is either console or file.
     */
    constructor(logLevel: LogLevel, loggableClasses: string[], logDestination: any) {
        this.log_level = logLevel;
        this.loggable_classes = loggableClasses;
        this.log_destination = logDestination;
        console.log(`Logger initialized with log level ${this.log_level}, loggable classes ${this.loggable_classes}, and log destination ${this.log_destination}`);
        
    }

    /**
     * Set the log level for the logger.
     * @param {LogLevel} logLevel - The log level to be set for the logger. The log level can be one of the values from the LogLevel enum.
     */
    setLogLevel(logLevel: LogLevel) {
        this.log_level = logLevel;
    }

    /**
     * Set the loggable classes for the logger.
     * @param {string[]} loggableClasses - The classes which are loggable by the logger.
     */
    setLoggableClasses(loggableClasses: string[]) {
        this.loggable_classes = loggableClasses;
    }

    /**
     * Set the log destination for the logger.
     * @param {LogDestination} logDestination - The destination to which the logs are to be written. The destination can be one of the values from the LogDestination enum which is either console or file.
     */
    setLogDestination(logDestination: LogDestination) {
        this.log_destination = logDestination;
    }

    /**
     * Log the message based on the log level, loggable classes, and log destination.
     * @param {LogLevel} level - The log level to be set for the logger. The log level can be one of the values from the LogLevel enum.
     * @param {string} message - The message to be logged.
     * @param {string} className - The class name from which the log message is being logged.
     */
    log(level: LogLevel, message: string, className: string) {
        if (level >= this.log_level && this.loggable_classes.includes(className)){
            const logPrefix = `[${LogLevel[level]}] [${className}]`;
            const logMessage = `${Date.now()} ${logPrefix} ${message}`;
            switch (this.log_destination) {
                case 'CONSOLE':
                    console.log(logMessage);
                    break;
                case 'FILE':
                    try {
                        fs.appendFileSync(`./logs/${className}.log`, `${logMessage}\n`);                        
                    } catch (error) {
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
    trace(message: string, className: string) {
        this.log(LogLevel.TRACE, message, className);
    }

    /** 
     * Log the message with the DEBUG log level.
     * @param {string} message - The message to be logged.
     * @param {string} className - The class name from which the log message is being logged.
     */
    debug(message: string, className: string) {
        this.log(LogLevel.DEBUG, message, className);
    }

    /** 
     * Log the message with the INFO log level.
     * @param {string} message - The message to be logged.
     * @param {string} className - The class name from which the log message is being logged.
     */
    info(message: string, className: string) {
        this.log(LogLevel.INFO, message, className);
    }

    /** 
     * Log the message with the CONFIG log level.
     * @param {string} message - The message to be logged.
     * @param {string} className - The class name from which the log message is being logged.
     */
    config(message: string, className: string) {
        this.log(LogLevel.CONFIG, message, className);
    }

    /** 
     * Log the message with the WARN log level.
     * @param {string} message - The message to be logged.
     * @param {string} className - The class name from which the log message is being logged.
     */
    warn(message: string, className: string) {
        this.log(LogLevel.WARN, message, className);
    }

    /** 
     * Log the message with the ERROR log level.
     * @param {string} message - The message to be logged.
     * @param {string} className - The class name from which the log message is being logged.
     */
    error(message: string, className: string) {
        this.log(LogLevel.ERROR, message, className);
    }

    /** 
     * Log the message with the FATAL log level.
     * @param {string} message - The message to be logged.
     * @param {string} className - The class name from which the log message is being logged.
     */
    fatal(message: string, className: string) {
        this.log(LogLevel.FATAL, message, className);
    }

    /** 
     * Log the message with the SEVERE log level.
     * @param {string} message - The message to be logged.
     * @param {string} className - The class name from which the log message is being logged.
     */
    severe(message: string, className: string) {
        this.log(LogLevel.SEVERE, message, className);
    }

    /** 
     * Log the message with the AUDIT log level.
     * @param {string} message - The message to be logged.
     * @param {string} className - The class name from which the log message is being logged.
     */
    audit(message: string, className: string) {
        this.log(LogLevel.AUDIT, message, className);
    }

    /** 
     * Log the message with the STATS log level.
     * @param {string} message - The message to be logged.
     * @param {string} className - The class name from which the log message is being logged.
     */
    stats(message: string, className: string) {
        this.log(LogLevel.STATS, message, className);
    }

    /**
     * Get the logger with the specified log level, loggable classes, and log destination.
     * @param {LogLevel} logLevel - The log level to be set for the logger. The log level can be one of the values from the LogLevel enum.
     * @param {string[]} loggableClasses - The classes which are loggable by the logger.
     * @param {LogDestination} logDestination - The destination to which the logs are to be written. The destination can be one of the values from the LogDestination enum which is either console or file.
     * @returns {Logger} - The logger with the specified log level, loggable classes, and log destination.
     */
    static getLogger(logLevel: LogLevel, loggableClasses: string[], logDestination: LogDestination) {
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

