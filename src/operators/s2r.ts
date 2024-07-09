import { EventEmitter } from "events";
// @ts-ignore
import { Quad } from 'n3';
import { Logger, LogLevel, LogDestination } from "../util/Logger";
import * as LOG_CONFIG from "../config/log_config.json";

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

/**
 *
 */
export class WindowInstance {
    open: number;
    close: number;
    has_triggered: boolean;
    /**
     *
     * @param open
     * @param close
     */
    constructor(open: number, close: number) {
        this.open = open;
        this.close = close;
        this.has_triggered = false;
    }

    /**
     *
     */
    getDefinition() {
        return "[" + this.open + "," + this.close + ")" + " Triggered: " + this.has_triggered;
    }
    /**
     *
     */
    hasCode() {
        return 0;
    }

    /**
     *
     * @param other_window
     */
    is_same(other_window: WindowInstance): boolean {
        return this.open == other_window.open && this.close == other_window.close;
    }
}


/**
 *
 */
export class QuadContainer {
    elements: Set<Quad>;
    last_time_stamp_changed: number;
    /**
     *
     * @param elements
     * @param ts
     */
    constructor(elements: Set<Quad>, ts: number) {
        this.elements = elements;
        this.last_time_stamp_changed = ts;
    }

    /**
     *
     */
    len() {
        return this.elements.size;
    }
    /**
     *
     * @param quad
     * @param ts
     */
    add(quad: Quad, ts: number) {
        this.elements.add(quad);
        this.last_time_stamp_changed = ts;
    }

    /**
     *
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
    interval_id: NodeJS.Timeout; // The interval id for the out-of-order processing of the late elements
    name: string; // The name of the window
    private current_watermark: number; // To track the current watermark of the window
    public late_buffer: Map<number, Set<Quad>>; // Buffer for out-of-order late elements
    public max_delay: number; // The maximum delay allowed for a observation to be considered in the window
    public pending_triggers: Set<WindowInstance>; // Tracking windows that have pending triggers
    public time_to_trigger_processing_late_elements: number; // The time to trigger the processing of the late elements
    /**
     *
     * @param {string} name - The name of the CSPARQL Window.
     * @param {number} width - The width of the window.
     * @param {number} slide - The slide of the window.
     * @param {ReportStrategy} report - The report strategy for the window.
     * @param {Tick} tick - The tick of the window.
     * @param {number} start_time - The start time of the window.
     * @param {number} max_delay - The maximum delay allowed for an observation to be considered in the window used for out-of-order processing.
     */
    constructor(name: string, width: number, slide: number, report: ReportStrategy, tick: Tick, start_time: number, max_delay: number, time_to_trigger_processing_late_elements: number) {
        this.name = name;
        this.width = width;
        this.slide = slide;
        this.report = report;
        this.tick = tick;
        this.time_to_trigger_processing_late_elements = time_to_trigger_processing_late_elements;
        const log_level: LogLevel = LogLevel[LOG_CONFIG.log_level as keyof typeof LogLevel];
        this.logger = new Logger(log_level, LOG_CONFIG.classes_to_log, LOG_CONFIG.destination as unknown as LogDestination);
        this.time = start_time;
        this.current_watermark = start_time;
        this.t0 = start_time;
        this.active_windows = new Map<WindowInstance, QuadContainer>();
        this.emitter = new EventEmitter();
        this.max_delay = max_delay;
        this.pending_triggers = new Set<WindowInstance>();
        this.late_buffer = new Map<number, Set<Quad>>();
        this.interval_id = setInterval(() => { this.process_late_elements() }, time_to_trigger_processing_late_elements);
    }
    /**
     * Get the content of the window at the given timestamp if it exists, else return undefined.
     * @param {number} timestamp - The timestamp for which the content of the window is to be retrieved.
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
     * @param {Quad} e - The event to be added to the window.
     * @param {number} timestamp - The timestamp of the event.
     */
    add(e: Quad, timestamp: number) {
        console.debug("Window " + this.name + " Received element (" + e + "," + timestamp + ")");
        this.time = timestamp;
        const t_e = timestamp;
        if (timestamp > this.time) {
            this.time = timestamp;
        }

        if (this.if_event_late(t_e)) {
            console.log("Event is late at time " + t_e);
            this.buffer_late_event(e, t_e);
            return;
        }
        const to_evict = this.process_event(e, t_e);
        this.evict_windows(to_evict);
    }

    /**
     * Check if the event is late or not based on the timestamp of the event and comparing it to the current time of the window.
     * @param {number} timestamp - The timestamp of the event.
     */
    if_event_late(timestamp: number) {
        return this.time > timestamp;
    }

