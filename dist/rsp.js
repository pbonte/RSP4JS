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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RSPEngine = exports.RDFStream = void 0;
const s2r_1 = require("./operators/s2r");
const r2r_1 = require("./operators/r2r");
const LOG_CONFIG = __importStar(require("./config/log_config.json"));
const Logger_1 = require("./util/Logger");
const N3 = require('n3');
const { DataFactory } = N3;
const { namedNode } = DataFactory;
const rspql_1 = require("./rspql");
/**
 * RDF Stream Class to represent the stream of RDF Data.
 * It emits the data to the CSPARQL Window for processing.
 */
class RDFStream {
    /**
     * Constructor for the RDFStream class.
     * @param {string} name - The name of the stream to be created.
     * @param {CSPARQLWindow} window - The CSPARQL Window to which the stream is to be processed and emitted by the S2R Operator.
     */
    constructor(name, window) {
        this.name = name;
        const EventEmitter = require('events').EventEmitter;
        this.emitter = new EventEmitter();
        this.emitter.on('data', (quadcontainer) => {
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
    add(event, ts) {
        this.emitter.emit('data', new s2r_1.QuadContainer(event, ts));
    }
}
exports.RDFStream = RDFStream;
/**
 * RSPEngine Class to represent the RSP Engine.
 * It contains the windows and streams of the RSP Engine.
 */
class RSPEngine {
    /**
     * Constructor for the RSPEngine class.
     * @param {string} query - The query to be executed by the RSP Engine.
     * @param {{max_delay: number, time_to_trigger_processing_late_elements: number}} opts - The options for the RSP Engine for processing the data if they are late or out of order.
     * @param {number} opts.max_delay - The maximum delay for the window to be processed in the case of late data arrival and out of order data.
     * This field is optional and defaults to 0 for no delay expected by the RSP Engine in processing of the data.
     * @param {number} opts.time_to_trigger_processing_late_elements - The time to trigger the processing of the late elements in the window.
     * This field is optional and defaults to 60000 milliseconds.
     */
    constructor(query, opts) {
        this.windows = new Array();
        if (opts) {
            this.max_delay = opts.max_delay ? opts.max_delay : 0;
            this.time_to_trigger_processing_late_elements = opts.time_to_trigger_processing_late_elements ? opts.time_to_trigger_processing_late_elements : 0;
        }
        else {
            this.max_delay = 0;
            this.time_to_trigger_processing_late_elements = 60000;
        }
        this.streams = new Map();
        const logLevel = Logger_1.LogLevel[LOG_CONFIG.log_level];
        this.logger = new Logger_1.Logger(logLevel, LOG_CONFIG.classes_to_log, LOG_CONFIG.destination);
        const parser = new rspql_1.RSPQLParser();
        const parsed_query = parser.parse(query);
        parsed_query.s2r.forEach((window) => {
            const windowImpl = new s2r_1.CSPARQLWindow(window.window_name, window.width, window.slide, s2r_1.ReportStrategy.OnWindowClose, s2r_1.Tick.TimeDriven, 0, this.max_delay);
            this.windows.push(windowImpl);
            const stream = new RDFStream(window.stream_name, windowImpl);
            this.streams.set(window.stream_name, stream);
        });
        this.r2r = new r2r_1.R2ROperator(parsed_query.sparql);
    }
    /**
     * Register the RSP Engine to start processing the data.
     * @returns {any} - The event emitter to emit the data to the RSP Engine.
     */
    register() {
        const EventEmitter = require('events').EventEmitter;
        const emitter = new EventEmitter();
        this.windows.forEach((window) => {
            window.subscribe("RStream", (data) => __awaiter(this, void 0, void 0, function* () {
                if (data) {
                    if (data.len() > 0) {
                        this.logger.info(`Received window content for time ${data.last_time_changed()}`, `RSPEngine`);
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
                        this.logger.info(`Starting Window Query Processing for the window ${window.getCSPARQLWindowDefinition()} with window size ${data.len()}`, `RSPEngine`);
                        console.log(`Starting Window Query Processing for the window time ${data.last_time_changed()} with window size ${data.len()}`, `RSPEngine`);
                        const bindingsStream = yield this.r2r.execute(data);
                        this.logger.info(`Ended the execution of the R2R Operator for the window ${window.getCSPARQLWindowDefinition()} with window size ${data.len()}`, `RSPEngine`);
                        bindingsStream.on('data', (binding) => {
                            const object_with_timestamp = {
                                bindings: binding,
                                timestamp_from: window.t0,
                                timestamp_to: window.t0 + window.slide
                            };
                            window.t0 += window.slide;
                            emitter.emit("RStream", object_with_timestamp);
                        });
                        bindingsStream.on('end', () => {
                            this.logger.info(`Ended Comunica Binding Stream for window ${window.getCSPARQLWindowDefinition()} with window size ${data.len()}`, `RSPEngine`);
                        });
                        yield bindingsStream;
                    }
                }
            }));
        });
        return emitter;
    }
    /**
     * Get the stream by the stream name.
     * @param {string} stream_name - The name of the stream to be fetched.
     * @returns {RDFStream | undefined} - The stream with the given name.
     */
    getStream(stream_name) {
        return this.streams.get(stream_name);
    }
    /**
     * Add static data to the RSP Engine.
     * @param {Quad} static_data - The static data to be added to the RSP Engine.
     */
    addStaticData(static_data) {
        this.r2r.addStaticData(static_data);
    }
    /**
     * Get all the streams of the RSP Engine.
     * @returns {string[]} - The list of all the streams in the RSP Engine.
     */
    get_all_streams() {
        const streams = [];
        this.streams.forEach((stream) => {
            streams.push(stream.name);
        });
        return streams;
    }
}
exports.RSPEngine = RSPEngine;
