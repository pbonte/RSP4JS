import * as fs from 'fs';

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

/**
 *
 */
export class Logger {
    private log_level: LogLevel;
    private loggable_classes: string[];
    private log_destination: any;

    /**
     *
     * @param logLevel
     * @param loggableClasses
     * @param logDestination
     */
    constructor(logLevel: LogLevel, loggableClasses: string[], logDestination: any) {
        this.log_level = logLevel;
        this.loggable_classes = loggableClasses;
        this.log_destination = logDestination;
        console.log(`Logger initialized with log level ${this.log_level}, loggable classes ${this.loggable_classes}, and log destination ${this.log_destination}`);
        
    }

    /**
     *
     * @param logLevel
     */
    setLogLevel(logLevel: LogLevel) {
        this.log_level = logLevel;
    }

    /**
     *
     * @param loggableClasses
     */
    setLoggableClasses(loggableClasses: string[]) {
        this.loggable_classes = loggableClasses;
    }

    /**
     *
     * @param logDestination
     */
    setLogDestination(logDestination: LogDestination) {
        this.log_destination = logDestination;
    }

    /**
     *
     * @param level
     * @param message
     * @param className
     */
    log(level: LogLevel, message: string, className: string) {
        console.log(`Logging level: ${level}`);
        console.log(`this.log_level: ${this.log_level}`);
        
        if (level >= this.log_level && this.loggable_classes.includes(className)){
            const logPrefix = `[${LogLevel[level]}] [${className}]`;
            const logMessage = `${Date.now()} ${logPrefix} ${message}`;
            console.log(`Logging destination: ${this.log_destination}`);
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
     *
     * @param message
     * @param className
     */
    trace(message: string, className: string) {
        this.log(LogLevel.TRACE, message, className);
    }

    /**
     *
     * @param message
     * @param className
     */
    debug(message: string, className: string) {
        this.log(LogLevel.DEBUG, message, className);
    }

    /**
     *
     * @param message
     * @param className
     */
    info(message: string, className: string) {
        this.log(LogLevel.INFO, message, className);
    }

    /**
     *
     * @param message
     * @param className
     */
    config(message: string, className: string) {
        this.log(LogLevel.CONFIG, message, className);
    }

    /**
     *
     * @param message
     * @param className
     */
    warn(message: string, className: string) {
        this.log(LogLevel.WARN, message, className);
    }

    /**
     *
     * @param message
     * @param className
     */
    error(message: string, className: string) {
        this.log(LogLevel.ERROR, message, className);
    }

    /**
     *
     * @param message
     * @param className
     */
    fatal(message: string, className: string) {
        this.log(LogLevel.FATAL, message, className);
    }

    /**
     *
     * @param message
     * @param className
     */
    severe(message: string, className: string) {
        this.log(LogLevel.SEVERE, message, className);
    }

    /**
     *
     * @param message
     * @param className
     */
    audit(message: string, className: string) {
        this.log(LogLevel.AUDIT, message, className);
    }

    /**
     *
     * @param message
     * @param className
     */
    stats(message: string, className: string) {
        this.log(LogLevel.STATS, message, className);
    }

    /**
     *
     * @param logLevel
     * @param loggableClasses
     * @param logDestination
     */
    static getLogger(logLevel: LogLevel, loggableClasses: string[], logDestination: LogDestination) {
        return new Logger(logLevel, loggableClasses, logDestination);
    }

    /**
     *
     */
    static getLoggerWithDefaults() {
        return new Logger(LogLevel.INFO, [], LogDestination.CONSOLE);
    }
}