    /**
     * Buffer the late event for out-of-order processing based on the maximum delay allowed for the events.
     * @param {Quad} e - The event to be buffered.
     * @param {number} timestamp - The timestamp of the event.
     */
    buffer_late_event(e: Quad, timestamp: number) {
        if (this.time - timestamp > this.max_delay) {
            this.logger.info(`Late element [" + ${e} + "] with timestamp [" + ${timestamp} + "] is out of the allowed delay [" + ${this.max_delay} + "]`, `CSPARQLWindow`);
            console.error("Late element [" + e + "] with timestamp [" + timestamp + "] is out of the allowed delay [" + this.max_delay + "]");
        }
        else {
            this.logger.info(`Late element [" + ${e} + "] with timestamp [" + ${timestamp} + "] is being buffered for out of order processing`, `CSPARQLWindow`);
            console.warn("Late element [" + e + "] with timestamp [" + timestamp + "] is being buffered for out of order processing");
            if (!this.late_buffer.has(timestamp)) {
                this.late_buffer.set(timestamp, new Set<Quad>());
            }
            this.late_buffer.get(timestamp)?.add(e);
            this.logger.info(`Size of the late buffer from the buffer_late_event method: ${this.late_buffer.size}`, `CSPARQLWindow`);
        }
    }

    /**
     * Evict the windows that are out of the watermark.
     * @param {Set<WindowInstance>} toEvict - The set of windows to be evicted from the window to be processed by the R2R Operator.
     */
    evict_windows(toEvict: Set<WindowInstance>) {
        for (const w of toEvict) {
            console.debug("Evicting [" + w.open + "," + w.close + ")");
            this.active_windows.delete(w);
        }
    }

    /**
     * Add the window instance to the pending triggers to be emitted.
     * @param {number} t_e - The timestamp of the event to be processed.
     */
    add_window_instance_to_pending_triggers(t_e: number) {
        const window_instance = this.get_window_instance(t_e);
        if (this.hasWindowInstance(this.pending_triggers, window_instance)) {
            return;
        }
        else {
            this.pending_triggers.add(window_instance);
            console.log(`Size of the pending triggers: ${this.pending_triggers.size}`);

        }
    }

    /**
     * Process the event and update the watermark 
     * @param {Quad} e - The event to be processed of the form {subject, predicate, object, graph}.
     * @param {number} t_e - The timestamp of the event.
     */
    process_event(e: Quad, t_e: number) {
        const toEvict = new Set<WindowInstance>();
        this.scope(t_e);
        for (const w of this.active_windows.keys()) {
            if (w.open <= t_e && t_e < w.close) {
                const temp_window = this.active_windows.get(w);
                if (temp_window) {
                    temp_window.add(e, t_e);
                }
            } else if (t_e >= w.close) {
                toEvict.add(w);
            }
        }
        this.logger.info(`Event [" + ${e} + "] with timestamp [" + ${t_e} + "] is being processed`, `CSPARQLWindow`);
        this.update_watermark(t_e);
        this.add_window_instance_to_pending_triggers(t_e);
        return toEvict;
    }

    /**
     * Get the window instance for the given timestamp.
     * @param {number} t_e - The timestamp for which the window instance is to be retrieved.
     */
    get_window_instance(t_e: number) {
        const c_sup = Math.ceil((Math.abs(t_e - this.t0) / this.slide)) * this.slide;
        const o_i = c_sup - this.width;
        return new WindowInstance(o_i, o_i + this.width)
    }

    /**
     * Updating the watermark. 
     * @param {number} new_time - The new watermark to be set.
     */
    update_watermark(new_time: number) {
        if (new_time > this.current_watermark) {
            this.current_watermark = new_time;
            this.logger.info(`Watermark is increasing ${this.current_watermark} and time ${this.time}`, `CSPARQLWindow`);
            this.evict_and_trigger_on_watermark();
        }
        else {
            console.error("Watermark is not increasing");
            this.logger.info(`Watermark is not increasing ${this.current_watermark} and time ${this.time}`, `CSPARQLWindow`);
        }
    }

    /** 
     *  Evict the windows that are out of the watermark and trigger the windows that are within the watermark.
     */
    evict_and_trigger_on_watermark() {

        // Evict windows that are out of the watermark and should be evicted.
        const to_evict = new Set<WindowInstance>();
        // Checking all of the currently active windows.
        this.active_windows.forEach((value: QuadContainer, window: WindowInstance) => {
            // If the window is out of the watermark, add it to the eviction list, i.e if it is less than or 
            //  equal to the current watermark minus the maximum delay.
            if (window.close <= this.current_watermark - this.max_delay) {
                // Add the window to the eviction list.
                to_evict.add(window);
            }
        });
        this.logger.info(`Current watermark: ${this.current_watermark} to emit triggers for the window`, `CSPARQLWindow`);
        // Emit triggers for the windows that are within the watermark, if any. 
        this.emit_on_trigger(this.current_watermark);

        // Evict the windows that are out of the watermark.
        for (const window of to_evict) {
            this.active_windows.delete(window);
            console.debug(`Watermark evicting window ${window.getDefinition()}`)
        }
    }

