import { EventEmitter } from "events";
// @ts-ignore
import { Quad } from 'n3';
import { Logger } from "../util/Logger";
import { LogLevel, LogDestination } from "../util/LoggerEnum";
import * as LOG_CONFIG from "../config/log_config.json";

/* eslint-disable no-unused-vars */
export enum ReportStrategy {
    NonEmptyContent,
    OnContentChange,
    OnWindowClose,
    Periodic
}
export enum Tick {
    TimeDriven,
    TupleDriven,
    BatchDriven,
}
/* eslint-enable no-unused-vars */
/**
 * WindowInstance class to represent the window instance of the CSPARQL Window.
 */
export class WindowInstance {
    open: number;
    close: number;
    has_triggered: boolean;
    /**
     * Constructor for the WindowInstance class.
     * @param {number} open - The open time of the window instance of the form {open, close, has_triggered}.
     * @param {number} close - The close time of the window instance of the form {open, close, has_triggered}.
     */
    constructor(open: number, close: number) {
        this.open = open;
        this.close = close;
        this.has_triggered = false;
    }

    /**
     * Get the definition of the window instance.
     * @returns {string} - The definition of the window instance in the form [open, close) Triggered: has_triggered.
     */
    getDefinition() {
        return "[" + this.open + "," + this.close + ")" + " Triggered: " + this.has_triggered;
    }
    /**
     * Get the code of the window instance.
     * @returns {number} - The code of the window instance.
     */
    hasCode() {
        return 0;
    }

    /**
     * Check if the window instance is the same as the other window instance.
     * @param {WindowInstance} other_window - The other window instance to be compared.
     * @returns {boolean} - True if the window instances are the same, else false.
     */
    is_same(other_window: WindowInstance): boolean {
        return this.open == other_window.open && this.close == other_window.close;
    }

    set_triggered() {
        this.has_triggered = true;
    }
}


/**
 * QuadContainer class to represent the container for the quads in the CSPARQL Window.
 */
export class QuadContainer {
    elements: Set<Quad>;
    last_time_stamp_changed: number;
    /** 
     * Constructor for the QuadContainer class.
     * @param {Set<Quad>} elements - The set of quads in the container.
     * @param {number} ts - The timestamp of the last change in the container.
     */
    constructor(elements: Set<Quad>, ts: number) {
        this.elements = elements;
        this.last_time_stamp_changed = ts;
    }

    /**
     * Get the length of the container of the quads.
     * @returns {number} - The length of the container.
     */
    len() {
        return this.elements.size;
    }
    /**
     * Add the quad to the container of the quads.
     * @param {Quad} quad - The quad to be added to the container.
     * @param {number} quad_timestamp - The timestamp of the quad.
     * @returns {void} - The function returns nothing.
     */
    add(quad: Quad, quad_timestamp: number) {
        this.elements.add(quad);
        this.last_time_stamp_changed = quad_timestamp;
    }

    /**
     * Get the last time the container was changed.
     * @returns {number} - The last time the container was changed.
     */
    last_time_changed() {
        return this.last_time_stamp_changed;
    }

}

/**
 * CSPARQL Window class that implements the windowing mechanism for the RSP Engine.
 * The class is responsible for managing the windows, processing the events, and emitting the triggers based on the report strategy.
 * The class also handles the out-of-order processing of the events based on the maximum delay allowed for the events and the watermark.
 */
