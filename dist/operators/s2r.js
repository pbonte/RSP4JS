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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.gammaOperator = exports.CSPARQLWindow = exports.QuadContainer = exports.WindowInstance = exports.Tick = exports.ReportStrategy = void 0;
const events_1 = require("events");
const fs_1 = __importDefault(require("fs"));
const Logger_1 = require("../util/Logger");
const LOG_CONFIG = __importStar(require("../config/log_config.json"));
const ss = require('simple-statistics');
/* eslint-disable no-unused-vars */
var ReportStrategy;
(function (ReportStrategy) {
    ReportStrategy[ReportStrategy["NonEmptyContent"] = 0] = "NonEmptyContent";
    ReportStrategy[ReportStrategy["OnContentChange"] = 1] = "OnContentChange";
    ReportStrategy[ReportStrategy["OnWindowClose"] = 2] = "OnWindowClose";
    ReportStrategy[ReportStrategy["Periodic"] = 3] = "Periodic";
})(ReportStrategy = exports.ReportStrategy || (exports.ReportStrategy = {}));
var Tick;
(function (Tick) {
    Tick[Tick["TimeDriven"] = 0] = "TimeDriven";
    Tick[Tick["TupleDriven"] = 1] = "TupleDriven";
    Tick[Tick["BatchDriven"] = 2] = "BatchDriven";
})(Tick = exports.Tick || (exports.Tick = {}));
/* eslint-enable no-unused-vars */
/**
 * WindowInstance class to represent the window instance of the CSPARQL Window.
 */
