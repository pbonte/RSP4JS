import { DataFactory, Quad } from "n3";
const { namedNode, literal, defaultGraph, quad } = DataFactory;
import { CSPARQLWindow, ReportStrategy, Tick, WindowInstance, QuadContainer, computeWindowIfAbsent } from './s2r';

/**
 * Generate data for the test cases.
 * @param {number} num_events - The number of events to generate.
 * @param {CSPARQLWindow} csparqlWindow - The CSPARQL Window to which the data is to be added.
 * @returns {void} - Returns nothing.
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


    test('check if event is late', () => {
        window.add(quad1, 1);
        window.set_current_time(8);
        expect(window.if_event_late(2)).toBe(true);
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

    test('should update the watermark', () => {
        expect(window.get_current_watermark()).toBe(0);
        window.update_watermark(10);
        expect(window.get_current_watermark()).toBe(10);
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

describe('CSPARQL Window Watermark Test', () => {
    let csparqlWindow: CSPARQLWindow;
    let window1: WindowInstance;
    let window2: WindowInstance;
    let quadContainer1: QuadContainer;
    let quadContainer2: QuadContainer;
    let quad1: Quad;

    beforeEach(() => {
        quad1 = {} as Quad

        csparqlWindow = new CSPARQLWindow('testWindow', 10, 5, ReportStrategy.OnWindowClose, Tick.TimeDriven, 0, 5);
        window1 = new WindowInstance(0, 10);
        window2 = new WindowInstance(5, 15);
        quadContainer1 = new QuadContainer(new Set<Quad>([quad1]), 5);
        quadContainer2 = new QuadContainer(new Set<Quad>([quad1]), 11);
        csparqlWindow.active_windows.set(window1, quadContainer1);
        csparqlWindow.active_windows.set(window2, quadContainer2);
    });

    afterEach(() => {
        csparqlWindow.set_current_watermark(0);
    });

    it('should evict windows out of the watermark', () => {
        csparqlWindow.update_watermark(25);
        expect(csparqlWindow.active_windows.has(window1)).toBeFalsy();
        expect(csparqlWindow.active_windows.has(window2)).toBeFalsy();
        expect(csparqlWindow.active_windows.size).toBe(0);
    });

    it('should not evict windows within the watermark', () => {
        csparqlWindow.set_current_watermark(0);
        expect(csparqlWindow.active_windows.has(window1)).toBeTruthy();
        expect(csparqlWindow.active_windows.has(window2)).toBeTruthy();
    });

    it('should not evict windows if the current watermark is still under the decided max delay allowed', () => {
        csparqlWindow.update_watermark(10);
        expect(csparqlWindow.active_windows.has(window1)).toBeTruthy();
        expect(csparqlWindow.active_windows.has(window2)).toBeTruthy();
    });
});



describe('CSPARQLWindow emit_on_trigger', () => {
    let csparqlWindow: CSPARQLWindow;
    let quad1: Quad;
    let window1: WindowInstance;
    let quadContainer1: QuadContainer;

    beforeEach(() => {
        quad1 = {} as Quad;
        csparqlWindow = new CSPARQLWindow('testWindow', 10, 5, ReportStrategy.OnWindowClose, Tick.TimeDriven, 0, 5);
        window1 = new WindowInstance(0, 10);
        quadContainer1 = new QuadContainer(new Set<Quad>([quad1]), 5);
        csparqlWindow.active_windows.set(window1, quadContainer1);
        csparqlWindow.pending_triggers.add(window1);
    });

    it('should emit the correct content when the window is triggered', () => {
        const emitSpy = jest.spyOn(csparqlWindow.emitter, 'emit');
        csparqlWindow.set_current_watermark(15);
        expect(emitSpy).toHaveBeenCalledWith('RStream', quadContainer1);
    });

    it('should not emit if the window has no content', () => {
        const emit_spy = jest.spyOn(csparqlWindow.emitter, 'emit');
        csparqlWindow.active_windows.delete(window1); // Remove the content from the window
        expect(emit_spy).not.toHaveBeenCalled();
    });

    it('should emit only if the window has not already triggered', () => {
        const emit_spy = jest.spyOn(csparqlWindow.emitter, 'emit');
        window1.has_triggered = true; // Set the window to already triggered
        expect(emit_spy).not.toHaveBeenCalled();
    });

    it('should clear pending triggers once the window is emitted for processing by the R2R operator', () => {
        expect(csparqlWindow.pending_triggers.size).toBe(0);
    })

    it('should handle different report strategies', () => {
        csparqlWindow.report = ReportStrategy.OnContentChange;
        const emit_spy = jest.spyOn(csparqlWindow.emitter, 'emit');
        expect(emit_spy).toHaveBeenCalledWith('RStream', quadContainer1);
    });
});


describe('CSPARQLWindow get quads from active windows', () => {
    let csparqlWindow: CSPARQLWindow;
    let quad1: Quad;
    let window1: WindowInstance;
    let quadContainer1: QuadContainer;
    let window2: WindowInstance;
    let quadContainer2: QuadContainer;

    beforeEach(() => {
        quad1 = {} as Quad;

        csparqlWindow = new CSPARQLWindow('testWindow', 10, 5, ReportStrategy.OnWindowClose, Tick.TimeDriven, 0, 5);
        window1 = new WindowInstance(0, 10);
        quadContainer1 = new QuadContainer(new Set<Quad>([quad1]), 9);
        window2 = new WindowInstance(5, 15);
        quadContainer2 = new QuadContainer(new Set<Quad>([quad1]), 9);

        csparqlWindow.active_windows.set(window1, quadContainer1);
        csparqlWindow.active_windows.set(window2, quadContainer2);
    });

    it('should return the correct content from the active windows', () => {
        const target_window = new WindowInstance(0, 10);
    });

    it('should return undefined if no matching window is found', () => {
        const target_window = new WindowInstance(10, 20);
    });

    it('should add a window to pending triggers', () => {
        csparqlWindow.add(quad1, 2);
    });
});


describe(`CSPARQLWindow computing window instances`, () => {
    const existing_windows: Map<WindowInstance, QuadContainer> = new Map<WindowInstance, QuadContainer>();
    const window1 = new WindowInstance(-10, 0);
    const window2 = new WindowInstance(0, 10);
    const window3 = new WindowInstance(5, 15);
    const window4 = new WindowInstance(10, 20);
    const window5 = new WindowInstance(15, 25);

    existing_windows.set(window1, new QuadContainer(new Set<Quad>(), 0));
    existing_windows.set(window2, new QuadContainer(new Set<Quad>(), 1));
    existing_windows.set(window3, new QuadContainer(new Set<Quad>(), 2));
    existing_windows.set(window4, new QuadContainer(new Set<Quad>(), 3));

    let csparqlWindow: CSPARQLWindow;
    let quad1 = quad(
        namedNode('https://rsp.js/test_subject_0'),
        namedNode('http://rsp.js/test_property'),
        namedNode('http://rsp.js/test_object'),
        defaultGraph(),
    );
    csparqlWindow = new CSPARQLWindow('testWindow', 10, 5, ReportStrategy.OnWindowClose, Tick.TimeDriven, 0, 5);
    csparqlWindow.active_windows = existing_windows;

    it('should return the correct window instance for the given time', () => {
        console.log(window1);
    });

    it('should_return_true_if_window_already_exists', () => {
        let if_window_is_computed = computeWindowIfAbsent(csparqlWindow.active_windows, window4, () => new QuadContainer(new Set<Quad>(), 0));
        expect(if_window_is_computed).toBe(true);
    });

    it('should_return_false_if_window_doesnt_exist', () => {
        let if_window_is_computed = computeWindowIfAbsent(csparqlWindow.active_windows, window5, () => new QuadContainer(new Set<Quad>(), 0));
        expect(if_window_is_computed).toBe(false);
    });

    it('scope_event', () => {
        csparqlWindow.scope(0);
        console.log(csparqlWindow.active_windows.size);
        csparqlWindow.add(quad1, 0);
        csparqlWindow.add(quad1, 1);
        csparqlWindow.add(quad1, 2);
        csparqlWindow.add(quad1, 3);
        csparqlWindow.add(quad1, 4);
        csparqlWindow.add(quad1, 5);
        csparqlWindow.add(quad1, 6);
        csparqlWindow.add(quad1, 7);
        csparqlWindow.add(quad1, 8);
        csparqlWindow.add(quad1, 9);
        csparqlWindow.add(quad1, 10);
        console.log(csparqlWindow.active_windows.size);
        csparqlWindow.add(quad1, 11);
        csparqlWindow.add(quad1, 12);
        csparqlWindow.add(quad1, 13);
        csparqlWindow.add(quad1, 14);
        csparqlWindow.add(quad1, 15);
        csparqlWindow.add(quad1, 16);
        csparqlWindow.add(quad1, 17);
        csparqlWindow.add(quad1, 18);
        console.log(csparqlWindow.active_windows.size);
        csparqlWindow.add(quad1, 19);
        csparqlWindow.add(quad1, 20);
        csparqlWindow.scope(1000);
        console.log(csparqlWindow.active_windows.size);
        console.log(csparqlWindow.active_windows);
        csparqlWindow.scope(2000);
        console.log(csparqlWindow.active_windows);
    });

})


describe('Quad Container Test Suite', () => {
    test('add_to_quad_container', () => {
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
        const quad_container = new QuadContainer(new Set<Quad>(), 0);
        quad_container.add(quad1, 0);
        quad_container.add(quad2, 1);
        expect(quad_container.len()).toBe(2);
    });

    test('add_to_container_same_time', () => {
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
        const quad3 = quad(
            namedNode('https://rsp.js/test_subject_0'),
            namedNode('http://rsp.js/test_property2'),
            namedNode('http://rsp.js/test_object2'),
        )
        const quad4 = quad(
            namedNode('https://rsp.js/test_subject_0'),
            namedNode('http://rsp.js/test_property3'),
            namedNode('http://rsp.js/test_object3'),
        );
        const quad_container = new QuadContainer(new Set<Quad>(), 0);
        quad_container.add(quad1, 0);
        quad_container.add(quad2, 0);
        quad_container.add(quad3, 0);
        quad_container.add(quad4, 0);
        expect(quad_container.len()).toBe(4);
        const active_windows = new Map<WindowInstance, QuadContainer>();
        const window1 = new WindowInstance(0, 10);
        active_windows.set(window1, quad_container);
        const window_content = active_windows.get(window1);
        expect(window_content).toBeDefined();
        if (window_content) {
            expect(window_content.len()).toBe(4);
        }
    });
});

/**
 * Check if the set contains the window instance.
 * @param {Set<WindowInstance>} set - The set of window instances.
 * @param {WindowInstance} window - The window instance to check.
 * @returns {boolean} - True if the window instance is in the set, false otherwise.
 */
function hasWindowInstance(set: Set<WindowInstance>, window: WindowInstance) {
    for (const elem of set) {
        if (elem.open === window.open && elem.close === window.close) {
            return true;
        }
    }
    return false;
}