export class CSPARQLWindow {
    width: number; // The width of the window
    slide: number; // The slide of the window
    time: number; // The current time of the window
    t0: number; // The start time of the window
    active_windows: Map<WindowInstance, QuadContainer>; // The active windows in the window and the content of the window
    report: ReportStrategy; // The report strategy for the window
    logger: Logger; // Logger for the CSPARQL Window
    tick: Tick;   // The tick of the window
    emitter: EventEmitter; // The event emitter for the window
    name: string; // The name of the window
    private current_watermark: number; // To track the current watermark of the window
    public max_delay: number; // The maximum delay allowed for a observation to be considered in the window
    public pending_triggers: Set<WindowInstance>; // Tracking windows that have pending triggers
    /**
     * Constructor for the CSPARQLWindow class.
     * @param {string} name - The name of the CSPARQL Window.
     * @param {number} width - The width of the window.
     * @param {number} slide - The slide of the window.
     * @param {ReportStrategy} report - The report strategy for the window.
     * @param {Tick} tick - The tick of the window.
     * @param {number} start_time - The start time of the window.
     * @param {number} max_delay - The maximum delay allowed for an observation to be considered in the window used for out-of-order processing.
     */
    constructor(name: string, width: number, slide: number, report: ReportStrategy, tick: Tick, start_time: number, max_delay: number) {
        this.name = name;
        this.width = width;
        this.slide = slide;
        this.report = report;
        this.tick = tick;
        const log_level: LogLevel = LogLevel[LOG_CONFIG.log_level as keyof typeof LogLevel];
        this.logger = new Logger(log_level, LOG_CONFIG.classes_to_log, LOG_CONFIG.destination as unknown as LogDestination);
        this.time = start_time;
        this.current_watermark = start_time;
        this.t0 = start_time;
        this.active_windows = new Map<WindowInstance, QuadContainer>();
        this.emitter = new EventEmitter();
        this.max_delay = max_delay;
        this.pending_triggers = new Set<WindowInstance>();
    }

    /**
     * Get the content of the window at the given timestamp if it exists, else return undefined.
     * @param {number} timestamp - The timestamp for which the content of the window is to be retrieved.
     * @returns {QuadContainer | undefined} - The content of the window if it exists, else undefined.
     */
    getContent(timestamp: number): QuadContainer | undefined {
        let max_window = null;
        let max_time = Number.MAX_SAFE_INTEGER;
        this.active_windows.forEach((value: QuadContainer, window: WindowInstance) => {
            if (window.open <= timestamp && timestamp <= window.close) {
                if (window.close < max_time) {
                    max_time = window.close;
                    max_window = window;
                }
            }
        });
        if (max_window) {
            return this.active_windows.get(max_window);
        } else {
            return undefined;
        }
    }

    /**
     * Add the event to the window at the given timestamp and checks if the event is late or not.
     * @param {Quad} event - The event to be added to the window.
     * @param {number} timestamp - The timestamp of the event.
     * @returns {void} - The function does not return anything.
     */

    add(event: Quad, timestamp: number): void {
        this.logger.info(`adding_event_to_the_window`, `CSPARQLWindow`);
        console.debug(`Adding [" + ${event} + "] at time : ${timestamp} and watermark ${this.current_watermark}`);
        let t_e = timestamp;
        let to_evict = new Set<WindowInstance>();
        if (this.time > timestamp) {
            this.logger.info(`out_of_order_event_received`, `CSPARQLWindow`);
            let event_latency = this.time - timestamp;
            this.logger.info(`Event Latency : ${event_latency}`, `CSPARQLWindow`);
            // Out of order event handling
            console.error(`The event is late and has arrived out of order at time ${timestamp}`);
            if (t_e - this.time > this.max_delay) {
                this.logger.info(`out_of_order_event_out_of_delay`, `CSPARQLWindow`);
                // Discard the event if it is too late to be considered in the window based on a simple static heuristic pre-decided
                // when the CSPARQL Window was initialized.
                console.error("Late element [" + event + "] with timestamp [" + timestamp + "] is out of the allowed delay [" + this.max_delay + "]");
            }
            else if (t_e - this.time <= this.max_delay) {
                this.logger.info(`out_of_order_event_within_delay`, `CSPARQLWindow`);
                // The event is late but within the allowed delay, so we will add it to the specific window instance.
                for (let w of this.active_windows.keys()) {
                    if (w.open <= t_e && t_e < w.close) {
                        let temp_window = this.active_windows.get(w);
                        if (temp_window) {
                            // TODO: log this for when the event is added to the window and for the latency calculation
                            this.logger.info(`adding_out_of_order_event ${event.subject.value} to the window ${this.name} with bounds ${w.getDefinition()} at time ${timestamp}`, `CSPARQLWindow`);
                            temp_window.add(event, t_e);
                        }
                    }
                    else if (t_e >= w.close) {
                        to_evict.add(w);
                    }
                }
            }
            this.time = timestamp;
        } else if (timestamp >= this.time) {
            this.time = timestamp
            this.logger.info(`in_order_event_received`, `CSPARQLWindow`);
            // In order event handling
            this.scope(t_e);
            for (let w of this.active_windows.keys()) {
                console.debug(`Processing Window ${w.getDefinition()} for the event ${event} at time ${timestamp}`);
                if (w.open <= t_e && t_e < w.close) {
                    console.debug(`Adding the event ${event} to the window ${w.getDefinition()} at time ${timestamp}`);
                    let window_to_add = this.active_windows.get(w);
                    if (window_to_add) {
                        this.logger.info(`adding_in_order_event ${event.subject.value} to the window ${this.name} with bounds ${w.getDefinition()} at time ${timestamp}`, `CSPARQLWindow`);
                        window_to_add.add(event, t_e);
                    }
                }
                else if (t_e >= w.close + this.max_delay && !w.has_triggered) {
                    console.debug(`Scheduled to evict the window ${w.getDefinition()} at time ${timestamp}`);
                    to_evict.add(w);
                }
            }
            this.update_watermark(t_e);
            this.trigger_window_content(this.current_watermark, timestamp);
        }
    }

