import { RDFStream, RSPEngine } from "./rsp";
const N3 = require('n3');

const { DataFactory } = N3;
const { namedNode, defaultGraph, quad } = DataFactory;

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
function generate_data2(num_events: number, rdfStream: RDFStream) {
    for (let i = 0; i < num_events; i++) {
        const stream_element = quad(
            namedNode('https://rsp.js/test_subject_' + i),
            namedNode('http://rsp.js/test_property2'),
            namedNode('http://rsp.js/test_object2'),
            defaultGraph(),
        );
        rdfStream.add(stream_element, i);
    }
}
test('rsp_consumer_test', async () => {
    let query = `PREFIX : <https://rsp.js/>
    REGISTER RStream <output> AS
    SELECT *
    FROM NAMED WINDOW :w1 ON STREAM :stream1 [RANGE 10 STEP 2]
    WHERE{
        WINDOW :w1 { ?s ?p ?o}
    }`;

    let rspEngine = new RSPEngine();
    rspEngine.addQuery(query);
    let stream = rspEngine.get_stream(query, "https://rsp.js/stream1");
    let emitter = rspEngine.register(query);
    let results = new Array<string>();
    // @ts-ignore
    emitter.on('RStream', (object) => {
        console.log("received results");
        results.push(object.bindings.toString());
    });
    if (stream) {
        generate_data(10, [stream]);
    }

    // @ts-ignore
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    await sleep(2000);


    expect(results.length).toBe(2 + 4 + 6 + 8);
    console.log(results);
});
test('rsp_multiple_same_window_test', async () => {
    let query = `PREFIX : <https://rsp.js/>
    REGISTER RStream <output> AS
    SELECT *
    FROM NAMED WINDOW :w1 ON STREAM :stream1 [RANGE 10 STEP 2]
    FROM NAMED WINDOW :w2 ON STREAM :stream2 [RANGE 10 STEP 2]

    WHERE{
        WINDOW :w1 { ?s ?p ?o}
        WINDOW :w2 { ?s ?p ?o}
    }`;

    let rspEngine = new RSPEngine();
    rspEngine.addQuery(query);
    let stream1 = rspEngine.get_stream(query, "https://rsp.js/stream1");
    let stream2 = rspEngine.get_stream(query, "https://rsp.js/stream2");

    let emitter = rspEngine.register(query);
    let results = new Array<string>();
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
    let query = `PREFIX : <https://rsp.js/>
    REGISTER RStream <output> AS
    SELECT *
    FROM NAMED WINDOW :w1 ON STREAM :stream1 [RANGE 10 STEP 2]
    FROM NAMED WINDOW :w2 ON STREAM :stream2 [RANGE 20 STEP 10]

    WHERE{
        WINDOW :w1 { ?s ?p ?o}
        WINDOW :w2 { ?s ?p2 ?o2}
    }`;

    let rspEngine = new RSPEngine();
    rspEngine.addQuery(query);
    let stream1 = rspEngine.get_stream(query, "https://rsp.js/stream1");
    let stream2 = rspEngine.get_stream(query, "https://rsp.js/stream2");

    let emitter = rspEngine.register(query);
    let results = new Array<string>();
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
    let query = `PREFIX : <https://rsp.js/>
    REGISTER RStream <output> AS
    SELECT *
    FROM NAMED WINDOW :w1 ON STREAM :stream1 [RANGE 10 STEP 2]

    WHERE{
        ?o :hasInfo :someInfo.
        WINDOW :w1 { ?s ?p ?o}
    }`;

    let rspEngine = new RSPEngine();
    rspEngine.addQuery(query);
    let emitter = rspEngine.register(query);
    const static_data = quad(
        namedNode('http://rsp.js/test_object'),
        namedNode('https://rsp.js/hasInfo'),
        namedNode('https://rsp.js/someInfo'),
        defaultGraph(),
    );
    rspEngine.add_static_data(query, static_data);

    let stream1 = rspEngine.get_stream(query, "https://rsp.js/stream1");

    let results = new Array<string>();
    // @ts-ignore    

    emitter.on('RStream', (object) => {
        console.log("received results");
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
    let query = `PREFIX : <https://rsp.js/>
    REGISTER RStream <output> AS
    SELECT *
    FROM NAMED WINDOW :w1 ON STREAM :stream1 [RANGE 10 STEP 2]

    WHERE{
        ?o :hasInfo :someInfo.
        WINDOW :w1 { ?s ?p ?o}
    }`;

    let rspEngine = new RSPEngine();
    rspEngine.addQuery(query);
    let streams_registered = rspEngine.get_all_streams(query);
    if (streams_registered) {
        expect(streams_registered.length).toBe(1);
        expect(streams_registered[0]).toBe("https://rsp.js/stream1");
    }
});

test('test_two_different_queries', async () => {
    let query_one = `PREFIX : <https://rsp.js/>
    REGISTER RStream <output_one> AS
    SELECT *
    FROM NAMED WINDOW :w1 ON STREAM :stream1 [RANGE 10 STEP 2]

    WHERE{
        ?o :hasInfo :someInfo.
        WINDOW :w1 { ?s ?p ?o}
    }`;

    let query_two = `PREFIX : <https://rsp.js/>
    REGISTER RStream <output_two> AS
    SELECT ?s ?p ?o
    FROM NAMED WINDOW :w2 ON STREAM :stream2 [RANGE 5 STEP 1]

    WHERE{
        ?o :hasInfo :someInfo.
        WINDOW :w2 { ?s ?p ?o}
    }`;

    let rspEngine = new RSPEngine();
    rspEngine.addQuery(query_one);
    rspEngine.addQuery(query_two);

    let stream1 = rspEngine.get_stream(query_one, "https://rsp.js/stream1");
    let stream2 = rspEngine.get_stream(query_two, "https://rsp.js/stream2");

    let emitter1 = rspEngine.register(query_one);
    let emitter2 = rspEngine.register(query_two);

    let resultsOne: any[] = [];
    let resultsTwo: any[] = [];

    if (emitter1 && emitter2) {
        emitter1.on('RStream', (object) => {
            console.log("received results from query one");
            console.log(object);
            
            resultsOne.push(object.bindings.toString());
        });

        emitter2.on('RStream', (object) => {
            console.log("received results from query two");
            console.log(object);
            
            resultsTwo.push(object.bindings.toString());
        });

        if (stream1) {
            generate_data(10, [stream1]);
        }

        if (stream2) {
            generate_data(5, [stream2]);
        }

        // @ts-ignore
        const sleep = (ms) => new Promise(r => setTimeout(r, ms));
        await sleep(2000);

        // Asserting the length of results from query one
        expect(resultsOne.length).toBe(2 + 4 + 6 + 8);
        expect(resultsTwo.length).toBe(1 + 2 + 3 + 4 + 5);
        console.log("Results from query one:", resultsOne);
        console.log("Results from query two:", resultsTwo);
    }
});
