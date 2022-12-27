import {CSPARQLWindow, QuadContainer, ReportStrategy, Tick, WindowDefinition} from './s2r';

const N3 = require('n3');

const { DataFactory } = N3;
const { namedNode, literal, defaultGraph, quad } = DataFactory;
// @ts-ignore
import {Quad} from 'n3';
function generate_data(num_events: number, csparqlWindow: CSPARQLWindow) {
    for (let i = 0; i < num_events; i++) {
        const stream_element = quad(
            namedNode('https://rsp.js/test_subject_' + i),
            namedNode('http://rsp.js/test_property'),
            namedNode('http://rsp.js/test_object'),
            defaultGraph(),
        );
        csparqlWindow.add(stream_element, i);
    }
}

test('create_graph_container', () => {
    const quad1 = quad(
        namedNode('https://ruben.verborgh.org/profile/#me'),
        namedNode('http://xmlns.com/foaf/0.1/givenName'),
        literal('Ruben', 'en'),
        defaultGraph(),
    );
    const quad2 = quad(
        namedNode('https://ruben.verborgh.org/profile/#me'),
        namedNode('http://xmlns.com/foaf/0.1/lastName'),
        literal('Verborgh', 'en'),
        defaultGraph(),
    );
    var content = new Set<Quad>;
    content.add(quad1);
    content.add(quad2);
    var container = new QuadContainer(content, 0);

    expect(container.len()).toBe(2);
    expect(container.last_time_changed()).toBe(0);
});



test('add_to_window', () => {
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

    var csparqlWindow = new CSPARQLWindow(10,2, ReportStrategy.OnWindowClose, Tick.TimeDriven, 0);

    csparqlWindow.add(quad,0);
});

test('test_scope', () => {
    var csparqlWindow = new CSPARQLWindow(10,2, ReportStrategy.OnWindowClose, Tick.TimeDriven, 0);
    csparqlWindow.scope(4);

    var num_active_windows = csparqlWindow.active_windows.size;
    /**
     * open windows:
     * [-6, 4)
     * [-4, 6)
     * [-2, 8)
     * [0, 10)
     * [2, 12)
     * [4, 14)
     */

    expect(num_active_windows).toBe(6);
});
test('test_evictions', () => {
    var csparqlWindow = new CSPARQLWindow(10,2, ReportStrategy.OnWindowClose, Tick.TimeDriven, 0);

    generate_data(10, csparqlWindow);

    expect(csparqlWindow.active_windows.size).toBe(5);
});

test('test_stream_consumer', () => {
   var recevied_data = new Array<QuadContainer>();
   var received_elementes = new Array<Quad>;
    var csparqlWindow = new CSPARQLWindow(10,2, ReportStrategy.OnWindowClose, Tick.TimeDriven, 0);
    // register window consumer
    csparqlWindow.subscribe('RStream',function (data: QuadContainer) {
        console.log('Foo raised, Args:', data);
        console.log('dat size', data.elements.size);
        recevied_data.push(data);
        data.elements.forEach(item => received_elementes.push(item));
    });
    // generate some data
    generate_data(10, csparqlWindow);

    expect(recevied_data.length).toBe(4);
    expect(received_elementes.length).toBe(2+4+6+8);

});
