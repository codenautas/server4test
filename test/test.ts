"use strict";

import { Server4Test, /*CONFIG_DEFAULT,*/ CONFIG_SUPER_INSECURE } from '../src/server4test';

import { BrowserTestReport, BROWSER_TEST_PAGE_PATH, BROWSER_TEST_RESULT_PATH, BROWSER_TEST_ASSERT_PATH, printBrowserTestReport, runBrowsers } from '../src/browser-runner';

import * as vm from 'vm';

import * as Path from 'path';

import * as assert from 'assert';

import { promises as fs } from 'fs';

// import {promises as fs} from 'fs'

// const TIMEOUT_SPEED = 1000 * (process.env.BP_TIMEOUT_SPEED as unknown as number ?? 1);

function console_log<T>(x:T){
    console.log('____________',x)
    return x;
}

if (!console_log) console.log('dummy');

describe("connected", function(){
    var server: Server4Test
    var port = 8088
    var path = "./example"
    before(async function(){
        server = new Server4Test({...CONFIG_SUPER_INSECURE, port, "public-dir": path})
        console.log("starting server")
        await server.start()
        console.log("server listeining in", port)
    })
    after(async function(){
        if (false) {
            this.timeout(600000)
            console.log();
            console.log("waiting in", process.cwd(), Path.join(process.cwd(), path))
            await new Promise((resolve)=>setTimeout(resolve, 600000))
        }
        console.log("closing server")
        await server.closeServer();
        console.log("server done")
    })
    it("gets an example", async function(){
        const response = await fetch(`http://localhost:${port}/one-example.txt`);
        const status = response.status;
        assert.equal(status, 200);
        const content = await response.text();
        assert.equal(content.replace(/\r/,''),`This is one example\nin two lines.`)
    })
})

