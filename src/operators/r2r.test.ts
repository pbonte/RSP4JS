import { QuadContainer } from "./s2r";
const N3 = require('n3');

const { DataFactory } = N3;
const { namedNode, literal, defaultGraph, quad } = DataFactory;
// @ts-ignore
import { Quad } from 'n3';
import { R2ROperator } from "./r2r";

test('test_query_engine', async () => {
    const r2r = new R2ROperator(`SELECT * WHERE { ?s ?p ?o }`);
    const quad1 = quad(
        namedNode('https://rsp.js/test_subject_0'),
        namedNode('http://rsp.js/test_property'),
        namedNode('http://rsp.js/test_object'),
        defaultGraph(),
    );
    const quad2 = quad(
        namedNode('https://rsp.js/test_subject_1'),
        namedNode('http://rsp.js/test_property'),
        namedNode('http://rsp.js/test_object'),
        defaultGraph(),
    );
    const quadSet = new Set<Quad>();
    quadSet.add(quad1);
    quadSet.add(quad2);
    const container = new QuadContainer(quadSet, 0);
    const bindingsStream = await r2r.execute(container);
    const resuults = new Array<string>();
    // @ts-ignore
    bindingsStream.on('data', (binding) => {
        console.log(binding.toString()); // Quick way to print bindings for testing

        resuults.push(binding.toString());
    });
    bindingsStream.on('end', () => {
        // The data-listener will not be called anymore once we get here.
        expect(resuults.length).toBe(2);

    });
});

test('test_query_engine_with_extension_functions', async () => {
    const r2r = new R2ROperator(`
        PREFIX extension: <http://extension.org/functions#>
        SELECT (extension:sqrt(?o) as ?sqrt) (extension:pow(?o,2) as ?pow) WHERE { ?s ?p ?o }`);
    const quad1 = quad(
        namedNode('https://rsp.js/test_subject_0'),
        namedNode('http://rsp.js/test_property'),
        literal('4'),
        defaultGraph(),
    );
    const quad2 = quad(
        namedNode('https://rsp.js/test_subject_1'),
        namedNode('http://rsp.js/test_property'),
        literal('9'),
        defaultGraph(),
    );
    const quadSet = new Set<Quad>();
    quadSet.add(quad1);
    quadSet.add(quad2);
    const container = new QuadContainer(quadSet, 0);
    const bindingsStream = await r2r.execute(container);
    const results = new Array<string>();
    // @ts-ignore
    bindingsStream.on('data', (binding) => {
        results.push(binding);
    });

    bindingsStream.on('end', () => {
        // The data-listener will not be called anymore once we get here.
        expect(results.length).toBe(2);
    });

});