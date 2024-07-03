import { CSPARQLWindow, QuadContainer, ReportStrategy, Tick } from "./operators/s2r";
import { R2ROperator } from "./operators/r2r";
import { EventEmitter } from "events";
import * as LOG_CONFIG from "./config/log_config.json";
import { LogDestination, LogLevel, Logger } from "./util/Logger";
const N3 = require('n3');
const { DataFactory } = N3;
const { namedNode, literal, defaultGraph, quad } = DataFactory;
// @ts-ignore
import { Quad } from 'n3';
import { RSPQLParser, WindowDefinition } from "./rspql";

export type binding_with_timestamp = {
    bindings: any,
    timestamp_from: number,
    timestamp_to: number
}

export class RDFStream {
    name: string;
    emitter: EventEmitter;

    constructor(name: string, window: CSPARQLWindow) {
        this.name = name;
        let EventEmitter = require('events').EventEmitter;
        this.emitter = new EventEmitter();
        this.emitter.on('data', (quadcontainer: QuadContainer) => {
            // @ts-ignore
            quadcontainer.elements._graph = namedNode(window.name);
            // @ts-ignore
            window.add(quadcontainer.elements, quadcontainer.last_time_changed());
        });
    }

    add(event: Set<Quad>, ts: number) {
        this.emitter.emit('data', new QuadContainer(event, ts));
    }
}

export class RSPEngine {
    windows: Array<CSPARQLWindow>;
    streams: Map<string, RDFStream>;
    private r2r: R2ROperator;
    private logger: Logger;

    constructor(query: string) {
        this.windows = new Array<CSPARQLWindow>();
        this.streams = new Map<string, RDFStream>();
        const logLevel: LogLevel = LogLevel[LOG_CONFIG.log_level as keyof typeof LogLevel];
        this.logger = new Logger(logLevel, LOG_CONFIG.classes_to_log, LOG_CONFIG.destination as unknown as LogDestination);
        let parser = new RSPQLParser();
        let parsed_query = parser.parse(query);
        parsed_query.s2r.forEach((window: WindowDefinition) => {
            let windowImpl = new CSPARQLWindow(window.window_name, window.width, window.slide, ReportStrategy.OnWindowClose, Tick.TimeDriven, 0, LOG_CONFIG.max_delay);
            this.windows.push(windowImpl);
            let stream = new RDFStream(window.stream_name, windowImpl);
            this.streams.set(window.stream_name, stream);
        })
        this.r2r = new R2ROperator(parsed_query.sparql);

    }

    register() {
        let EventEmitter = require('events').EventEmitter;
        let emitter = new EventEmitter();
        this.windows.forEach((window) => {
            window.subscribe("RStream", async (data: QuadContainer) => {
                if (data) {
                    if (data.len() > 0) {
                        this.logger.info(`Received window content for time ${data.last_time_changed()}`, `RSPEngine`);
                        // iterate over all the windows
                        for (let windowIt of this.windows) {
                            // filter out the current triggering one
                            if (windowIt != window) {
                                let currentWindowData = windowIt.getContent(data.last_time_changed());
                                if (currentWindowData) {
                                    // add the content of the other windows to the quad container
                                    currentWindowData.elements.forEach((q) => data.add(q, data.last_time_changed()));
                                }
                            }
                        }
                        this.logger.info(`Starting Window Query Processing for the window time ${data.last_time_changed()} with window size ${data.len()}`, `RSPEngine`);
                        let bindingsStream = await this.r2r.execute(data);
                        bindingsStream.on('data', (binding: any) => {
                            let object_with_timestamp: binding_with_timestamp = {
                                bindings: binding,
                                timestamp_from: window.t0,
                                timestamp_to: window.t0 + window.slide
                            }
                            window.t0 += window.slide;
                            emitter.emit("RStream", object_with_timestamp);
                        });
                        bindingsStream.on('end', () => {
                            this.logger.info(`Ended Comunica Binding Stream for window time ${data.last_time_changed()} with window size ${data.len()}`, `RSPEngine`);
                        });
                        await bindingsStream;
                    }
                }
            });
        });
        return emitter;
    }

    getStream(stream_name: string) {
        return this.streams.get(stream_name);
    }

    addStaticData(static_data: Quad) {
        this.r2r.addStaticData(static_data);
    }

    get_all_streams() {
        let streams: string[] = [];
        this.streams.forEach((stream) => {
            streams.push(stream.name);
        });
        return streams;
    }
}
