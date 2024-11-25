/** 
 * Parser for RSP-QL queries to extract the SPARQL query and the window definitions.
 */
export class ParsedQuery {
    sparql: string;
    r2s: R2S;
    s2r: Array<WindowDefinition>;
    /**
     * Constructor to initialize the ParsedQuery object with default values.
     */
    constructor() {
        this.sparql = "Select * WHERE{?s ?p ?o}";
        // @ts-ignore
        this.r2s = { operator: "RStream", name: "undefined" };
        this.s2r = new Array<WindowDefinition>();

    }
    /**
     * Set the SPARQL query for the ParsedQuery object.
     * @param {string} sparql - The SPARQL query to be set.
     */
    set_sparql(sparql: string) {
        this.sparql = sparql;
    }
    /**
     * Set the R2S operator for the ParsedQuery object.
     * @param {R2S} r2s - The R2S operator to be set.
     */
    set_r2s(r2s: R2S) {
        this.r2s = r2s;
    }
    /**
     * Add a S2R window definition to the ParsedQuery object.
     * @param {WindowDefinition} s2r - The window definition to be added.
     */
    add_s2r(s2r: WindowDefinition) {
        this.s2r.push(s2r);
    }
}
/**
 * Interface for the Window Definition in the RSP-QL query.
 */
export type WindowDefinition = {
    window_name: string,
    stream_name: string,
    width: number,
    slide: number
}
/**
 * Interface for the R2S operator in the RSP-QL query.
 */
type R2S = {
    operator: "RStream" | "IStream" | "DStream",
    name: string
}
/**
 * RSP-QL Parser Class to parse the RSP-QL query and extract the SPARQL query and the window definitions.
 */
export class RSPQLParser {
    /**
     * Parse the RSP-QL query to extract the SPARQL query and the window definitions.
     * @param {string} query - The RSP-QL query to be parsed.
     * @returns {ParsedQuery} - The parsed query object containing the SPARQL query and the window definitions.
     */
    parse(query: string): ParsedQuery {
        const parsed = new ParsedQuery();
        const split = query.split(/\r?\n/);
        const sparqlLines = new Array<string>();
        const prefixMapper = new Map<string, string>();
        split.forEach((line) => {
            const trimmed_line = line.trim();
            //R2S
            if (trimmed_line.startsWith("REGISTER")) {
                const regexp = /REGISTER +([^ ]+) +<([^>]+)> AS/g;
                const matches = trimmed_line.matchAll(regexp);
                for (const match of matches) {
                    if (match[1] === "RStream" || match[1] === "DStream" || match[1] === "IStream") {
                        parsed.set_r2s({ operator: match[1], name: match[2] });
                    }
                }
            }
            else if (trimmed_line.startsWith("FROM NAMED WINDOW")) {
                const regexp = /FROM +NAMED +WINDOW +([^ ]+) +ON +STREAM +([^ ]+) +\[RANGE +([^ ]+) +STEP +([^ ]+)\]/g;
                const matches = trimmed_line.matchAll(regexp);
                for (const match of matches) {
                    parsed.add_s2r({
                        window_name: this.unwrap(match[1], prefixMapper),
                        stream_name: this.unwrap(match[2], prefixMapper),
                        width: Number(match[3]),
                        slide: Number(match[4])
                    });
                }
            } else {
                let sparqlLine = trimmed_line;
                if (sparqlLine.startsWith("WINDOW")) {
                    sparqlLine = sparqlLine.replace("WINDOW", "GRAPH");
                }
                if (sparqlLine.startsWith("PREFIX")) {
                    const regexp = /PREFIX +([^:]*): +<([^>]+)>/g;
                    const matches = trimmed_line.matchAll(regexp);
                    for (const match of matches) {
                        prefixMapper.set(match[1], match[2]);
                    }
                }
                sparqlLines.push(sparqlLine);
            }
        });
        parsed.sparql = sparqlLines.join("\n");
        return parsed;
    }
    /**
     * Unwrap the prefixed IRI to the full IRI using the prefix mapper.
     * @param {string} prefixedIri - The prefixed IRI to be unwrapped.
     * @param {Map<string, string>} mapper - The prefix mapper to be used for unwrapping.
     * @returns {string} - The unwrapped full IRI.
     */
    unwrap(prefixedIri: string, mapper: Map<string, string>) {
        if (prefixedIri.trim().startsWith("<")) {
            return prefixedIri.trim().slice(1, -1);
        }
        const split = prefixedIri.trim().split(":");
        const iri = split[0];
        if (mapper.has(iri)) {
            return mapper.get(iri) + split[1];
        } else {
            return "";
        }
    }
}
