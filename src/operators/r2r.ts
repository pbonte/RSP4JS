import { QuadContainer } from "./s2r";
import { DataFactory } from "rdf-data-factory";
const N3 = require('n3');
const DF = new DataFactory();
const QueryEngine = require('@comunica/query-sparql').QueryEngine;
// @ts-ignore
import { Quad } from 'n3';
/**
 * R2R Operator Implementation Class for the RSP Engine.
 * It performs operations such as Join, Filter, Aggregation on a stream of data
 * to generate a new stream of data.
 */
export class R2ROperator {
    query: string;
    staticData: Set<Quad>;
    /**
     * Constructor to initialize the R2R Operator.
     * @param {string} query - The query to be executed.
     */
    constructor(query: string) {
        this.query = query;
        this.staticData = new Set<Quad>();
    }
    /**
     * Add static data to the R2R Operator which will be used in the query execution
     * In case there are some quads which are present in each of the relation to be executed, it is better to add them as static data
     * and therefore save space and the amount of data to be processed.
     * @param {Quad} quad - The quad to be added as static data.
     */
    addStaticData(quad: Quad) {
        this.staticData.add(quad);
    }
    /**
     * Execute the R2R Operator on the given container of quads.
     * @param {QuadContainer} container - The container of quads on which the operator is to be executed. The container contains a set of quads.
     * @returns {Promise<any>} - The promise of the result of the query execution.
     */
    async execute(container: QuadContainer) {
        const store = new N3.Store();
        for (const elem of container.elements) {
            store.addQuad(elem);

        }
        for (const elem of this.staticData) {
            store.addQuad(elem);
        }

        const myEngine = new QueryEngine();
        return await myEngine.queryBindings(this.query, {
            sources: [store],
            extensionFunctions: {
                'http://extension.org/functions#sqrt'(args: any) {
                    const arg = args[0];
                    if (arg.termType === 'Literal') {
                        return DF.literal(Math.sqrt(Number(arg.value)).toString());
                    }
                },
                'http://extension.org/functions#pow'(args: any) {
                    const arg1 = args[0];
                    if (arg1.termType === 'Literal') {
                        const arg2 = args[1];
                        if (arg2.termType === 'Literal') {
                            return DF.literal(Math.pow(Number(arg1.value), Number(arg2.value)).toString());
                        }
                    }
                }
            },
        });
    }
}
