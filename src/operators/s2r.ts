import { EventEmitter } from "events";
// @ts-ignore
import { Quad } from 'n3';

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

export class WindowInstance {
    open: number;
    close: number;
    has_triggered: boolean;
    constructor(open: number, close: number) {
        this.open = open;
        this.close = close;
        this.has_triggered = false;
    }

    getDefinition() {
        return "[" + this.open + "," + this.close + ")";
    }
    hasCode() {
        return 0;
    }

    is_same(other_window: WindowInstance): boolean {
        return this.open == other_window.open && this.close == other_window.close;
    }
}


export class QuadContainer {
    elements: Set<Quad>;
    last_time_stamp_changed: number;
    constructor(elements: Set<Quad>, ts: number) {
        this.elements = elements;
        this.last_time_stamp_changed = ts;
    }

    len() {
        return this.elements.size;
    }
    add(quad: Quad, ts: number) {
        this.elements.add(quad);
        this.last_time_stamp_changed = ts;
    }

    last_time_changed() {
        return this.last_time_stamp_changed;
    }

}

export class CSPARQLWindow {
    width: number;
    slide: number;
    time: number;
    t0: number;
    active_windows: Map<WindowInstance, QuadContainer>;
    report: ReportStrategy;
    tick: Tick;
    emitter: EventEmitter;
    interval_id: NodeJS.Timeout;
    name: string;
    private current_watermark: number; // To track the current watermark of the window
    private late_buffer: Map<number, Set<Quad>>; // Buffer for out-of-order late elements
    private max_delay: number; // The maximum delay allowed for a observation to be considered in the window
    constructor(name: string, width: number, slide: number, report: ReportStrategy, tick: Tick, start_time: number, max_delay: number) {
        this.name = name;
        this.width = width;
        this.slide = slide;
        this.report = report;
        this.tick = tick;
        this.time = start_time;
        this.current_watermark = start_time;
        this.t0 = start_time;
        this.active_windows = new Map<WindowInstance, QuadContainer>();
        this.emitter = new EventEmitter();
        this.max_delay = max_delay;
        this.late_buffer = new Map<number, Set<Quad>>();
        this.interval_id = setInterval(() => { this.process_late_elements() }, this.slide);
    }
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

    add(e: Quad, timestamp: number) {
        console.debug("Window " + this.name + " Received element (" + e + "," + timestamp + ")");
        let toEvict = new Set<WindowInstance>();
        let t_e = timestamp;

        if (this.time > t_e) {
            if (this.time - t_e > this.max_delay) {
                console.error("Late element [" + e + "] with timestamp [" + t_e + "] is out of the allowed delay [" + this.max_delay + "]");
                return;
            }
            else {
                console.warn("Late element [" + e + "] with timestamp [" + t_e + "] is being buffered for out of order processing");
                if (!this.late_buffer.has(t_e)) {
                    this.late_buffer.set(t_e, new Set<Quad>());
                }
                this.late_buffer.get(t_e)?.add(e);
                return;
            }
        }

        this.process_event(e, t_e, toEvict);

        for (let w of toEvict) {
            console.debug("Evicting [" + w.open + "," + w.close + ")");
            this.active_windows.delete(w);
        }

    }

    process_event(e: Quad, t_e: number, toEvict: Set<WindowInstance>) {
        this.scope(t_e);
        for (let w of this.active_windows.keys()) {
            if (w.open <= t_e && t_e < w.close) {
                let temp_window = this.active_windows.get(w);
                if (temp_window) {
                    temp_window.add(e, t_e);
                }
            } else if (t_e > w.close) {
                toEvict.add(w);
            }
        }

        this.emit_on_trigger(t_e);
        this.update_watermark(t_e);
    }

    update_watermark(new_time: number) {
        if (new_time > this.current_watermark) {
            this.current_watermark = new_time;
            this.check_watermark();
        }
    }

    check_watermark() {
        let to_evict = new Set<WindowInstance>();
        this.active_windows.forEach((value: QuadContainer, window: WindowInstance) => {
            if (window.close <= this.current_watermark - this.max_delay) {
                to_evict.add(window);
            }
        });

        for (let window of to_evict) {
            this.active_windows.delete(window);
            console.debug(`Watermark evicting window ${window.getDefinition()}`)
        }
    }

    emit_on_trigger(t_e: number) {
        let max_window = null;
        let max_time = 0;
        this.active_windows.forEach((value: QuadContainer, window: WindowInstance) => {
            if (this.compute_report(window, value, t_e)) {
                if (window.close > max_time) {
                    max_time = window.close;
                    max_window = window;
                }
            }
        });

        if (max_window) {
            if (this.tick == Tick.TimeDriven) {
                if (t_e > this.time) {
                    this.time = t_e;
                    if (max_window) {
                        // @ts-ignore
                        if (!max_window.has_triggered || this.report == ReportStrategy.OnContentChange) {
                            // @ts-ignore
                            max_window.has_triggered = true;
                            this.emitter.emit('RStream', this.active_windows.get(max_window));
                            // @ts-ignore
                            console.log("Window [" + max_window.open + "," + max_window.close + ") triggers. Content: " + this.active_windows.get(max_window));
                        }
                    }
                }
            }
        }
    }

    compute_report(w: WindowInstance, content: QuadContainer, timestamp: number) {
        if (this.report == ReportStrategy.OnWindowClose) {
            return w.close < timestamp;
        } else if (this.report == ReportStrategy.OnContentChange) {
            return true;
        }
        return false;

    }

    scope(t_e: number) {
        let c_sup = Math.ceil((Math.abs(t_e - this.t0) / this.slide)) * this.slide;
        let o_i = c_sup - this.width;
        do {
            computeWindowIfAbsent(this.active_windows, new WindowInstance(o_i, o_i + this.width), () => new QuadContainer(new Set<Quad>(), 0));
            o_i += this.slide;
        } while (o_i <= t_e);
    }


    subscribe(output: 'RStream' | 'IStream' | 'DStream', call_back: (data: QuadContainer) => void) {
        this.emitter.on(output, call_back);
    }

    process_late_elements() {
        this.late_buffer.forEach((elements: Set<Quad>, timestamp: number) => {
            elements.forEach((element: Quad) => {
                let to_evict = new Set<WindowInstance>();
                this.process_event(element, timestamp, to_evict);

                for (let w of to_evict) {
                    console.debug("Evicting [" + w.open + "," + w.close + ")");
                    this.active_windows.delete(w);
                }
            });
        });
        this.late_buffer.clear();
    }

    set_current_time(t: number) {
        this.time = t;
    }
}
function computeWindowIfAbsent(map: Map<WindowInstance, QuadContainer>, key: WindowInstance, mappingFunction: (key: WindowInstance) => QuadContainer) {
    let val = map.get(key);
    let found = false;

    for (let w of map.keys()) {
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
