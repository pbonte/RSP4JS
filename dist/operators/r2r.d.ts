import { QuadContainer } from "./s2r";
import { Quad } from 'n3';
/**
 * R2R Operator Implementation Class for the RSP Engine.
 * It performs operations such as Join, Filter, Aggregation on a stream of data
 * to generate a new stream of data.
 */
export declare class R2ROperator {
    query: string;
    staticData: Set<Quad>;
    /**
     * Constructor to initialize the R2R Operator.
     * @param {string} query - The query to be executed.
     */
    constructor(query: string);
    /**
     * Add static data to the R2R Operator which will be used in the query execution
     * In case there are some quads which are present in each of the relation to be executed, it is better to add them as static data
     * and therefore save space and the amount of data to be processed.
     * @param {Quad} quad - The quad to be added as static data.
     */
    addStaticData(quad: Quad): void;
    /**
     * Execute the R2R Operator on the given container of quads.
     * @param {QuadContainer} container - The container of quads on which the operator is to be executed. The container contains a set of quads.
     * @returns {Promise<any>} - The promise of the result of the query execution.
     */
    execute(container: QuadContainer): Promise<any>;
}
