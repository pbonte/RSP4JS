import { RDFStream, RSPEngine } from "./rsp";
const N3 = require('n3');
const { DataFactory } = N3;
const { namedNode, defaultGraph, quad, literal } = DataFactory;

/**
 * Generate data for the test.
 * @param {number} num_events - The number of events to generate.
 * @param {RDFStream[]} rdfStreams - The RDF Streams to which the data is to be added.
 * @returns {void} - The data generation.
 */
function generate_data(num_events: number, rdfStreams: RDFStream[]) {
    for (let i = 0; i < num_events; i++) {
        rdfStreams.forEach((stream) => {
            const stream_element = quad(
                namedNode('https://rsp.js/test_subject_' + i),
                namedNode('http://rsp.js/test_property'),
                namedNode('http://rsp.js/test_object'),
                defaultGraph(),
            );
            stream.add(stream_element, i);
        });
    }
}
/**
 * Generate data for the test.
 * @param {number} num_events - The number of events to generate.
 * @param {RDFStream} rdfStream - The RDF Stream to which the data is to be added.
 * @returns {Promise<void>} - The promise of the data generation.
 */
async function generate_data2(num_events: number, rdfStream: RDFStream) {
    for (let i = 0; i < num_events; i++) {
        const stream_element = quad(
            namedNode('https://rsp.js/test_subject2_' + i),
            namedNode('http://rsp.js/test_property2'),
            namedNode('http://rsp.js/test_object2'),
            defaultGraph(),
        );
        rdfStream.add(stream_element, i);
    }
}
test('rsp_consumer_test', async () => {
    const query = `PREFIX : <https://rsp.js/>
    REGISTER RStream <output> AS
    SELECT *
    FROM NAMED WINDOW :w1 ON STREAM :stream1 [RANGE 10 STEP 2]
    WHERE {
        WINDOW :w1 { ?s ?p ?o}
    }`;

    const rspEngine = new RSPEngine(query);
    const stream = rspEngine.getStream("https://rsp.js/stream1");
    const emitter = rspEngine.register();
    const results = new Array<string>();
    // @ts-ignore
    emitter.on('RStream', (object) => {
        console.log(`received result ${object.bindings.toString()}`);
        results.push(object.bindings.toString());
    });

    if (stream) {
        generate_data(10, [stream]);
    }

    // @ts-ignore
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    await sleep(2000);

    expect(results.length).toBe(2 + 4 + 6 + 8);
});
test('rsp_multiple_same_window_test', async () => {
    const query = `PREFIX : <https://rsp.js/>
    REGISTER RStream <output> AS
    SELECT *
    FROM NAMED WINDOW :w1 ON STREAM :stream1 [RANGE 10 STEP 2]
    FROM NAMED WINDOW :w2 ON STREAM :stream2 [RANGE 10 STEP 2]

    WHERE{
        WINDOW :w1 { ?s ?p ?o}
        WINDOW :w2 { ?s ?p ?o}
    }`;

    const rspEngine = new RSPEngine(query);
    const stream1 = rspEngine.getStream("https://rsp.js/stream1");
    const stream2 = rspEngine.getStream("https://rsp.js/stream2");

    const emitter = rspEngine.register();
    const results = new Array<string>();

    console.log(rspEngine.get_all_streams());

    // @ts-ignore
    emitter.on('RStream', (object) => {
        console.log("received results");
        results.push(object.bindings.toString());
    });
    if (stream1 && stream2) {
        generate_data(10, [stream1, stream2]);
    }

    // @ts-ignore
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    await sleep(1000);


    expect(results.length).toBe(2 * (2 + 4 + 6 + 8));
    console.log(results);
});