    if_event_late(timestamp: number) {
        return this.time > timestamp;
    }

    /**
     * Trigger the window content based on the current watermark.
     * @param {number} watermark - The current watermark which needs to be processed.
     * @returns {void} - The function does not return anything.
     */

    trigger_window_content(watermark: number, timestamp: number): void {
        let max_window: WindowInstance | null = null;
        let max_time = 0;

        // Identify the window to trigger
        this.active_windows.forEach((value: QuadContainer, window: WindowInstance) => {
            if (this.compute_report(window, value, watermark)) {
                if (window.close > max_time) {
                    max_time = window.close;
                    max_window = window;
                }
            }
        });

        if (max_window) {
            if (this.tick == Tick.TimeDriven && watermark >= max_time) {
                setTimeout(() => {
                    if (max_window) {
                        if (watermark >= max_time + this.max_delay) {
                            this.logger.info(`Watermark ${watermark} `, `CSPARQLWindow`);
                            if (max_window) { }
                            const windowToDelete = this.findWindowInstance(max_window);
                            if (windowToDelete) {
                                this.emitter.emit('RStream', this.active_windows.get(windowToDelete));
                                this.logger.info(`Window with bounds [${windowToDelete.open},${windowToDelete.close}) ${windowToDelete.getDefinition()} is triggered for the window name ${this.name}`, `CSPARQLWindow`);
                                this.active_windows.delete(windowToDelete);
                            }
                            this.time = timestamp;
                        } else {
                            this.logger.info(`Window will not trigger.`, `CSPARQLWindow`);
                        }
                    }
                }, this.max_delay);
            } else {
                this.logger.info(`Window ${max_window} is out of the watermark and will not trigger.`, `CSPARQLWindow`);
                console.error(`Window is out of the watermark and will not trigger`);
            }
        }
    }

    // Helper to find the matching instance in the Map
    private findWindowInstance(target: WindowInstance): WindowInstance | undefined {
        for (const window of this.active_windows.keys()) {
            if (window.is_same(target)) {
                return window;
            }
        }
        return undefined;
    }

    /**
     * Updating the watermark. 
     * @param {number} new_time - The new watermark to be set.
     * @returns {void} - The function does not return anything.
     */
    update_watermark(new_time: number): void {
        if (new_time > this.current_watermark) {
            this.current_watermark = new_time;
            this.logger.info(`Watermark is increasing ${this.current_watermark} and time ${this.time}`, `CSPARQLWindow`);
        }
        else {
            console.error("Watermark is not increasing");
        }
    }

    /**
     * Get the current time of the window.
     * @returns {number} - The current time of the window.
     */
    get_current_watermark() {
        return this.current_watermark;
    }

