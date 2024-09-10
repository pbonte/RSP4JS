import { CSPARQLWindow, QuadContainer, ReportStrategy, Tick } from "./operators/s2r";
import { R2ROperator } from "./operators/r2r";
import { EventEmitter } from "events";
import * as LOG_CONFIG from "./config/log_config.json";
import { LogDestination, LogLevel, Logger } from "./util/Logger";
const N3 = require('n3');
const { DataFactory } = N3;
const { namedNode } = DataFactory;
// @ts-ignore
import { Quad } from 'n3';
import { RSPQLParser, WindowDefinition } from "./rspql";

export type binding_with_timestamp = {
    bindings: any,
    timestamp_from: number,
    timestamp_to: number
}

/**
 * RDF Stream Class to represent the stream of RDF Data.   
 * It emits the data to the CSPARQL Window for processing.
 */
export class RDFStream {
    name: string;
    emitter: EventEmitter;

    /**
     * Constructor for the RDFStream class.
     * @param {string} name - The name of the stream to be created.
     * @param {CSPARQLWindow} window - The CSPARQL Window to which the stream is to be processed and emitted by the S2R Operator.
     */
    constructor(name: string, window: CSPARQLWindow) {
        this.name = name;
        const EventEmitter = require('events').EventEmitter;
        this.emitter = new EventEmitter();
        this.emitter.on('data', (quadcontainer: QuadContainer) => {
            // @ts-ignore
            quadcontainer.elements._graph = namedNode(window.name);
            // @ts-ignore
            window.add(quadcontainer.elements, quadcontainer.last_time_changed());
        });
    }

    /**
     * Adds the event to the RDF Stream to be processed by the RSP Engine.
     * @param {Set<Quad>} event - The event to be added to the stream. The event is a set of quads of the form {subject, predicate, object, graph}.
     * @param {number} ts - The timestamp of the event.
     */
    add(event: Set<Quad>, ts: number) {
        this.emitter.emit('data', new QuadContainer(event, ts));
    }
}

/**
 * RSPEngine Class to represent the RSP Engine.
 * It contains the windows and streams of the RSP Engine.
 */
export class RSPEngine {
    windows: Array<CSPARQLWindow>;
    streams: Map<string, RDFStream>;
    public max_delay: number;
    private r2r: R2ROperator;
    private logger: Logger;

    /**
     * Constructor for the RSPEngine class.
     * @param {string} query - The query to be executed by the RSP Engine.
     * @param {{max_delay: number }} opts - The options for the RSP Engine for processing the data if they are late or out of order.
     * @param {number} opts.max_delay - The maximum delay for the window to be processed in the case of late data arrival and out of order data.
     * This field is optional and defaults to 0 for no delay expected by the RSP Engine in processing of the data.
     */
    constructor(query: string, opts?: {
        max_delay?: number
    }) {
        this.windows = new Array<CSPARQLWindow>();
        if (opts) {
            this.max_delay = opts.max_delay ? opts.max_delay : 0;
        }
        else {
            this.max_delay = 0;
        }
        this.streams = new Map<string, RDFStream>();
        const logLevel: LogLevel = LogLevel[LOG_CONFIG.log_level as keyof typeof LogLevel];
        this.logger = new Logger(logLevel, LOG_CONFIG.classes_to_log, LOG_CONFIG.destination as unknown as LogDestination);
        const parser = new RSPQLParser();
        const parsed_query = parser.parse(query);
        parsed_query.s2r.forEach((window: WindowDefinition) => {
            const windowImpl = new CSPARQLWindow(window.window_name, window.width, window.slide, ReportStrategy.OnWindowClose, Tick.TimeDriven, 0, this.max_delay);
            this.windows.push(windowImpl);
            const stream = new RDFStream(window.stream_name, windowImpl);
            this.streams.set(window.stream_name, stream);
        })
        this.r2r = new R2ROperator(parsed_query.sparql);

    }
    /**
     * Register the RSP Engine to start processing the data.
     * @returns {any} - The event emitter to emit the data to the RSP Engine.
     */
    register() {
        const EventEmitter = require('events').EventEmitter;
        const emitter = new EventEmitter();
        this.windows.forEach((window) => {
            window.subscribe("RStream", async (data: QuadContainer) => {
                if (data) {
                    if (data.len() > 0) {
                        this.logger.info(`Received window content for time ${data.last_time_changed()}`, `RSPEngine`, this);
                        console.log(`Received window content for time ${data.last_time_changed()}`, `RSPEngine`);
                        // iterate over all the windows
                        for (const windowIt of this.windows) {
                            // filter out the current triggering one
                            if (windowIt != window) {
                                const currentWindowData = windowIt.getContent(data.last_time_changed());
                                if (currentWindowData) {
                                    // add the content of the other windows to the quad container
                                    currentWindowData.elements.forEach((q) => data.add(q, data.last_time_changed()));
                                }
                            }
                        }
                        this.logger.info(`Starting Window Query Processing for the window ${window.getCSPARQLWindowDefinition()} with window size ${data.len()}`, `RSPEngine`, this);
                        console.log(`Starting Window Query Processing for the window time ${data.last_time_changed()} with window size ${data.len()}`, `RSPEngine`);
                        const bindingsStream = await this.r2r.execute(data);
                        this.logger.info(`Ended the execution of the R2R Operator for the window ${window.getCSPARQLWindowDefinition()} with window size ${data.len()}`, `RSPEngine`, this);
                        bindingsStream.on('data', (binding: any) => {
                            const object_with_timestamp: binding_with_timestamp = {
                                bindings: binding,
                                timestamp_from: window.t0,
                                timestamp_to: window.t0 + window.slide
                            }
                            window.t0 += window.slide;
                            emitter.emit("RStream", object_with_timestamp);
                        });
                        bindingsStream.on('end', () => {
                            this.logger.info(`Ended Comunica Binding Stream for window ${window.getCSPARQLWindowDefinition()} with window size ${data.len()}`, `RSPEngine`, this);
                        });
                        await bindingsStream;
                    }
                }
            });
        });
        return emitter;
    }

    /**
     * Get the stream by the stream name.
     * @param {string} stream_name - The name of the stream to be fetched.
     * @returns {RDFStream | undefined} - The stream with the given name.
     */
    getStream(stream_name: string) {
        return this.streams.get(stream_name);
    }

    /**
     * Add static data to the RSP Engine.
     * @param {Quad} static_data - The static data to be added to the RSP Engine.
     */
    addStaticData(static_data: Quad) {
        this.r2r.addStaticData(static_data);
    }

    /**
     * Get all the streams of the RSP Engine.
     * @returns {string[]} - The list of all the streams in the RSP Engine.
     */
    get_all_streams() {
        const streams: string[] = [];
        this.streams.forEach((stream) => {
            streams.push(stream.name);
        });
        return streams;
    }


}