test('rsp_multiple_difff_window_test', async () => {
    const query = `PREFIX : <https://rsp.js/>
    REGISTER RStream <output> AS
    SELECT *
    FROM NAMED WINDOW :w1 ON STREAM :stream1 [RANGE 10 STEP 2]
    FROM NAMED WINDOW :w2 ON STREAM :stream2 [RANGE 20 STEP 10]

    WHERE{
        WINDOW :w1 { ?s ?p ?o}
        WINDOW :w2 { ?s ?p2 ?o2}
    }`;

    const rspEngine = new RSPEngine(query);
    const stream1 = rspEngine.getStream("https://rsp.js/stream1");
    const stream2 = rspEngine.getStream("https://rsp.js/stream2");

    const emitter = rspEngine.register();
    const results = new Array<string>();
    // @ts-ignore
    emitter.on('RStream', (object) => {
        console.log("received results");
        results.push(object.bindings.toString());
    });
    if (stream1 && stream2) {
        for (let i = 0; i < 10; i++) {
            const stream_element = quad(
                namedNode('https://rsp.js/test_subject_' + i),
                namedNode('http://rsp.js/test_property'),
                namedNode('http://rsp.js/test_object'),
                defaultGraph(),
            );
            stream1.add(stream_element, i);
            const stream_element2 = quad(
                namedNode('https://rsp.js/test_subject_' + i),
                namedNode('http://rsp.js/test_property2'),
                namedNode('http://rsp.js/test_object2'),
                defaultGraph(),
            );
            stream2.add(stream_element2, i);
        }
    }

    // @ts-ignore
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    await sleep(2000);


    expect(results.length).toBe(2 + 4 + 6 + 8);
    console.log(results);
});
test('rsp_static_plus_window_test', async () => {
    const query = `PREFIX : <https://rsp.js/>
    REGISTER RStream <output> AS
    SELECT *
    FROM NAMED WINDOW :w1 ON STREAM :stream1 [RANGE 10 STEP 2]

    WHERE{
        ?o :hasInfo :someInfo.
        WINDOW :w1 { ?s ?p ?o}
    }`;

    const rspEngine = new RSPEngine(query);
    const static_data = quad(
        namedNode('http://rsp.js/test_object'),
        namedNode('https://rsp.js/hasInfo'),
        namedNode('https://rsp.js/someInfo'),
        defaultGraph(),
    );
    rspEngine.addStaticData(static_data);

    const stream1 = rspEngine.getStream("https://rsp.js/stream1");

    const emitter = rspEngine.register();
    const results = new Array<string>();
    // @ts-ignore
    emitter.on('RStream', (object) => {
        console.log(`received result: ${object.bindings.toString()}`);
        results.push(object.bindings.toString());
    });
    if (stream1) {
        generate_data(10, [stream1]);
    }

    // @ts-ignore
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    await sleep(1000);


    expect(results.length).toBe(2 + 4 + 6 + 8);
    console.log(results);
});

test('test_get_all_streams', () => {
    const query = `PREFIX : <https://rsp.js/>
    REGISTER RStream <output> AS
    SELECT *
    FROM NAMED WINDOW :w1 ON STREAM :stream1 [RANGE 10 STEP 2]

    WHERE{
        ?o :hasInfo :someInfo.
        WINDOW :w1 { ?s ?p ?o}
    }`;

    const rspEngine = new RSPEngine(query);
    const streams_registered = rspEngine.get_all_streams();
    expect(streams_registered.length).toBe(1);
    expect(streams_registered[0]).toBe("https://rsp.js/stream1");
})


test('test_out_of_order_event_processing', async () => {
    const query = `PREFIX : <https://rsp.js/>
    REGISTER RStream <output> AS
    SELECT *
    FROM NAMED WINDOW :w1 ON STREAM :stream1 [RANGE 10 STEP 2]
    WHERE{
        WINDOW :w1 { ?s ?p ?o}
    }`;

    const rspEngine = new RSPEngine(query);
    const stream = rspEngine.getStream("https://rsp.js/stream1");
    const emitter = rspEngine.register();
    const results = new Array<string>();
    emitter.on('RStream', (object: any) => {
        console.log("received results");
        results.push(object.bindings.toString());
    });
    // @ts-ignore
    if (stream) {
        generate_data(10, [stream]);
    }

    if (stream) {
        await generate_data2(10, stream);
    }
    // expect(results.length).toBe(2 + 4 + 6 + 8 + 2 + 4 + 6 + 8);
    console.log(results.length);
});