describe("browser-test", function(){
    var server: Server4Test
    var port = 8089
    var baseUrl = `http://localhost:${port}`
    var coverageDir = Path.join('local-test', 'coverage-test')
    var validReport: BrowserTestReport = {
        userAgent: 'test-agent', console: [{level: 'log', text: 'hello'}], loadErrors: [], errors: [],
        finished: true, tests: 2, passes: 2, pending: 0, failures: []
    }
    var postReport = (report: unknown, runId: string) => fetch(`${baseUrl}${BROWSER_TEST_RESULT_PATH}?run=${runId}`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(report)
    });
    before(async function(){
        server = new Server4Test({...CONFIG_SUPER_INSECURE, port, "public-dir": "./example", "browser-test": {files: ['example.css', 'example.js', 'test/one test.js'], "coverage-dir": coverageDir}})
        await server.start()
    })
    after(async function(){
        await server.closeServer();
    })
    it("serves the test page with mocha and the files in order", async function(){
        const response = await fetch(baseUrl + BROWSER_TEST_PAGE_PATH);
        assert.equal(response.status, 200);
        const content = await response.text();
        const sources = [...content.matchAll(/<script src="([^"]*)"/g)].map(match => match[1]);
        assert.deepEqual(sources, ['/node_modules/mocha/mocha.js', '/example.js', '/test/one%20test.js']);
        const styles = [...content.matchAll(/<link rel="stylesheet" href="([^"]*)"/g)].map(match => match[1]);
        assert.deepEqual(styles, ['/node_modules/mocha/mocha.css', '/example.css']);
    })
    it("delivers a valid report to the listener of the run", async function(){
        var received: BrowserTestReport | null = null;
        server.browserTestListeners.set('run-1', report => { received = report; });
        const response = await postReport(validReport, 'run-1');
        server.browserTestListeners.delete('run-1');
        assert.equal(response.status, 200);
        assert.deepEqual(received, validReport);
    })
    it("saves the coverage of a report without listener", async function(){
        var coverage = {'/lib/one.js': {path: '/lib/one.js', s: {'0': 1}}};
        var coverageFile = Path.join(coverageDir, 'server4test-browser.json');
        await fs.rm(coverageFile, {force: true});
        const response = await postReport({...validReport, coverage}, 'not-listened');
        assert.equal(response.status, 200);
        assert.deepEqual(JSON.parse(await fs.readFile(coverageFile, 'utf8')), coverage);
    })
    it("rejects an invalid coverage", async function(){
        const response = await postReport({...validReport, coverage: 'all'}, 'run-3');
        assert.equal(response.status, 400);
    })
    it("rejects an invalid report", async function(){
        const response = await postReport({...validReport, tests: 'two'}, 'run-2');
        assert.equal(response.status, 400);
    })
    it("evaluates the report", function(){
        assert.equal(printBrowserTestReport(validReport, 'ok'), true);
        assert.equal(printBrowserTestReport({...validReport, failures: [{title: 'one', message: 'wrong'}]}, 'with failures'), false);
        assert.equal(printBrowserTestReport({...validReport, errors: ['syntax error']}, 'with errors'), false);
        assert.equal(printBrowserTestReport({...validReport, loadErrors: ['missing.js']}, 'with load errors'), false);
        assert.equal(printBrowserTestReport({...validReport, tests: 0, passes: 0}, 'without tests'), false);
    })
    describe("browser assert", function(){
        type BrowserAssert = ((value: unknown, message?: string) => void) & {
            ok: (value: unknown, message?: string) => void
            equal: (actual: unknown, expected: unknown, message?: string) => void
            notEqual: (actual: unknown, expected: unknown, message?: string) => void
            strictEqual: (actual: unknown, expected: unknown, message?: string) => void
            notStrictEqual: (actual: unknown, expected: unknown, message?: string) => void
            deepEqual: (actual: unknown, expected: unknown, message?: string) => void
            notDeepEqual: (actual: unknown, expected: unknown, message?: string) => void
            deepStrictEqual: (actual: unknown, expected: unknown, message?: string) => void
            notDeepStrictEqual: (actual: unknown, expected: unknown, message?: string) => void
            fail: (message?: string) => void
            throws: (fn: () => void, expected?: unknown, message?: string) => void
            strict: BrowserAssert
        };
        var browserAssert: BrowserAssert;
        var expectAssertionError = (fn: () => void, message: string) => assert.throws(fn, (error: Error) => {
            assert.equal(error.name, 'AssertionError');
            assert.equal(error.message, message);
            return true;
        });
        before(async function(){
            const response = await fetch(baseUrl + BROWSER_TEST_ASSERT_PATH);
            assert.equal(response.status, 200);
            assert.match(response.headers.get('content-type') ?? '', /javascript/);
            var sandbox: {window: {assert?: BrowserAssert}} = {window: {}};
            vm.runInNewContext(await response.text(), sandbox);
            if(!sandbox.window.assert) throw new Error('window.assert was not defined');
            browserAssert = sandbox.window.assert;
        })
        it("checks truthy values", function(){
            browserAssert(1);
            browserAssert.ok('yes');
            expectAssertionError(() => browserAssert(0), 'The expression evaluated to a falsy value: 0');
            expectAssertionError(() => browserAssert.ok(false, 'custom message'), 'custom message');
        })
        it("compares with == and ===", function(){
            browserAssert.equal('1', 1);
            browserAssert.notEqual(1, 2);
            browserAssert.strictEqual(NaN, NaN);
            browserAssert.notStrictEqual('1', 1);
            expectAssertionError(() => browserAssert.equal(1, 2), '1 == 2');
            expectAssertionError(() => browserAssert.notEqual('1', 1), '"1" != 1');
            expectAssertionError(() => browserAssert.strictEqual('1', 1), '"1" === 1');
            expectAssertionError(() => browserAssert.notStrictEqual(1, 1), '1 !== 1');
            expectAssertionError(() => browserAssert.fail('it fails'), 'it fails');
        })
        it("compares deeply", function(){
            var cyclic1: {self?: unknown, n: number} = {n: 1};
            cyclic1.self = cyclic1;
            var cyclic2: {self?: unknown, n: number} = {n: 1};
            cyclic2.self = cyclic2;
            browserAssert.deepEqual({a: [1, '2', {b: new Date(2020, 1, 1)}], r: /x/g}, {a: ['1', 2, {b: new Date(2020, 1, 1)}], r: /x/g});
            browserAssert.deepStrictEqual({a: [1, {b: null}], e: new Error('m')}, {a: [1, {b: null}], e: new Error('m')});
            browserAssert.deepStrictEqual(cyclic1, cyclic2);
            browserAssert.deepStrictEqual([NaN], [NaN]);
            browserAssert.notDeepEqual({a: 1}, {a: 1, b: 2});
            browserAssert.notDeepStrictEqual({a: 1}, {a: '1'});
            browserAssert.notDeepStrictEqual([1], {0: 1});
            browserAssert.notDeepStrictEqual(new Date(2020, 1, 1), new Date(2020, 1, 2));
            browserAssert.notDeepStrictEqual(new Error('m'), new Error('n'));
            expectAssertionError(() => browserAssert.deepStrictEqual({a: 1}, {a: '1'}), '{"a":1} deepStrictEqual {"a":"1"}');
            expectAssertionError(() => browserAssert.deepEqual([1, 2], [1]), '[1,2] deepEqual [1]');
            expectAssertionError(() => browserAssert.notDeepEqual({a: 1}, {a: 1}), '{"a":1} notDeepEqual {"a":1}');
            assert.throws(() => browserAssert.deepEqual(new Map(), new Map()), /deepEqual does not support Map/);
        })
        it("has the strict mode", function(){
            var strict = browserAssert.strict;
            strict(1);
            strict.equal(1, 1);
            strict.deepEqual({a: [1]}, {a: [1]});
            strict.notEqual('1', 1);
            strict.notDeepEqual({a: 1}, {a: '1'});
            strict.throws(() => { throw new Error('x'); }, /x/);
            assert.equal(strict.strict, strict);
            expectAssertionError(() => strict.equal('1', 1), '"1" === 1');
            expectAssertionError(() => strict.deepEqual({a: 1}, {a: '1'}), '{"a":1} deepStrictEqual {"a":"1"}');
            expectAssertionError(() => strict.ok(0), 'The expression evaluated to a falsy value: 0');
        })
        it("checks thrown errors", function(){
            browserAssert.throws(() => { throw new TypeError('wrong type'); });
            browserAssert.throws(() => { throw new TypeError('wrong type'); }, TypeError);
            browserAssert.throws(() => { throw new TypeError('wrong type'); }, /^TypeError: wrong/);
            browserAssert.throws(() => { throw new TypeError('wrong type'); }, {name: 'TypeError', message: /wrong/});
            browserAssert.throws(() => { throw new TypeError('wrong type'); }, (error: Error) => error.message == 'wrong type');
            expectAssertionError(() => browserAssert.throws(() => undefined), 'Missing expected exception.');
            expectAssertionError(() => browserAssert.throws(() => undefined, 'must throw'), 'must throw');
            expectAssertionError(() => browserAssert.throws(() => { throw new Error('other'); }, TypeError), 'The error "Error: other" does not match the expected');
            expectAssertionError(() => browserAssert.throws(() => { throw new Error('other'); }, /wrong/), 'The error "Error: other" does not match the expected');
        })
    })
    it("rejects unknown browsers without launching anything", async function(){
        assert.equal(await runBrowsers(Server4Test, {...CONFIG_SUPER_INSECURE, "browser-test": {files: []}}, 'chrome,safari'), false);
    })
    it("rejects --run-browser without browser-test config", async function(){
        assert.equal(await runBrowsers(Server4Test, CONFIG_SUPER_INSECURE, 'chrome'), false);
    })
})
