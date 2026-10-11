"use strict";

import { Server4Test, /*CONFIG_DEFAULT,*/ CONFIG_SUPER_INSECURE } from '../src/server4test';

import { BrowserTestReport, BROWSER_TEST_PAGE_PATH, BROWSER_TEST_RESULT_PATH, printBrowserTestReport, runBrowsers } from '../src/browser-runner';

import * as Path from 'path';

import * as assert from 'assert';

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
        server = new Server4Test({...CONFIG_SUPER_INSECURE, port, "public-dir": "./example", "browser-test": {files: ['example.js', 'test/one test.js']}})
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
    })
    it("delivers a valid report to the listener of the run", async function(){
        var received: BrowserTestReport | null = null;
        server.browserTestListeners.set('run-1', report => { received = report; });
        const response = await postReport(validReport, 'run-1');
        server.browserTestListeners.delete('run-1');
        assert.equal(response.status, 200);
        assert.deepEqual(received, validReport);
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
    it("rejects unknown browsers without launching anything", async function(){
        assert.equal(await runBrowsers(Server4Test, {...CONFIG_SUPER_INSECURE, "browser-test": {files: []}}, 'chrome,safari'), false);
    })
    it("rejects --run-browser without browser-test config", async function(){
        assert.equal(await runBrowsers(Server4Test, CONFIG_SUPER_INSECURE, 'chrome'), false);
    })
})
