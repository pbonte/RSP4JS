import { QuadContainer } from "./s2r";
import { DataFactory } from "rdf-data-factory";
const N3 = require('n3');
const DF = new DataFactory();
// @ts-ignore
import { Literal, Quad } from 'n3';
/**
 *
 */
export class R2ROperator {
    query: string;
    staticData: Set<Quad>;
    /**
     *
     * @param query
     */
    constructor(query: string) {
        this.query = query;
        this.staticData = new Set<Quad>();
    }
    /**
     *
     * @param quad
     */
    addStaticData(quad: Quad) {
        this.staticData.add(quad);
    }
    /**
     *
     * @param container
     */
    async execute(container: QuadContainer) {
        const store = new N3.Store();
        for (const elem of container.elements) {
            store.addQuad(elem);

        }
        for (const elem of this.staticData) {
            store.addQuad(elem);
        }
        const QueryEngine = require('@comunica/query-sparql').QueryEngine;

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
