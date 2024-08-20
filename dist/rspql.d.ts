/**
 * Parser for RSP-QL queries to extract the SPARQL query and the window definitions.
 */
export declare class ParsedQuery {
    sparql: string;
    r2s: R2S;
    s2r: Array<WindowDefinition>;
    /**
     * Constructor to initialize the ParsedQuery object with default values.
     */
    constructor();
    /**
     * Set the SPARQL query for the ParsedQuery object.
     * @param {string} sparql - The SPARQL query to be set.
     */
    set_sparql(sparql: string): void;
    /**
     * Set the R2S operator for the ParsedQuery object.
     * @param {R2S} r2s - The R2S operator to be set.
     */
    set_r2s(r2s: R2S): void;
    /**
     * Add a S2R window definition to the ParsedQuery object.
     * @param {WindowDefinition} s2r - The window definition to be added.
     */
    add_s2r(s2r: WindowDefinition): void;
}
/**
 * Interface for the Window Definition in the RSP-QL query.
 */
export type WindowDefinition = {
    window_name: string;
    stream_name: string;
    width: number;
    slide: number;
};
/**
 * Interface for the R2S operator in the RSP-QL query.
 */
type R2S = {
    operator: "RStream" | "IStream" | "DStream";
    name: string;
};
/**
 * RSP-QL Parser Class to parse the RSP-QL query and extract the SPARQL query and the window definitions.
 */
export declare class RSPQLParser {
    /**
     * Parse the RSP-QL query to extract the SPARQL query and the window definitions.
     * @param {string} query - The RSP-QL query to be parsed.
     * @returns {ParsedQuery} - The parsed query object containing the SPARQL query and the window definitions.
     */
    parse(query: string): ParsedQuery;
    /**
     * Unwrap the prefixed IRI to the full IRI using the prefix mapper.
     * @param {string} prefixedIri - The prefixed IRI to be unwrapped.
     * @param {Map<string, string>} mapper - The prefix mapper to be used for unwrapping.
     * @returns {string} - The unwrapped full IRI.
     */
    unwrap(prefixedIri: string, mapper: Map<string, string>): string;
}
export {};
