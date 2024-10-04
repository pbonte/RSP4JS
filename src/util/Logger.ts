import * as fs from 'fs';
import { LogLevel, LogDestination } from './LoggerEnum';

export class Logger {
    private log_level: LogLevel;
    private loggable_classes: string[];
    private log_destination: any;

    constructor(logLevel: LogLevel, loggableClasses: string[], logDestination: any) {
        this.log_level = logLevel;
        this.loggable_classes = loggableClasses;
        this.log_destination = logDestination;
        console.log(`Logger initialized with log level ${this.log_level}, loggable classes ${this.loggable_classes}, and log destination ${this.log_destination}`);

    }

    setLogLevel(logLevel: LogLevel) {
        this.log_level = logLevel;
    }

    setLoggableClasses(loggableClasses: string[]) {
        this.loggable_classes = loggableClasses;
    }

    setLogDestination(logDestination: LogDestination) {
        this.log_destination = logDestination;
    }

    log(level: LogLevel, message: string, className: string) {
        if (level >= this.log_level && this.loggable_classes.includes(className)) {
            const logPrefix = `[${LogLevel[level]}] [${className}]`;
            const logMessage = `${Date.now()},${logPrefix},${message}`;
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

    trace(message: string, className: string) {
        this.log(LogLevel.TRACE, message, className);
    }

    debug(message: string, className: string) {
        this.log(LogLevel.DEBUG, message, className);
    }

    info(message: string, className: string) {
        this.log(LogLevel.INFO, message, className);
    }

    config(message: string, className: string) {
        this.log(LogLevel.CONFIG, message, className);
    }

    warn(message: string, className: string) {
        this.log(LogLevel.WARN, message, className);
    }

    error(message: string, className: string) {
        this.log(LogLevel.ERROR, message, className);
    }

    fatal(message: string, className: string) {
        this.log(LogLevel.FATAL, message, className);
    }

    severe(message: string, className: string) {
        this.log(LogLevel.SEVERE, message, className);
    }

    audit(message: string, className: string) {
        this.log(LogLevel.AUDIT, message, className);
    }

    stats(message: string, className: string) {
        this.log(LogLevel.STATS, message, className);
    }

    static getLogger(logLevel: LogLevel, loggableClasses: string[], logDestination: LogDestination) {
        return new Logger(logLevel, loggableClasses, logDestination);
    }

    static getLoggerWithDefaults() {
        return new Logger(LogLevel.INFO, [], LogDestination.CONSOLE);
    }
}