test('test setting the max delay for out of order events', async () => {
    const query = `PREFIX : <https://rsp.js/>
    REGISTER RStream <output> AS
    SELECT *
    FROM NAMED WINDOW :w1 ON STREAM :stream1 [RANGE 10 STEP 2]
    WHERE{
        WINDOW :w1 { ?s ?p ?o}
    }`;

    const rsp_engine = new RSPEngine(query);
    expect(rsp_engine.max_delay).toBe(0);
    const rsp_engine_2 = new RSPEngine(query, {
        max_delay: 1000,
        time_to_trigger_processing_late_elements: 60000
    });
    expect(rsp_engine_2.max_delay).toBe(1000);
});


test('test out of order processing with different delays', async () => {
    const query = `
    PREFIX : <https://rsp.js/>
    REGISTER RStream <output> AS
    SELECT *
    FROM NAMED WINDOW :w1 ON STREAM :stream1 [RANGE 10 STEP 2]
    WHERE{
        WINDOW :w1 { ?s ?p ?o}
    }
    `;

    const rsp_engine = new RSPEngine(query);
    const stream = rsp_engine.getStream("https://rsp.js/stream1");
    const emitter = rsp_engine.register();
    const results = new Array<string>();

    const event = quad(
        namedNode(`https://rsp.js/test_subject`),
        namedNode('http://rsp.js/test_property'),
        namedNode('http://rsp.js/test_object'),
        defaultGraph()
    )

    emitter.on('RStream', (object: any) => {
        results.push(object.bindings.toString());
    });

    if (stream) {
        stream.add(event, 0);
        stream.add(event, 3);
        stream.add(event, 1);
        stream.add(event, 2);
        stream.add(event, 4);
    }

    const sleep = (ms: any) => new Promise(r => setTimeout(r, ms));
    await sleep(2000);

    expect(results.length).toBeGreaterThan(0);
    console.log(results);
});


test('test ooo event processing with varying delay settings', async () => {
    jest.setTimeout(100000);
    const query = `
    PREFIX : <https://rsp.js/>
    REGISTER RStream <output> AS
    SELECT *
    FROM NAMED WINDOW :w1 ON STREAM :stream1 [RANGE 10 STEP 2]
    WHERE{
        WINDOW :w1 { ?s ?p ?o}
    }
    `;


    const rsp_engine = new RSPEngine(query, {
        max_delay: 1000,
        time_to_trigger_processing_late_elements: 1000
    });
    const stream = rsp_engine.getStream("https://rsp.js/stream1");
    const emitter = rsp_engine.register();
    const results = new Array<string>();

    const event = quad(
        namedNode(`https://rsp.js/test_subject`),
        namedNode('http://rsp.js/test_property'),
        namedNode('http://rsp.js/test_object'),
        defaultGraph()
    )

    emitter.on('RStream', (object: any) => {
        results.push(object.bindings.toString());
    });
    const sleep = (ms: any) => new Promise(r => setTimeout(r, ms));

    if (stream) {
        stream.add(event, 0);
        stream.add(event, 3);
        stream.add(event, 1);
        stream.add(event, 2);
        stream.add(event, 4);
        stream.add(event, 5);
        stream.add(event, 6);
        stream.add(event, 7);
        stream.add(event, 8);
        stream.add(event, 9);
        stream.add(event, 7);
    }
    await sleep(2000);

    expect(results.length).toBeGreaterThan(0);
    console.log(results);
})