    /**
     * Compute the report based on the window instance and the content of the window.
     * Max Delay is added to trigger the report computation only after waiting for a certain time.
     * @param {WindowInstance} w - The window instance for which the report is to be computed.
     * @param {QuadContainer} content - The content of the window (which is a QuadContainer).
     * @param {number} timestamp - The timestamp of the event to be processed.
     * @returns {boolean} - True if the report is to be computed, else false.
     */
    compute_report(w: WindowInstance, content: QuadContainer, timestamp: number): boolean {
        if (this.report == ReportStrategy.OnWindowClose) {
            return w.close < timestamp;
        } else if (this.report == ReportStrategy.OnContentChange) {
            return true;
        }
        return false;

    }

    /**
     * Scope the window based on the given timestamp.
     * @param {number} t_e - The timestamp of the event to be processed.
     * @returns {void} - The function does not return anything.
     */
    scope(t_e: number) {
        const c_sup = Math.ceil((Math.abs(t_e - this.t0) / this.slide)) * this.slide;
        let o_i = c_sup - this.width;
        console.log(`Scope the window for the event at time ${t_e}`);
        console.log(`${c_sup} - ${this.width} = ${o_i}`);
        while (o_i <= t_e) {
            computeWindowIfAbsent(this.active_windows, new WindowInstance(o_i, o_i + this.width), () => new QuadContainer(new Set<Quad>(), 0));
            o_i += this.slide;
        }
    }


    /* eslint-disable no-unused-vars */
    /** 
     * Subscribe to the window based on the output stream and the callback function.
     * @param {'RStream' | 'IStream' | 'DStream'} output - The output stream to which the window is to be subscribed. The output stream can be one of {'RStream', 'IStream', 'DStream'}.
     * @param {(QuadContainer) => void} call_back - The callback function to be called when the window emits the triggers.
     * @returns {void} - The function does not return anything.
     */
    subscribe(output: 'RStream' | 'IStream' | 'DStream', call_back: (data: QuadContainer) => void) {
        this.emitter.on(output, call_back);
    }
    /* eslint-enable no-unused-vars */

    /**
     * Set the current time to the given value.
     * @param {number} t - The time to be set.
     * @returns {void} - The function does not return anything.
     */
    set_current_time(t: number) {
        this.time = t;
    }

    set_max_delay(delay: number) {
        this.max_delay = delay;
    }

    /**
     * Set the watermark to the given value.
     * @param {number} t - The watermark to be set.
     * @returns {void} - The function does not return anything.
     */
    set_current_watermark(t: number) {
        this.current_watermark = t;
    }

    /**
     * Get a string representation of the CSPARQLWindow definition.
     * The function is used to get the definition of the CSPARQLWindow in a string format.
     * @returns {string} - The string representation of the CSPARQLWindow definition.
     */
    getCSPARQLWindowDefinition() {
        const windowDefinitions = [];
        for (const [window] of this.active_windows.entries()) {
            windowDefinitions.push(window.getDefinition());
        }
        return `CSPARQLWindow {
        name: ${this.name},
        width: ${this.width},
        slide: ${this.slide},
        current_time: ${this.time},
        current_watermark: ${this.current_watermark},
        report_strategy: ${ReportStrategy[this.report]},
        tick: ${Tick[this.tick]},
        active_windows: [${windowDefinitions.join(", ")}]
    }`;
    }

}
/* eslint-disable no-unused-vars */
/**
 * Compute the window if absent based on the given window instance and the mapping function.
 * @param {Map<WindowInstance, QuadContainer>} map - The map of the active windows.
 * @param {WindowInstance} window - The window instance of the form {open, close, has_triggered}.
 * @param {mappingFunction} mappingFunction - The mapping function to be applied to the window instance.
 */
export function computeWindowIfAbsent(map: Map<WindowInstance, QuadContainer>, window: WindowInstance,
    mappingFunction: (key: WindowInstance) => QuadContainer) {
    let found = false;

    for (const w of map.keys()) {
        if (w.is_same(window)) {
            found = true;
            break;
        }
    }
    if (!found) {
        map.set(window, mappingFunction(window));
    }

    return found;
}
/* eslint-enable no-unused-vars */