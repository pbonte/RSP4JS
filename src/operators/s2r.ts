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
 *
 */
export class CSPARQLWindow {
    width: number;
    slide: number;
    time: number;
    t0: number;
    active_windows: Map<WindowInstance, QuadContainer>;
    report: ReportStrategy;
    logger: Logger; // Logger for the CSPARQL Window
    tick: Tick;
    emitter: EventEmitter;
    interval_id: NodeJS.Timeout;
    name: string;
    private current_watermark: number; // To track the current watermark of the window
    public late_buffer: Map<number, Set<Quad>>; // Buffer for out-of-order late elements
    public max_delay: number; // The maximum delay allowed for a observation to be considered in the window
    public pending_triggers: Set<WindowInstance>; // Tracking windows that have pending triggers
    /**
     *
     * @param name
     * @param width
     * @param slide
     * @param report
     * @param tick
     * @param start_time
     * @param max_delay
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
        this.late_buffer = new Map<number, Set<Quad>>();
        this.interval_id = setInterval(() => { this.process_late_elements() }, this.slide);
    }
    /**
     *
     * @param timestamp
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
     *
     * @param e
     * @param timestamp
     */
    add(e: Quad, timestamp: number) {
        console.debug("Window " + this.name + " Received element (" + e + "," + timestamp + ")");
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
     *
     * @param timestamp
     */
    if_event_late(timestamp: number) {
        return this.time > timestamp;
    }

    /**
     * 
     * @param e
     * @param timestamp
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
            this.evict_and_trigger_on_watermark();
        }
    }

    /**
     * 
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

                if (should_emit) {
                    this.time = t_e;
                    if (!window.has_triggered || this.report == ReportStrategy.OnContentChange) {
                        window.has_triggered = true;
                        console.log("Window [" + window.open + "," + window.close + ") triggers. Content: " + content);
                        this.emitter.emit('RStream', content);
                    }
                    this.pending_triggers.delete(window);
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
     * 
     * @param map
     * @param target
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