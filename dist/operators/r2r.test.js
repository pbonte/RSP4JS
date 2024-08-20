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
const s2r_1 = require("./s2r");
const N3 = require('n3');
const { DataFactory } = N3;
const { namedNode, literal, defaultGraph, quad } = DataFactory;
const r2r_1 = require("./r2r");
const rspql_1 = require("../rspql");
test('test_query_engine', () => __awaiter(void 0, void 0, void 0, function* () {
    const r2r = new r2r_1.R2ROperator(`SELECT * WHERE { ?s ?p ?o }`);
    const quad1 = quad(namedNode('https://rsp.js/test_subject_0'), namedNode('http://rsp.js/test_property'), namedNode('http://rsp.js/test_object'), defaultGraph());
    const quad2 = quad(namedNode('https://rsp.js/test_subject_1'), namedNode('http://rsp.js/test_property'), namedNode('http://rsp.js/test_object'), defaultGraph());
    const quadSet = new Set();
    quadSet.add(quad1);
    quadSet.add(quad2);
    const container = new s2r_1.QuadContainer(quadSet, 0);
    const bindingsStream = yield r2r.execute(container);
    const resuults = new Array();
    // @ts-ignore
    bindingsStream.on('data', (binding) => {
        console.log(binding.toString()); // Quick way to print bindings for testing
        resuults.push(binding.toString());
    });
    bindingsStream.on('end', () => {
        // The data-listener will not be called anymore once we get here.
        expect(resuults.length).toBe(2);
    });
}));
test('test_query_engine_with_extension_functions', () => __awaiter(void 0, void 0, void 0, function* () {
    const r2r = new r2r_1.R2ROperator(`
        PREFIX extension: <http://extension.org/functions#>
        SELECT (extension:sqrt(?o) as ?sqrt) (extension:pow(?o,2) as ?pow) WHERE { ?s ?p ?o }`);
    const quad1 = quad(namedNode('https://rsp.js/test_subject_0'), namedNode('http://rsp.js/test_property'), literal('4'), defaultGraph());
    const quad2 = quad(namedNode('https://rsp.js/test_subject_1'), namedNode('http://rsp.js/test_property'), literal('9'), defaultGraph());
    const quadSet = new Set();
    quadSet.add(quad1);
    quadSet.add(quad2);
    const container = new s2r_1.QuadContainer(quadSet, 0);
    const bindingsStream = yield r2r.execute(container);
    const results = new Array();
    // @ts-ignore
    bindingsStream.on('data', (binding) => {
        console.log(binding);
        results.push(binding);
    });
    bindingsStream.on('end', () => {
        // The data-listener will not be called anymore once we get here.
        expect(results.length).toBe(2);
    });
}));
test.skip('test_with_huge_quad_data', () => __awaiter(void 0, void 0, void 0, function* () {
    const location_one = "http://n078-03.wall1.ilabt.imec.be:3000/pod1/acc-x/";
    const location_two = "http://n078-03.wall1.ilabt.imec.be:3000/pod1/acc-x/";
    const location_three = "http://n078-03.wall1.ilabt.imec.be:3000/pod1/acc-x/";
    let rspql_query = `
    PREFIX : <https://rsp.js/>
    PREFIX saref: <https://saref.etsi.org/core/>
    PREFIX dahccsensors: <https://dahcc.idlab.ugent.be/Homelab/SensorsAndActuators/>
    PREFIX func: <http://extension.org/functions#>
    REGISTER RStream <output> AS
    SELECT (func:sqrt(?o * ?o + ?o2 * ?o2 + ?o3 * ?o3) AS ?activityIndex)
    FROM NAMED WINDOW :w1 ON STREAM <${location_one}> [RANGE 6000 STEP 2000]
    FROM NAMED WINDOW :w2 ON STREAM <${location_two}> [RANGE 6000 STEP 2000]
    FROM NAMED WINDOW :w3 ON STREAM <${location_three}> [RANGE 6000 STEP 2000]

    WHERE {
        WINDOW :w1 { 
            ?s1 saref:hasValue ?o .
            ?s1 saref:relatesToProperty dahccsensors:wearable.acceleration.x .
        }
    }`;
    let rspql_parser = new rspql_1.RSPQLParser();
    let parsed_query = rspql_parser.parse(rspql_query);
    let r2r = new r2r_1.R2ROperator(parsed_query.sparql);
    let quad_set = new Set();
    let number_of_quads = 3000;
    for (let i = 0; i < number_of_quads; i++) {
        for (let j = 0; j < 3; j++) {
            const stream_element = quad(namedNode('https://rsp.js/test_subject_' + i), namedNode('https://saref.etsi.org/core/hasValue'), literal(`${Math.random() * 10}`, namedNode('http://www.w3.org/2001/XMLSchema#integer')), namedNode(`https://rsp.js/w${j}`));
            const stream_element2 = quad(namedNode('https://rsp.js/test_subject_' + i), namedNode('https://saref.etsi.org/core/relatesToProperty'), namedNode('https://dahcc.idlab.ugent.be/Homelab/SensorsAndActuators/wearable.acceleration.x'), namedNode(`https://rsp.js/w${j}`));
            quad_set.add(stream_element);
            quad_set.add(stream_element2);
        }
    }
    let quad_container = new s2r_1.QuadContainer(quad_set, 0);
    let bindings_stream = yield r2r.execute(quad_container);
    bindings_stream.on('data', (binding) => {
        console.log(`Binding: ${binding.toString()}`);
    });
}));
