/// <reference types="node" />
import { CSPARQLWindow } from "./operators/s2r";
import { EventEmitter } from "events";
import { Quad } from 'n3';
export type binding_with_timestamp = {
    bindings: any;
    timestamp_from: number;
    timestamp_to: number;
};
/**
 * RDF Stream Class to represent the stream of RDF Data.
 * It emits the data to the CSPARQL Window for processing.
 */
export declare class RDFStream {
    name: string;
    emitter: EventEmitter;
    /**
     * Constructor for the RDFStream class.
     * @param {string} name - The name of the stream to be created.
     * @param {CSPARQLWindow} window - The CSPARQL Window to which the stream is to be processed and emitted by the S2R Operator.
     */
    constructor(name: string, window: CSPARQLWindow);
    /**
     * Adds the event to the RDF Stream to be processed by the RSP Engine.
     * @param {Set<Quad>} event - The event to be added to the stream. The event is a set of quads of the form {subject, predicate, object, graph}.
     * @param {number} ts - The timestamp of the event.
     */
    add(event: Set<Quad>, ts: number): void;
}
/**
 * RSPEngine Class to represent the RSP Engine.
 * It contains the windows and streams of the RSP Engine.
 */
export declare class RSPEngine {
    windows: Array<CSPARQLWindow>;
    streams: Map<string, RDFStream>;
    max_delay: number;
    time_to_trigger_processing_late_elements: number;
    private r2r;
    private logger;
    /**
     * Constructor for the RSPEngine class.
     * @param {string} query - The query to be executed by the RSP Engine.
     * @param {{max_delay: number, time_to_trigger_processing_late_elements: number}} opts - The options for the RSP Engine for processing the data if they are late or out of order.
     * @param {number} opts.max_delay - The maximum delay for the window to be processed in the case of late data arrival and out of order data.
     * This field is optional and defaults to 0 for no delay expected by the RSP Engine in processing of the data.
     * @param {number} opts.time_to_trigger_processing_late_elements - The time to trigger the processing of the late elements in the window.
     * This field is optional and defaults to 60000 milliseconds.
     */
    constructor(query: string, opts?: {
        max_delay?: number;
        time_to_trigger_processing_late_elements?: number;
    });
    /**
     * Register the RSP Engine to start processing the data.
     * @returns {any} - The event emitter to emit the data to the RSP Engine.
     */
    register(): any;
    /**
     * Get the stream by the stream name.
     * @param {string} stream_name - The name of the stream to be fetched.
     * @returns {RDFStream | undefined} - The stream with the given name.
     */
    getStream(stream_name: string): RDFStream | undefined;
    /**
     * Add static data to the RSP Engine.
     * @param {Quad} static_data - The static data to be added to the RSP Engine.
     */
    addStaticData(static_data: Quad): void;
    /**
     * Get all the streams of the RSP Engine.
     * @returns {string[]} - The list of all the streams in the RSP Engine.
     */
    get_all_streams(): string[];
}
