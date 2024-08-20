"use strict";
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
exports.R2ROperator = void 0;
const rdf_data_factory_1 = require("rdf-data-factory");
const N3 = require('n3');
const DF = new rdf_data_factory_1.DataFactory();
const QueryEngine = require('@comunica/query-sparql').QueryEngine;
/**
 * R2R Operator Implementation Class for the RSP Engine.
 * It performs operations such as Join, Filter, Aggregation on a stream of data
 * to generate a new stream of data.
 */
class R2ROperator {
    /**
     * Constructor to initialize the R2R Operator.
     * @param {string} query - The query to be executed.
     */
    constructor(query) {
        this.query = query;
        this.staticData = new Set();
    }
    /**
     * Add static data to the R2R Operator which will be used in the query execution
     * In case there are some quads which are present in each of the relation to be executed, it is better to add them as static data
     * and therefore save space and the amount of data to be processed.
     * @param {Quad} quad - The quad to be added as static data.
     */
    addStaticData(quad) {
        this.staticData.add(quad);
    }
    /**
     * Execute the R2R Operator on the given container of quads.
     * @param {QuadContainer} container - The container of quads on which the operator is to be executed. The container contains a set of quads.
     * @returns {Promise<any>} - The promise of the result of the query execution.
     */
    execute(container) {
        return __awaiter(this, void 0, void 0, function* () {
            const store = new N3.Store();
            for (const elem of container.elements) {
                store.addQuad(elem);
            }
            for (const elem of this.staticData) {
                store.addQuad(elem);
            }
            const myEngine = new QueryEngine();
            return yield myEngine.queryBindings(this.query, {
                sources: [store],
                extensionFunctions: {
                    'http://extension.org/functions#sqrt'(args) {
                        const arg = args[0];
                        if (arg.termType === 'Literal') {
                            return DF.literal(Math.sqrt(Number(arg.value)).toString());
                        }
                    },
                    'http://extension.org/functions#pow'(args) {
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
        });
    }
}
exports.R2ROperator = R2ROperator;