class WindowInstance {
    /**
     * Constructor for the WindowInstance class.
     * @param {number} open - The open time of the window instance of the form {open, close, has_triggered}.
     * @param {number} close - The close time of the window instance of the form {open, close, has_triggered}.
     */
    constructor(open, close) {
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
    is_same(other_window) {
        return this.open == other_window.open && this.close == other_window.close;
    }
    set_triggered() {
        this.has_triggered = true;
    }
}
exports.WindowInstance = WindowInstance;
/**
 * QuadContainer class to represent the container for the quads in the CSPARQL Window.
 */
class QuadContainer {
    /**
     * Constructor for the QuadContainer class.
     * @param {Set<Quad>} elements - The set of quads in the container.
     * @param {number} ts - The timestamp of the last change in the container.
     */
    constructor(elements, ts) {
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
     * @param {number} ts - The timestamp of the quad.
     * @returns {void} - The function returns nothing.
     */
    add(quad, ts) {
        this.elements.add(quad);
        this.last_time_stamp_changed = ts;
    }
    /**
     * Get the last time the container was changed.
     * @returns {number} - The last time the container was changed.
     */
    last_time_changed() {
        return this.last_time_stamp_changed;
    }
}
exports.QuadContainer = QuadContainer;
/**
 * CSPARQL Window class that implements the windowing mechanism for the RSP Engine.
 * The class is responsible for managing the windows, processing the events, and emitting the triggers based on the report strategy.
 * The class also handles the out-of-order processing of the events based on the maximum delay allowed for the events and the watermark.
 */
class CSPARQLWindow {
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
    constructor(name, width, slide, report, tick, start_time, max_delay) {
        this.name = name;
        this.width = width;
        this.slide = slide;
        this.report = report;
        this.tick = tick;
        const log_level = Logger_1.LogLevel[LOG_CONFIG.log_level];
        this.logger = new Logger_1.Logger(log_level, LOG_CONFIG.classes_to_log, LOG_CONFIG.destination);
        this.time = start_time;
        this.current_watermark = start_time;
        this.t0 = start_time;
        this.active_windows = new Map();
        this.emitter = new events_1.EventEmitter();
        this.max_delay = max_delay;
        this.pending_triggers = new Set();
        this.late_buffer = new Map();
    }
    /**
     * Get the content of the window at the given timestamp if it exists, else return undefined.
     * @param {number} timestamp - The timestamp for which the content of the window is to be retrieved.
     * @returns {QuadContainer | undefined} - The content of the window if it exists, else undefined.
     */
    getContent(timestamp) {
        let max_window = null;
        let max_time = Number.MAX_SAFE_INTEGER;
        this.active_windows.forEach((value, window) => {
            if (window.open <= timestamp && timestamp <= window.close) {
                if (window.close < max_time) {
                    max_time = window.close;
                    max_window = window;
                }
            }
        });
        if (max_window) {
            return this.active_windows.get(max_window);
        }
        else {
            return undefined;
        }
    }
    /**
     * Add the event to the window at the given timestamp and checks if the event is late or not.
     * @param {Quad} e - The event to be added to the window.
     * @param {number} timestamp - The timestamp of the event.
     * @returns {void} - The function does not return anything.
     */
    add(e, timestamp) {
        let processing_time = Date.now();
        fs_1.default.appendFileSync('time_log.txt', `${processing_time - timestamp}\n`);
        console.debug(`Adding [" + ${e} + "] at time : ${timestamp} and watermark ${this.current_watermark}`);
        if (this.if_event_late(timestamp)) {
            console.log("Event is late at time " + timestamp);
            this.buffer_late_event(e, this.time);
            return;
        }
        const to_evict = this.process_event(e, timestamp);
        if (timestamp > this.time) {
            this.time = timestamp;
        }
        this.evict_windows(to_evict);
    }
    /**
     * Check if the event is late or not based on the timestamp of the event and comparing it to the current time of the window.
     * @param {number} timestamp - The timestamp of the event.
     * @returns {boolean} - True if the event is late, else false.
     */
    if_event_late(timestamp) {
        return this.time > timestamp;
    }
    /**
     * Buffer the late event for out-of-order processing based on the maximum delay allowed for the events.
     * @param {Quad} e - The event to be buffered.
     * @param {number} timestamp - The timestamp of the event.
     * @returns {void} - The function does not return anything.
     */
    buffer_late_event(e, timestamp) {
        var _a;
        if (this.time - timestamp > this.max_delay) {
            this.logger.info(`Late element [" + ${e} + "] with timestamp [" + ${timestamp} + "] is out of the allowed delay [" + ${this.max_delay} + "]`, `CSPARQLWindow`);
            console.error("Late element [" + e + "] with timestamp [" + timestamp + "] is out of the allowed delay [" + this.max_delay + "]");
        }
        else {
            this.logger.info(`Late element [" + ${e} + "] with timestamp [" + ${timestamp} + "] is being buffered for out of order processing`, `CSPARQLWindow`);
            console.warn("Late element [" + e + "] with timestamp [" + timestamp + "] is being buffered for out of order processing");
            if (!this.late_buffer.has(timestamp)) {
                this.late_buffer.set(timestamp, new Set());
                console.log(`Size of the late buffer from the buffer_late_event method: ${this.late_buffer.size}`);
            }
            (_a = this.late_buffer.get(timestamp)) === null || _a === void 0 ? void 0 : _a.add(e);
            this.logger.info(`Size of the late buffer from the buffer_late_event method: ${this.late_buffer.size}`, `CSPARQLWindow`);
        }
    }
    /**
     * Evict the windows that are out of the watermark.
     * @param {Set<WindowInstance>} toEvict - The set of windows to be evicted from the window to be processed by the R2R Operator.
     * @returns {void} - The function does not return anything.
     */
    evict_windows(toEvict) {
        for (const w of toEvict) {
            console.debug("Evicting [" + w.open + "," + w.close + ")");
            this.active_windows.delete(w);
        }
    }
    /**
     * Add the window instance to the pending triggers to be emitted.
     * @param {number} t_e - The timestamp of the event to be processed.
     * @returns {void} - The function does not return anything.
     */
    add_window_instance_to_pending_triggers(t_e) {
        this.logger.info(`Pending Triggers are : ${JSON.stringify(this.pending_triggers)}`, `CSPARQLWindow`);
        console.log(`Size of the pending triggers before adding the window instance: ${this.pending_triggers.size}`);
        const window_instance = this.get_window_instance(t_e);
        if (this.hasWindowInstance(this.pending_triggers, window_instance)) {
            return;
        }
        else {
            this.pending_triggers.add(window_instance);
        }
    }
    /**
     * Process the event and update the watermark .
     * @param {Quad} e - The event to be processed of the form {subject, predicate, object, graph}.
     * @param {number} t_e - The timestamp of the event.
     * @returns {Set<WindowInstance>} - The set of windows to be evicted from the window to be processed by the R2R Operator.
     */
    process_event(e, t_e) {
        const toEvict = new Set();
        this.scope(t_e);
        for (const w of this.active_windows.keys()) {
            if (w.open <= t_e && t_e < w.close) {
                const temp_window = this.active_windows.get(w);
                if (temp_window) {
                    temp_window.add(e, t_e);
                }
            }
            else if (t_e >= w.close) {
                toEvict.add(w);
            }
        }
        this.update_watermark(t_e);
        this.add_window_instance_to_pending_triggers(t_e);
        return toEvict;
    }
    /**
     * Get the window instance for the given timestamp.
     * @param {number} t_e - The timestamp for which the window instance is to be retrieved.
     * @returns {WindowInstance} - The window instance for the given timestamp.
     */
    get_window_instance(t_e) {
        const c_sup = Math.ceil((Math.abs(t_e - this.t0) / this.slide)) * this.slide;
        const o_i = c_sup - this.width;
        return new WindowInstance(o_i, o_i + this.width);
    }
    /**
     * Updating the watermark.
     * @param {number} new_time - The new watermark to be set.
     * @returns {void} - The function does not return anything.
     */
    update_watermark(new_time) {
        if (new_time > this.current_watermark) {
            this.current_watermark = new_time;
            this.logger.info(`Watermark is increasing ${this.current_watermark} and time ${this.time}`, `CSPARQLWindow`);
            this.evict_and_trigger_on_watermark();
        }
        else {
            console.error("Watermark is not increasing");
        }
    }
    /**
     *  Evict the windows that are out of the watermark and trigger the windows that are within the watermark.
     */
    evict_and_trigger_on_watermark() {
        // Evict windows that are out of the watermark and should be evicted.
        const to_evict = new Set();
        // Checking all of the currently active windows.
        this.active_windows.forEach((value, window) => {
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
            console.debug(`Watermark evicting window ${window.getDefinition()}`);
        }
    }
    /**
     * Emit the triggers for the windows that are within the watermark.
     * @param {number} t_e - The timestamp of the event to be processed.
     * @returns {void} - The function does not return anything.
     */
    emit_on_trigger(t_e) {
        this.pending_triggers.forEach((window) => {
            this.logger.info(`Emitting triggers for the window ${window.getDefinition()}`, `CSPARQLWindow`);
            const content = this.get_quads_from_active_windows(this.active_windows, window);
            if (content && content.len() > 0) {
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
                    // this.time = t_e;
                    if (!window.has_triggered || this.report == ReportStrategy.OnContentChange) {
                        if (window.has_triggered) {
                            this.logger.info(`Window ${window.getDefinition()} is already triggered so not triggering it again.`, `CSPARQLWindow`);
                        }
                        else {
                            if (content.len() > 0) {
                                this.logger.info(`Window ${window.getDefinition()} triggers with ContentSize: " + ${content.len()}`, `CSPARQLWindow`);
                                window.set_triggered();
                                this.emitter.emit('RStream', content);
                            }
                            else {
                                this.logger.info(`Window ${window.getDefinition()} has no data.`, `CSPARQLWindow`);
                            }
                        }
                    }
                    this.pending_triggers.delete(window);
                }
                else {
                    console.error("Window [" + window.open + "," + window.close + ") should not trigger");
                }
            }
        });
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
     * @param {WindowInstance} w - The window instance for which the report is to be computed.
     * @param {QuadContainer} content - The content of the window (which is a QuadContainer).
     * @param {number} timestamp - The timestamp of the event to be processed.
     * @returns {boolean} - True if the report is to be computed, else false.
     */
    compute_report(w, content, timestamp) {
        if (this.report == ReportStrategy.OnWindowClose) {
            return w.close < timestamp;
        }
        else if (this.report == ReportStrategy.OnContentChange) {
            return true;
        }
        return false;
    }
    /**
     * Scope the window based on the given timestamp.
     * @param {number} t_e - The timestamp of the event to be processed.
     * @returns {void} - The function does not return anything.
     */
    scope(t_e) {
        const c_sup = Math.ceil((Math.abs(t_e - this.t0) / this.slide)) * this.slide;
        let o_i = c_sup - this.width;
        while (o_i <= t_e) {
            computeWindowIfAbsent(this.active_windows, new WindowInstance(o_i, o_i + this.width), () => new QuadContainer(new Set(), 0));
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
    subscribe(output, call_back) {
        this.emitter.on(output, call_back);
    }
    /* eslint-enable no-unused-vars */
    /**
     * Process the late elements that are out of order.
     * The function is currently called periodically based on the slide of the window.
     * @returns {void} - The function does not return anything.
     */
    process_late_elements() {
        if (this.late_buffer.size == 0) {
            return;
        }
        else {
            this.logger.info(`Processing late elements for the window with the late_buffer size ${this.late_buffer.size}`, `CSPARQLWindow`);
            const sortedLateBuffer = Array.from(this.late_buffer.entries()).sort(([timestampA], [timestampB]) => timestampA - timestampB);
            sortedLateBuffer.forEach(([timestamp, elements]) => {
                elements.forEach((element) => {
                    const to_evict = new Set();
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
     * @returns {void} - The function does not return anything.
     */
    set_current_time(t) {
        this.time = t;
    }
    set_max_delay(delay) {
        this.max_delay = delay;
    }
    /**
     * Set the watermark to the given value.
     * @param {number} t - The watermark to be set.
     * @returns {void} - The function does not return anything.
     */
    set_current_watermark(t) {
        this.current_watermark = t;
    }
    /**
     *  Get the quads from the active windows based on the given window instance. The function is used to get the content of the window based on the window instance.
     * @param {Map<WindowInstance, QuadContainer>} map - The map of the active windows.
     * @param {WindowInstance} target - The window instance for which the content is to be retrieved.
     * @returns {QuadContainer | undefined} - The content of the window instance if it exists, else undefined.
     */
    get_quads_from_active_windows(map, target) {
        for (const [key, value] of map.entries()) {
            if (key.open === target.open && key.close === target.close && key.has_triggered === target.has_triggered) {
                return value;
            }
        }
        return undefined;
    }
    /**
     * Check if the window instance is present in the set of window instances.
     * @param {Set<WindowInstance>} set - The set of window instances.
     * @param {WindowInstance} window - The window instance to be checked.
     * @returns {boolean} - True if the window instance is present in the set, else false.
     */
    hasWindowInstance(set, window) {
        for (const elem of set) {
            if (elem.open === window.open && elem.close === window.close) {
                return true;
            }
        }
        return false;
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
exports.CSPARQLWindow = CSPARQLWindow;
/* eslint-disable no-unused-vars */
/**
 * Compute the window if absent based on the given window instance and the mapping function.
 * @param {Map<WindowInstance, QuadContainer>} map - The map of the active windows.
 * @param {WindowInstance} window - The window instance of the form {open, close, has_triggered}.
 * @param {mappingFunction} mappingFunction - The mapping function to be applied to the window instance.
 */
function computeWindowIfAbsent(map, window, mappingFunction) {
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
}
/* eslint-enable no-unused-vars */
function gammaOperator(shape, scale) {
    return ss.gamma(shape, scale);
}
exports.gammaOperator = gammaOperator;
