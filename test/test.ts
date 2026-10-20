"use strict";

import { Server4Test, /*CONFIG_DEFAULT,*/ CONFIG_SUPER_INSECURE } from '../src/server4test';

import { BrowserTestReport, BROWSER_TEST_PAGE_PATH, BROWSER_TEST_RESULT_PATH, BROWSER_TEST_ASSERT_PATH, printBrowserTestReport, runBrowsers } from '../src/browser-runner';

import * as Path from 'node:path';

import * as assert from 'node:assert';

import { promises as fs } from 'node:fs';

// import {promises as fs} from 'fs'

// const TIMEOUT_SPEED = 1000 * (process.env.BP_TIMEOUT_SPEED as unknown as number ?? 1);

function console_log<T>(x:T){
    console.log('____________',x)
    return x;
}

if (!console_log) console.log('dummy');

describe("connected", function(){
    let server: Server4Test
    const port = 8088
    const path = "./example"
    before(async function(){
        server = new Server4Test({...CONFIG_SUPER_INSECURE, port, "public-dir": path, echo: true, "local-file-repo": {...CONFIG_SUPER_INSECURE["local-file-repo"], delay: 1}})
        console.log("starting server")
        await server.start()
        console.log("server listeining in", port)
    })
    after(async function(){
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
    it("lists the directory", async function(){
        const response = await fetch(`http://localhost:${port}/?dir`);
        assert.equal(response.status, 200);
        const content = await response.text();
        assert.match(content, /one-example\.txt/);
    })
    it("echoes the request", async function(){
        const response = await fetch(`http://localhost:${port}/echo?one=1`);
        assert.equal(response.status, 200);
        const content = await response.text();
        assert.match(content, /^<pre>query: \{\s*"one": "1"\s*\}/);
        assert.match(content, /path: "\/echo"/);
    })
    it("writes, reads and deletes a file in the local-file-repo", async function(){
        type RepoAnswer = {content?: string, timestamp: number};
        const repoUrl = `http://localhost:${port}`;
        const file = encodeURIComponent('sub/test-repo.txt');
        const written = await fetch(`${repoUrl}/file-write?file=${file}&content=${encodeURIComponent('hello repo')}`);
        assert.equal(written.status, 200);
        assert.equal(typeof (await written.json() as RepoAnswer).timestamp, 'number');
        assert.equal(await fs.readFile(Path.join('local-file-repo', 'sub_test-repo.txt'), 'utf8'), 'hello repo');
        const read = await fetch(`${repoUrl}/file-read?file=${file}`);
        assert.equal(read.status, 200);
        assert.equal((await read.json() as RepoAnswer).content, 'hello repo');
        const deleted = await fetch(`${repoUrl}/file-delete?file=${file}`);
        assert.equal(deleted.status, 200);
        const readDeleted = await fetch(`${repoUrl}/file-read?file=${file}`);
        assert.equal(readDeleted.status, 404);
    })
    it("rejects a local-file-repo request without filename", async function(){
        const response = await fetch(`http://localhost:${port}/file-read`);
        assert.equal(response.status, 502);
    })
})

describe("browser-test", function(){
    let server: Server4Test
    const port = 8089
    const baseUrl = `http://localhost:${port}`
    const coverageDir = Path.join('local-test', 'coverage-test')
    const validReport: BrowserTestReport = {
        userAgent: 'test-agent', console: [{level: 'log', text: 'hello'}], loadErrors: [], errors: [],
        finished: true, tests: 2, passes: 2, pending: 0, failures: []
    }
    const postReport = async (report: unknown, runId: string) => await fetch(`${baseUrl}${BROWSER_TEST_RESULT_PATH}?run=${runId}`, { // eslint-disable-line @typescript-eslint/return-await -- SonarQube S7503 requires an await
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
        let received: BrowserTestReport | null = null;
        server.browserTestListeners.set('run-1', report => { received = report; });
        const response = await postReport(validReport, 'run-1');
        server.browserTestListeners.delete('run-1');
        assert.equal(response.status, 200);
        assert.deepEqual(received, validReport);
    })
    it("saves the coverage of a report without listener", async function(){
        const coverage = {'/lib/one.js': {path: '/lib/one.js', s: {'0': 1}}};
        const coverageFile = Path.join(coverageDir, 'server4test-browser.json');
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
    it("serves the browser assert", async function(){
        const response = await fetch(baseUrl + BROWSER_TEST_ASSERT_PATH);
        assert.equal(response.status, 200);
        assert.match(response.headers.get('content-type') ?? '', /javascript/);
        assert.equal(await response.text(), await fs.readFile(Path.join('src', 'server4test-browser-assert.js'), 'utf8'));
    })
    it("rejects unknown browsers without launching anything", async function(){
        assert.equal(await runBrowsers(Server4Test, {...CONFIG_SUPER_INSECURE, "browser-test": {files: []}}, 'chrome,safari'), false);
    })
    it("rejects --run-browser without browser-test config", async function(){
        assert.equal(await runBrowsers(Server4Test, CONFIG_SUPER_INSECURE, 'chrome'), false);
    })
    it("rejects --run-browser without browser list", async function(){
        assert.equal(await runBrowsers(Server4Test, {...CONFIG_SUPER_INSECURE, "browser-test": {files: []}}, undefined), false);
    })
    it("fails when the browser executable does not exist", async function(){
        const previous = process.env.FIREFOX_BIN;
        process.env.FIREFOX_BIN = Path.join('local-test', 'missing-firefox');
        try{
            await assert.rejects(runBrowsers(Server4Test, {...CONFIG_SUPER_INSECURE, "browser-test": {files: []}}, 'firefox'), /FIREFOX_BIN=.*missing-firefox does not exist/);
        }finally{
            if(previous == null){
                delete process.env.FIREFOX_BIN;
            }else{
                process.env.FIREFOX_BIN = previous;
            }
        }
    })
})

describe("direct services", function(){
    it("registers once a 'use' service without path", async function(){
        const port = 8090;
        let calls = 0;
        class CountingServer extends Server4Test{
            override directServices(){
                return super.directServices().concat([
                    {path:'', method:'use', middleware:(_req, _res, next) => { calls++; return next?.(); }},
                    {path:'/counted', method:'get', middleware:(_req, res) => { res.send('ok'); }},
                ]);
            }
        }
        const server = new CountingServer({...CONFIG_SUPER_INSECURE, port, "public-dir": "./example", "local-file-repo": {...CONFIG_SUPER_INSECURE["local-file-repo"], enabled: false}});
        await server.start();
        try{
            const response = await fetch(`http://localhost:${port}/counted`);
            assert.equal(await response.text(), 'ok');
            assert.equal(calls, 1);
        }finally{
            await server.closeServer();
        }
    })
})