    /**
     *
     * @param t_e
     */
    emit_on_trigger(t_e: number) {
        this.pending_triggers.forEach((window: WindowInstance) => {
            const content = this.get_quads_from_active_windows(this.active_windows, window);
            if (content) {
                let should_emit = false;
                if (this.report == ReportStrategy.OnWindowClose) {
                    if (window.close <= t_e) {
                        should_emit = true;
                    }
                }
                else if (this.report == ReportStrategy.OnContentChange) {
                    should_emit = true;
                }
                else {
                    should_emit = false;
                }

                if (should_emit) {
                    this.time = t_e;
                    if (!window.has_triggered || this.report == ReportStrategy.OnContentChange) {
                        if (window.has_triggered) {
                            this.logger.info(`Window ${window.getDefinition()} is already triggered so not triggering it again.`, `CSPARQLWindow`);
                        }
                        else {
                            window.has_triggered = true;
                            this.logger.info(`Window ${window.getDefinition()} triggers with Content: " + ${content}`, `CSPARQLWindow`);
                            this.emitter.emit('RStream', content);
                        }
                    }
                    this.pending_triggers.delete(window);
                }
                else {
                    console.error("Window [" + window.open + "," + window.close + ") should not trigger");
                }
            }
        })
    }

    /**
     *
     */
    stop() {
        clearInterval(this.interval_id);
    }

    /**
     *
     */
    get_current_watermark() {
        return this.current_watermark;
    }

    /**
     *
     * @param w
     * @param content
     * @param timestamp
     */
    compute_report(w: WindowInstance, content: QuadContainer, timestamp: number) {
        if (this.report == ReportStrategy.OnWindowClose) {
            return w.close < timestamp;
        } else if (this.report == ReportStrategy.OnContentChange) {
            return true;
        }
        return false;

    }

    /**
     *
     * @param t_e
     */
    scope(t_e: number) {
        const c_sup = Math.ceil((Math.abs(t_e - this.t0) / this.slide)) * this.slide;
        let o_i = c_sup - this.width;
        do {
            computeWindowIfAbsent(this.active_windows, new WindowInstance(o_i, o_i + this.width), () => new QuadContainer(new Set<Quad>(), 0));
            o_i += this.slide;
        } while (o_i <= t_e);
    }


    /**
     *
     * @param output
     * @param call_back
     */
    subscribe(output: 'RStream' | 'IStream' | 'DStream', call_back: (data: QuadContainer) => void) {
        this.emitter.on(output, call_back);
    }

    /**
     * Process the late elements that are out of order.
     * The function is currently called periodically based on the slide of the window.
     */
    process_late_elements() {
        if (this.late_buffer.size == 0) {
            return;
        } else {
            this.logger.info(`Processing late elements for the window with the late_buffer size ${this.late_buffer.size}`, `CSPARQLWindow`)
            this.late_buffer.forEach((elements: Set<Quad>, timestamp: number) => {
                elements.forEach((element: Quad) => {
                    const to_evict = new Set<WindowInstance>();
                    this.process_event(element, timestamp);
                    for (const w of to_evict) {
                        console.debug("Evicting Late [" + w.open + "," + w.close + ")");
                        this.active_windows.delete(w);
                    }
                });
            });
            this.late_buffer.clear();
        }
    }

    /**
     * Set the current time to the given value.
     * @param {number} t - The time to be set.
     */
    set_current_time(t: number) {
        this.time = t;
    }

    /**
     * Set the watermark to the given value.
     * @param {number} t - The watermark to be set.
     */
    set_current_watermark(t: number) {
        this.current_watermark = t;
    }

    /**
     *  Get the quads from the active windows based on the given window instance. The function is used to get the content of the window based on the window instance.
     * @param {Map<WindowInstance, QuadContainer>} map - The map of the active windows.
     * @param {WindowInstance} target - The window instance for which the content is to be retrieved.
     */
    get_quads_from_active_windows(map: Map<WindowInstance, QuadContainer>, target: WindowInstance) {
        for (const [key, value] of map.entries()) {
            if (key.open === target.open && key.close === target.close && key.has_triggered === target.has_triggered) {
                return value;
            }
        }
        return undefined;
    }

    /**
     *
     * @param set
     * @param window
     */
    hasWindowInstance(set: Set<WindowInstance>, window: WindowInstance) {
        for (const elem of set) {
            if (elem.open === window.open && elem.close === window.close) {
                return true;
            }
        }
        return false;
    }

    /**
     * Get a string representation of the CSPARQLWindow definition.
     */
    getCSPARQLWindowDefinition() {
        let windowDefinitions = [];
        for (const [window, quadContainer] of this.active_windows.entries()) {
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
/**
 *
 * @param map
 * @param key
 * @param mappingFunction
 */
function computeWindowIfAbsent(map: Map<WindowInstance, QuadContainer>, key: WindowInstance, mappingFunction: (key: WindowInstance) => QuadContainer) {
    let val = map.get(key);
    let found = false;

    for (const w of map.keys()) {
        if (w.is_same(key)) {
            found = true;
            val = map.get(w);
            break;
        }
    }
    if (!found) {
        val = mappingFunction(key);
        map.set(key, val);
    }
    return val;
}