export declare enum LogLevel {
    TRACE = 0,
    DEBUG = 1,
    INFO = 2,
    CONFIG = 3,
    WARN = 4,
    ERROR = 5,
    FATAL = 6,
    SEVERE = 7,
    AUDIT = 8,
    STATS = 9
}
export declare enum LogDestination {
    CONSOLE = 0,
    FILE = 1
}
/**
 * Logger class to log messages based on the log level, loggable classes, and log destination.
 */
export declare class Logger {
    private log_level;
    private loggable_classes;
    private log_destination;
    /**
     * Constructor for the Logger class.
     * @param {LogLevel} logLevel - The log level to be set for the logger. The log level can be one of the values from the LogLevel enum.
     * @param {string[]} loggableClasses - The classes which are loggable by the logger.
     * @param {any} logDestination - The destination to which the logs are to be written. The destination can be one of the values from the LogDestination enum which is either console or file.
     */
    constructor(logLevel: LogLevel, loggableClasses: string[], logDestination: any);
    /**
     * Set the log level for the logger.
     * @param {LogLevel} logLevel - The log level to be set for the logger. The log level can be one of the values from the LogLevel enum.
     */
    setLogLevel(logLevel: LogLevel): void;
    /**
     * Set the loggable classes for the logger.
     * @param {string[]} loggableClasses - The classes which are loggable by the logger.
     */
    setLoggableClasses(loggableClasses: string[]): void;
    /**
     * Set the log destination for the logger.
     * @param {LogDestination} logDestination - The destination to which the logs are to be written. The destination can be one of the values from the LogDestination enum which is either console or file.
     */
    setLogDestination(logDestination: LogDestination): void;
    /**
     * Log the message based on the log level, loggable classes, and log destination.
     * @param {LogLevel} level - The log level to be set for the logger. The log level can be one of the values from the LogLevel enum.
     * @param {string} message - The message to be logged.
     * @param {string} className - The class name from which the log message is being logged.
     */
    log(level: LogLevel, message: string, className: string): void;
    /**
     * Log the message with the TRACE log level.
     * @param {string} message - The message to be logged.
     * @param {string} className - The class name from which the log message is being logged.
     */
    trace(message: string, className: string): void;
    /**
     * Log the message with the DEBUG log level.
     * @param {string} message - The message to be logged.
     * @param {string} className - The class name from which the log message is being logged.
     */
    debug(message: string, className: string): void;
    /**
     * Log the message with the INFO log level.
     * @param {string} message - The message to be logged.
     * @param {string} className - The class name from which the log message is being logged.
     */
    info(message: string, className: string): void;
    /**
     * Log the message with the CONFIG log level.
     * @param {string} message - The message to be logged.
     * @param {string} className - The class name from which the log message is being logged.
     */
    config(message: string, className: string): void;
    /**
     * Log the message with the WARN log level.
     * @param {string} message - The message to be logged.
     * @param {string} className - The class name from which the log message is being logged.
     */
    warn(message: string, className: string): void;
    /**
     * Log the message with the ERROR log level.
     * @param {string} message - The message to be logged.
     * @param {string} className - The class name from which the log message is being logged.
     */
    error(message: string, className: string): void;
    /**
     * Log the message with the FATAL log level.
     * @param {string} message - The message to be logged.
     * @param {string} className - The class name from which the log message is being logged.
     */
    fatal(message: string, className: string): void;
    /**
     * Log the message with the SEVERE log level.
     * @param {string} message - The message to be logged.
     * @param {string} className - The class name from which the log message is being logged.
     */
    severe(message: string, className: string): void;
    /**
     * Log the message with the AUDIT log level.
     * @param {string} message - The message to be logged.
     * @param {string} className - The class name from which the log message is being logged.
     */
    audit(message: string, className: string): void;
    /**
     * Log the message with the STATS log level.
     * @param {string} message - The message to be logged.
     * @param {string} className - The class name from which the log message is being logged.
     */
    stats(message: string, className: string): void;
    /**
     * Get the logger with the specified log level, loggable classes, and log destination.
     * @param {LogLevel} logLevel - The log level to be set for the logger. The log level can be one of the values from the LogLevel enum.
     * @param {string[]} loggableClasses - The classes which are loggable by the logger.
     * @param {LogDestination} logDestination - The destination to which the logs are to be written. The destination can be one of the values from the LogDestination enum which is either console or file.
     * @returns {Logger} - The logger with the specified log level, loggable classes, and log destination.
     */
    static getLogger(logLevel: LogLevel, loggableClasses: string[], logDestination: LogDestination): Logger;
    /**
     * Get the logger with the default log level, loggable classes, and log destination.
     * @returns {Logger} - The logger with the default log level, loggable classes, and log destination.
     */
    static getLoggerWithDefaults(): Logger;
}
