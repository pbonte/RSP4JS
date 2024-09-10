import * as fs from 'fs';
import * as path from 'path';
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
    private log_file_path?: string; // Optional log file path
    private classInstanceMap: Map<any, string>; // Map to store the class instances and their names with instance IDs.

    /**
     * Constructor for the Logger class.
     * @param {LogLevel} logLevel - The log level to be set for the logger. The log level can be one of the values from the LogLevel enum.
     * @param {string[]} loggableClasses - The classes which are loggable by the logger.
     * @param {any} logDestination - The destination to which the logs are to be written. The destination can be one of the values from the LogDestination enum which is either console or file.
     */
    constructor(logLevel: LogLevel, loggableClasses: string[], logDestination: any) {
        this.log_level = logLevel;
        this.loggable_classes = loggableClasses;
        this.classInstanceMap = new Map<any, string>();
        this.log_destination = logDestination;
        this.log_file_path = this.generateLogFilePath();
        console.log(`Logger initialized with log level ${this.log_level}, loggable classes ${this.loggable_classes}, and log destination ${this.log_destination}`);

    }

    private getInstanceID(object: any): string {
        if (!this.classInstanceMap.has(object)) {
            const instanceID = `Instance-${this.classInstanceMap.size + 1}`;
            console.log(`New instance created: ${instanceID}`);
            this.classInstanceMap.set(object, instanceID);
        }
        else {
            console.log(`Instance already exists: ${this.classInstanceMap.get(object)}`);
        }
        return this.classInstanceMap.get(object)!;
    }

    /**
     * Set the log level for the logger.
     * @param {LogLevel} logLevel - The log level to be set for the logger. The log level can be one of the values from the LogLevel enum.
     */
    setLogLevel(logLevel: LogLevel) {
        this.log_level = logLevel;
    }

    setLogFilePath(logFilePath: string) {
        this.log_file_path = logFilePath;
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
    log(level: LogLevel, message: string, className: string, instance_object: any) {
        if (level >= this.log_level && this.loggable_classes.includes(className)) {
            const instanceID = this.getInstanceID(instance_object);
            const logPrefix = `[${LogLevel[level]}] [${className}] [${instanceID}]`;
            const logMessage = `${Date.now()} ${logPrefix} ${message}`;
            switch (this.log_destination) {
                case 'CONSOLE':
                    console.log(logMessage);
                    break;
                case 'FILE':
                    if (!this.log_file_path) {
                        console.error('Log file path is not set');
                        return;
                    }

                    const logDir = path.dirname(this.log_file_path);
                    if (!fs.existsSync(logDir)) {
                        fs.mkdirSync(logDir, { recursive: true });
                    }

                    try {
                        fs.appendFileSync(this.log_file_path, `${logMessage}\n`);
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
    trace(message: string, className: string, instance_object: any) {
        this.log(LogLevel.TRACE, message, className, instance_object);
    }

    /** 
     * Log the message with the DEBUG log level.
     * @param {string} message - The message to be logged.
     * @param {string} className - The class name from which the log message is being logged.
     */
    debug(message: string, className: string, instance_object: any) {
        this.log(LogLevel.DEBUG, message, className, instance_object);
    }

    /** 
     * Log the message with the INFO log level.
     * @param {string} message - The message to be logged.
     * @param {string} className - The class name from which the log message is being logged.
     */
    info(message: string, className: string, instance_object: any) {
        this.log(LogLevel.INFO, message, className, instance_object);
    }

    /** 
     * Log the message with the CONFIG log level.
     * @param {string} message - The message to be logged.
     * @param {string} className - The class name from which the log message is being logged.
     */
    config(message: string, className: string, instance_object: any) {
        this.log(LogLevel.CONFIG, message, className, instance_object);
    }

    /** 
     * Log the message with the WARN log level.
     * @param {string} message - The message to be logged.
     * @param {string} className - The class name from which the log message is being logged.
     */
    warn(message: string, className: string, instance_object: any) {
        this.log(LogLevel.WARN, message, className, instance_object);
    }

    /** 
     * Log the message with the ERROR log level.
     * @param {string} message - The message to be logged.
     * @param {string} className - The class name from which the log message is being logged.
     */
    error(message: string, className: string, instance_object: any) {
        this.log(LogLevel.ERROR, message, className, instance_object);
    }

    /** 
     * Log the message with the FATAL log level.
     * @param {string} message - The message to be logged.
     * @param {string} className - The class name from which the log message is being logged.
     */
    fatal(message: string, className: string, instance_object: any) {
        this.log(LogLevel.FATAL, message, className, instance_object);
    }

    /** 
     * Log the message with the SEVERE log level.
     * @param {string} message - The message to be logged.
     * @param {string} className - The class name from which the log message is being logged.
     */
    severe(message: string, className: string, instance_object: any) {
        this.log(LogLevel.SEVERE, message, className, instance_object);
    }

    /** 
     * Log the message with the AUDIT log level.
     * @param {string} message - The message to be logged.
     * @param {string} className - The class name from which the log message is being logged.
     */
    audit(message: string, className: string, instance_object: any) {
        this.log(LogLevel.AUDIT, message, className, instance_object);
    }

    /** 
     * Log the message with the STATS log level.
     * @param {string} message - The message to be logged.
     * @param {string} className - The class name from which the log message is being logged.
     */
    stats(message: string, className: string, instance_object: any) {
        this.log(LogLevel.STATS, message, className, instance_object);
    }

    /**
     * Get the logger with the specified log level, loggable classes, and log destination.
     * @param {LogLevel} logLevel - The log level to be set for the logger. The log level can be one of the values from the LogLevel enum.
     * @param {string[]} loggableClasses - The classes which are loggable by the logger.
     * @param {LogDestination} logDestination - The destination to which the logs are to be written. The destination can be one of the values from the LogDestination enum which is either console or file.
     * @returns {Logger} - The logger with the specified log level, loggable classes, and log destination.
     */
    static getLogger(logLevel: LogLevel, loggableClasses: string[], logDestination: LogDestination, className: string) {
        return new Logger(logLevel, loggableClasses, logDestination);
    }

    /**
     * Get the logger with the default log level, loggable classes, and log destination.
     * @returns {Logger} - The logger with the default log level, loggable classes, and log destination.
     */
    static getLoggerWithDefaults(className: string) {
        return new Logger(LogLevel.INFO, [], LogDestination.CONSOLE);
    }

    private generateLogFilePath(): string {
        const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\./g, '-');
        const defaultLogDir = path.join(__dirname, 'logs');
        const logFileName = `log-${timestamp}.log`;
        const logFilePath = path.join(defaultLogDir, logFileName);
        return logFilePath;
    }
}