describe.skip('test the rsp engine with out of order processing with various data frequency', () => {
    const location_one = "http://n078-03.wall1.ilabt.imec.be:3000/pod1/acc-x/";
    const location_two = "http://n078-03.wall1.ilabt.imec.be:3000/pod1/acc-y/";
    const location_three = "http://n078-03.wall1.ilabt.imec.be:3000/pod1/acc-z/";

    const query = `
    PREFIX : <https://rsp.js/>
    PREFIX saref: <https://saref.etsi.org/core/>
    PREFIX dahccsensors: <https://dahcc.idlab.ugent.be/Homelab/SensorsAndActuators/>
    PREFIX func: <http://extension.org/functions#>
    REGISTER RStream <output> AS
    SELECT ?o

    FROM NAMED WINDOW :w1 ON STREAM <${location_one}> [RANGE 6000 STEP 2000]
    FROM NAMED WINDOW :w2 ON STREAM <${location_two}> [RANGE 6000 STEP 2000]
    FROM NAMED WINDOW :w3 ON STREAM <${location_three}> [RANGE 6000 STEP 2000]

    WHERE {
        WINDOW :w1 { 
        ?s saref:hasValue ?o .
        ?s saref:relatesToProperty dahccsensors:wearable.acceleration.x .
        }
        WINDOW :w2 {
        ?s saref:hasValue ?o2 .
        ?s saref:relatesToProperty dahccsensors:wearable.acceleration.x .
        }
        WINDOW :w3 {
        ?s saref:hasValue ?o3 .
        ?s saref:relatesToProperty dahccsensors:wearable.acceleration.x .
        }
    }
    `;

    test('testing RSP Engine with 4Hz data frequency', async () => {
        jest.setTimeout(100000);
        const rsp_engine = new RSPEngine(query, {
            max_delay: 1000,
            time_to_trigger_processing_late_elements: 60000
        });
        const emitter = rsp_engine.register();
        const results = new Array<string>();

        const stream_x = await rsp_engine.getStream(location_one);
        const stream_y = await rsp_engine.getStream(location_two);
        const stream_z = await rsp_engine.getStream(location_three);

        if (stream_x && stream_y && stream_z) {
            const rdf_streams = [stream_x, stream_y, stream_z];
            generate_dummy_data(500, rdf_streams, 4);
        }

        emitter.on('RStream', (object: any) => {
            console.log(object.bindings.toString());
            results.push(object.bindings.toString());
        });

        await sleep(500000);
        console.log(results);

    });

});

/**
 * Generate dummy data for the test.
 * @param {number} number_of_events - The number of events to generate.
 * @param {RDFStream[]} rdf_streams - The RDF Streams to which the data is to be added.
 * @param {number} frequency - The frequency of the data to be generated.
 * @returns {Promise<void>} - The promise of the dummy data generation.
 */
async function generate_dummy_data(number_of_events: number, rdf_streams: RDFStream[], frequency: number) {
    let events_generated = 0;
    const sleep_interval = 1000 / frequency;

    while (events_generated < number_of_events) {
        rdf_streams.forEach((stream: any) => {
            if (events_generated < number_of_events) {
                const stream_element = quad(
                    namedNode('https://rsp.js/test_subject_' + events_generated),
                    namedNode('https://saref.etsi.org/core/hasValue'),
                    literal(`${Math.random() * 10}`, namedNode('http://www.w3.org/2001/XMLSchema#integer')),
                    defaultGraph(),
                );

                const stream_element_two = quad(
                    namedNode('https://rsp.js/test_subject_' + events_generated),
                    namedNode('https://saref.etsi.org/core/relatesToProperty'),
                    namedNode('https://dahcc.idlab.ugent.be/Homelab/SensorsAndActuators/wearable.acceleration.x'),
                    defaultGraph(),
                );

                const timestamp = Date.now();
                stream.add(stream_element, timestamp);
                stream.add(stream_element_two, timestamp);
                events_generated = events_generated + 1;
            }
        });

        await sleep(sleep_interval);
    }
}

/**
 * Sleep function.
 * @param {number} ms - The time to sleep in milliseconds.
 * @returns {Promise<any>} - The promise of the sleep function.
 */
function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}