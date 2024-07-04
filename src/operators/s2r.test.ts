import { EventEmitter } from "events";
import { DataFactory, Quad } from "n3";
import { CSPARQLWindow, ReportStrategy, Tick, WindowInstance, QuadContainer } from './s2r';
const { namedNode, literal, defaultGraph, quad } = DataFactory;

/**
 *
 * @param num_events
 * @param csparqlWindow
 */
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

describe('CSPARQLWindow', () => {
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
        const content = new Set<Quad>;
        content.add(quad1);
        content.add(quad2);
        const container = new QuadContainer(content, 0);

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

        const csparqlWindow = new CSPARQLWindow(":window1", 10, 2, ReportStrategy.OnWindowClose, Tick.TimeDriven, 0, 60000);
        csparqlWindow.add(quad1, 0);
    });

    test('test_scope', () => {
        const csparqlWindow = new CSPARQLWindow(":window1", 10, 2, ReportStrategy.OnWindowClose, Tick.TimeDriven, 0, 60000);
        csparqlWindow.scope(4);

        const num_active_windows = csparqlWindow.active_windows.size;
        /**
         * Open windows:
         * [-6, 4)
         * [-4, 6)
         * [-2, 8)
         * [0, 10)
         * [2, 12)
         * [4, 14).
         */

        expect(num_active_windows).toBe(6);
    });

    test('test_evictions', () => {
        const csparqlWindow = new CSPARQLWindow(":window1", 10, 2, ReportStrategy.OnWindowClose, Tick.TimeDriven, 0, 60000);

        generate_data(10, csparqlWindow);

        expect(csparqlWindow.active_windows.size).toBe(5);
    });


    test('test_stream_consumer', () => {
        const recevied_data = new Array<QuadContainer>();
        const received_elementes = new Array<Quad>;
        const csparqlWindow = new CSPARQLWindow(":window1", 10, 2, ReportStrategy.OnWindowClose, Tick.TimeDriven, 0, 60000);
        // register window consumer
        csparqlWindow.subscribe('RStream', function (data: QuadContainer) {
            console.log('Foo raised, Args:', data);
            console.log('dat size', data.elements.size);
            recevied_data.push(data);
            data.elements.forEach(item => received_elementes.push(item));
        });
        // generate some data
        generate_data(10, csparqlWindow);

        expect(recevied_data.length).toBe(4);
        expect(received_elementes.length).toBe(2 + 4 + 6 + 8);

    });


    test('test_content_get', () => {
        const recevied_data = new Array<QuadContainer>();
        const received_elementes = new Array<Quad>;
        const csparqlWindow = new CSPARQLWindow(":window1", 10, 2, ReportStrategy.OnWindowClose, Tick.TimeDriven, 0, 60000);

        // generate some data
        generate_data(10, csparqlWindow);

        const content = csparqlWindow.getContent(10);
        expect(content).toBeDefined();
        if (content) {
            expect(content.elements.size).toBe(10);
        }
        const undefinedContent = csparqlWindow.getContent(20);
        expect(undefinedContent).toBeUndefined();
    });
});

describe('CSPARQLWindow OOO', () => {
    let window: CSPARQLWindow;
    const width = 10;
    const slide = 5;
    const startTime = 0;
    const maxDelay = 2;
    const quad1 = quad(DataFactory.blankNode(), DataFactory.namedNode('predicate'), DataFactory.literal('object1'));
    const quad2 = quad(DataFactory.blankNode(), DataFactory.namedNode('predicate'), DataFactory.literal('object2'));

    beforeEach(() => {
        window = new CSPARQLWindow('testWindow', width, slide, ReportStrategy.OnWindowClose, Tick.TimeDriven, startTime, maxDelay);
    });

    afterEach(() => {
        window.stop();
    });

    test('should initialize correctly', () => {
        expect(window.name).toBe('testWindow');
        expect(window.width).toBe(width);
        expect(window.slide).toBe(slide);
        expect(window.time).toBe(startTime);
        expect(window.max_delay).toBe(maxDelay);
    });

    test('should add element to the active window', () => {
        window.add(quad1, 1);
        const quadContainer = window.getContent(1);
        expect(quadContainer?.len()).toBe(1);
    });

    test('should buffer late elements', () => {
        window.add(quad1, 1);
        window.add(quad2, 0);
        expect(window.late_buffer.size).toBe(1);
        expect(window.late_buffer.get(0)?.has(quad2)).toBe(true);
    });

    test('should evict windows based on watermark', () => {
        window.add(quad1, 1);
        window.set_current_time(12);
        window.add(quad2, 12);
        const activeWindows = Array.from(window.active_windows.keys());
        expect(activeWindows.length).toBe(2);
        window.update_watermark(22);
        expect(window.active_windows.size).toBe(0);
    });

    test('should trigger event on window close', (done) => {
        window.subscribe('RStream', (data: QuadContainer) => {
            expect(data.len()).toBe(1);
            done();
        });
        let activeWindows = Array.from(window.active_windows.keys());
        window.add(quad1, 1);
        window.set_current_time(12);
        window.add(quad2, 12);
        expect(activeWindows.length).toBe(2);
        window.update_watermark(22);
        expect(activeWindows.length).toBe(0);
    });

    test('should process late elements', () => {
        window.add(quad1, 6);
        window.add(quad2, 4);  // Late element
        window.process_late_elements();
        const quadContainer = window.getContent(0);
        console.log(quadContainer);
        expect(quadContainer?.len()).toBe(1);
    });

    test('should update current time when adding a new element', () => {
        const initial_time = window.time;
        const new_time = initial_time + 10;
        window.add(quad1, new_time);
        expect(window.time).toBe(new_time);
    });

    test('should trigger on window change', (done) => {
        const report_window = new CSPARQLWindow('reportWindow', width, slide, ReportStrategy.OnWindowClose, Tick.TimeDriven, startTime, maxDelay);
        const callback = jest.fn((data: QuadContainer) => {
            console.log('Callback called');
            expect(data.len()).toBe(1);
            expect(data.elements.has(quad1)).toBeTruthy();
            done();
        });

        report_window.subscribe('RStream', callback);

        // Add first element to the window
        report_window.add(quad1, 1);        
        // Now moving the time forward to trigger the window close report strategy
        report_window.set_current_time(11);
        report_window.update_watermark(23);

        expect(callback).toHaveBeenCalledTimes(1);
    })
});
