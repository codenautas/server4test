import { spawn, ChildProcess } from 'child_process';
import { existsSync, promises as fsp } from 'fs';
import * as os   from 'os';
import * as Path from 'path';
import type { Server4Test, Server4TestOpts } from './server4test';

export const BROWSER_TEST_PAGE_PATH = '/server4test-browser-test';
export const BROWSER_TEST_RESULT_PATH = '/server4test-browser-result';
export const BROWSER_TEST_ASSERT_PATH = '/server4test-browser-assert.js';
export const BROWSER_TEST_TIMEOUT_DEFAULT = 120000;
export const BROWSER_TEST_COVERAGE_DIR_DEFAULT = '.nyc_output';

export type BrowserTestOpts = {
    files: string[]
    timeout?: number
    "coverage-dir"?: string
}

export type BrowserTestFailure = {
    title: string
    message: string
    stack?: string
}

export type BrowserTestReport = {
    userAgent: string
    console: {level: string, text: string}[]
    loadErrors: string[]
    errors: string[]
    finished: boolean
    tests: number
    passes: number
    pending: number
    failures: BrowserTestFailure[]
    /** window.__coverage__ when the files are instrumented by istanbul (i.e. nyc instrument) */
    coverage?: Record<string, unknown>
}

export type BrowserName = 'chrome' | 'firefox';

type BrowserDef = {
    envVar: string
    candidates: () => string[]
    args: (profileDir: string, url: string, show: boolean) => string[]
}

export type RunBrowsersOptions = {
    /** visible browsers, left open until the user closes them (no timeout) */
    show?: boolean
    /** milliseconds to wait after each test */
    delay?: number
}

function inProgramFiles(relativePath: string): string[]{
    return [process.env.PROGRAMFILES, process.env['PROGRAMFILES(X86)'], process.env.LOCALAPPDATA]
        .filter((dir): dir is string => !!dir)
        .map(dir => Path.join(dir, relativePath));
}

function inPath(names: string[]): string[]{
    var dirs = (process.env.PATH || '').split(Path.delimiter).filter(dir => !!dir);
    var result: string[] = [];
    names.forEach(name => dirs.forEach(dir => result.push(Path.join(dir, name))));
    return result;
}

const BROWSERS: Record<BrowserName, BrowserDef> = {
    chrome: {
        envVar: 'CHROME_BIN',
        candidates: () =>
            process.platform === 'win32' ? inProgramFiles('Google\\Chrome\\Application\\chrome.exe') :
            process.platform === 'darwin' ? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'] :
            inPath(['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser']),
        args: (profileDir, url, show) => [
            ...(show ? [] : ['--headless']), '--user-data-dir=' + profileDir, '--no-first-run', '--no-default-browser-check',
            '--disable-gpu', '--disable-extensions', url
        ]
    },
    firefox: {
        envVar: 'FIREFOX_BIN',
        candidates: () =>
            process.platform === 'win32' ? inProgramFiles('Mozilla Firefox\\firefox.exe') :
            process.platform === 'darwin' ? ['/Applications/Firefox.app/Contents/MacOS/firefox'] :
            inPath(['firefox']),
        args: (profileDir, url, show) => [...(show ? [] : ['-headless']), '-no-remote', '-wait-for-browser', '-profile', profileDir, url]
    }
};

export function isBrowserName(name: string): name is BrowserName{
    return Object.prototype.hasOwnProperty.call(BROWSERS, name);
}

function findExecutable(browser: BrowserName): string{
    var def = BROWSERS[browser];
    var fromEnv = process.env[def.envVar];
    if(fromEnv){
        if(!existsSync(fromEnv)){
            throw new Error(`server4test: ${def.envVar}=${fromEnv} does not exist`);
        }
        return fromEnv;
    }
    var candidates = def.candidates();
    var found = candidates.find(candidate => existsSync(candidate));
    if(found == null){
        throw new Error(`server4test: ${browser} not found. Set ${def.envVar}. Searched in: ${candidates.join(', ')}`);
    }
    return found;
}

function escapeHtmlAttr(text: string): string{
    return text.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function jsonForScript(value: unknown): string{
    return JSON.stringify(value).replace(/</g, '\\u003c');
}

export function browserTestPage(baseUrl: string, browserTest: BrowserTestOpts): string{
    var url = (file: string) => escapeHtmlAttr(encodeURI(baseUrl + '/' + file.replace(/\\/g, '/').replace(/^\.?\//, '')));
    return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>server4test browser test</title>
<link rel="stylesheet" href="${url('node_modules/mocha/mocha.css')}">
<script>
(function(){
    var report = {userAgent: navigator.userAgent, console: [], loadErrors: [], errors: [], finished: false, tests: 0, passes: 0, pending: 0, failures: []};
    window.server4testReport = report;
    function asText(x){
        if(typeof x === 'string') return x;
        if(x instanceof Error) return x.stack || String(x);
        if(x instanceof Date) return String(x);
        try{
            return JSON.stringify(x);
        }catch(err){
            return String(x);
        }
    }
    ['log', 'info', 'warn', 'error', 'debug'].forEach(function(level){
        var original = console[level];
        console[level] = function(){
            report.console.push({level: level, text: Array.prototype.map.call(arguments, asText).join(' ')});
            return original.apply(console, arguments);
        };
    });
    window.addEventListener('error', function(event){
        var target = event.target;
        if(target && target.tagName && (target.tagName == 'SCRIPT' || target.tagName == 'LINK')){
            report.loadErrors.push(target.src || target.href);
        }else if(target && target.tagName){
            report.console.push({level: 'warn', text: 'can not load ' + target.tagName.toLowerCase() + ': ' + (target.src || target.href)});
        }else{
            report.errors.push((event.message || 'error') + ' at ' + event.filename + ':' + event.lineno + (event.error && event.error.stack ? '\\n' + event.error.stack : ''));
        }
    }, true);
})();
</script>
</head>
<body>
<div id="mocha"></div>
<script src="${url('node_modules/mocha/mocha.js')}"></script>
<script>
if(typeof mocha !== 'undefined') mocha.setup({ui: 'bdd'});
</script>
${browserTest.files.map(file => /\.css$/i.test(file) ? `<link rel="stylesheet" href="${url(file)}">` : `<script src="${url(file)}"></script>`).join('\n')}
<script>
(function(){
    var report = window.server4testReport;
    var runId = new URLSearchParams(location.search).get('run');
    function send(){
        report.finished = true;
        if(window.__coverage__) report.coverage = window.__coverage__;
        fetch(${jsonForScript(baseUrl + BROWSER_TEST_RESULT_PATH)} + (runId ? '?run=' + encodeURIComponent(runId) : ''), {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(report)
        }).then(function(response){
            if(!response.ok) throw new Error('server4test: result not accepted, status ' + response.status);
        }).catch(function(err){
            document.title = 'server4test: ' + err.message;
            alert('server4test: ' + err.message);
        });
    }
    if(typeof mocha === 'undefined'){
        send();
        return;
    }
    var delay = Number(new URLSearchParams(location.search).get('delay')) || 0;
    if(delay > 0){
        afterEach(function(done){
            this.timeout(delay + 2000);
            setTimeout(done, delay);
        });
    }
    var runner = mocha.run();
    runner.on('test end', function(){ report.tests++; });
    runner.on('pass', function(){ report.passes++; });
    runner.on('pending', function(){ report.pending++; });
    runner.on('fail', function(test, err){
        report.failures.push({title: test.fullTitle(), message: String(err && err.message), stack: err && err.stack});
    });
    runner.on('end', send);
})();
</script>
</body>
</html>
`;
}

function isObject(x: unknown): x is Record<string, unknown>{
    return typeof x === 'object' && x !== null;
}

function asStringArray(x: unknown, name: string): string[]{
    if(!Array.isArray(x) || !x.every(item => typeof item === 'string')){
        throw new Error(`server4test: invalid browser test report, ${name} must be an array of strings`);
    }
    return x;
}

function asNumber(x: unknown, name: string): number{
    if(typeof x !== 'number'){
        throw new Error(`server4test: invalid browser test report, ${name} must be a number`);
    }
    return x;
}

export function parseBrowserTestReport(body: unknown): BrowserTestReport{
    if(!isObject(body)){
        throw new Error('server4test: invalid browser test report, must be an object');
    }
    if(!Array.isArray(body.console) || !body.console.every(line => isObject(line) && typeof line.level === 'string' && typeof line.text === 'string')){
        throw new Error('server4test: invalid browser test report, console must be an array of {level, text}');
    }
    if(!Array.isArray(body.failures) || !body.failures.every(failure => isObject(failure) && typeof failure.title === 'string' && typeof failure.message === 'string' && (failure.stack == null || typeof failure.stack === 'string'))){
        throw new Error('server4test: invalid browser test report, failures must be an array of {title, message, stack}');
    }
    if(body.coverage != null && !isObject(body.coverage)){
        throw new Error('server4test: invalid browser test report, coverage must be an object');
    }
    return {
        userAgent: String(body.userAgent),
        console: body.console,
        loadErrors: asStringArray(body.loadErrors, 'loadErrors'),
        errors: asStringArray(body.errors, 'errors'),
        finished: body.finished === true,
        tests: asNumber(body.tests, 'tests'),
        passes: asNumber(body.passes, 'passes'),
        pending: asNumber(body.pending, 'pending'),
        failures: body.failures,
        ...(isObject(body.coverage) ? {coverage: body.coverage} : {})
    };
}

/** saves the coverage (if any) in the coverage-dir (default .nyc_output) to be used by nyc report */
export async function saveBrowserTestCoverage(report: BrowserTestReport, label: string, browserTest: BrowserTestOpts): Promise<void>{
    if(report.coverage == null) return;
    var dir = browserTest["coverage-dir"] ?? BROWSER_TEST_COVERAGE_DIR_DEFAULT;
    var fileName = Path.join(dir, 'server4test-' + label.replace(/[^-A-Za-z_0-9]/g, '_') + '.json');
    await fsp.mkdir(dir, {recursive: true});
    await fsp.writeFile(fileName, JSON.stringify(report.coverage), 'utf8');
    console.log(`[${label}] coverage saved in ${fileName}`);
}

/** prints the report and returns true if all is ok */
export function printBrowserTestReport(report: BrowserTestReport, label: string): boolean{
    console.log(`[${label}] ${report.userAgent}`);
    report.console.forEach(line => console.log(`[${label}] ${line.level === 'log' ? '' : line.level + ': '}${line.text}`));
    report.loadErrors.forEach(src => console.error(`[${label}] can not load: ${src}`));
    report.errors.forEach(error => console.error(`[${label}] error: ${error}`));
    report.failures.forEach((failure, i) => {
        console.error(`[${label}] ${i + 1}) ${failure.title}`);
        // some browsers (i.e. Firefox) do not include the message in the stack
        var detail = failure.stack == null ? failure.message :
            failure.stack.includes(failure.message) ? failure.stack : failure.message + '\n' + failure.stack;
        console.error(`[${label}]    ${detail}`);
    });
    var ok = !report.loadErrors.length && !report.errors.length && !report.failures.length && report.tests > 0;
    console.log(`[${label}] ${ok ? 'OK' : 'FAILED'}: ${report.tests} tests, ${report.passes} passing, ${report.failures.length} failing, ${report.pending} pending`);
    if(report.tests === 0){
        console.error(`[${label}] no tests were run`);
    }
    return ok;
}

async function stopProcess(child: ChildProcess): Promise<void>{
    if(child.exitCode !== null || child.signalCode !== null) return;
    await new Promise<void>(resolve => {
        var timer = setTimeout(() => {
            console.error('server4test: the browser process does not finish');
            resolve();
        }, 10000);
        child.once('exit', () => {
            clearTimeout(timer);
            resolve();
        });
        child.kill();
    });
}

async function runBrowser(server: Server4Test, baseUrl: string, browser: BrowserName, browserTest: BrowserTestOpts, runOptions: RunBrowsersOptions): Promise<boolean>{
    var timeout = browserTest.timeout ?? BROWSER_TEST_TIMEOUT_DEFAULT;
    var show = runOptions.show === true;
    var executable = findExecutable(browser);
    var profileDir = await fsp.mkdtemp(Path.join(os.tmpdir(), 'server4test-' + browser + '-'));
    var runId = browser + '-' + Date.now();
    var url = baseUrl + BROWSER_TEST_PAGE_PATH + '?run=' + encodeURIComponent(runId) + (runOptions.delay ? '&delay=' + runOptions.delay : '');
    var child: ChildProcess | null = null;
    var stderr = '';
    console.log(`[${browser}] ${executable} ${url}`);
    try{
        var browserProcess = spawn(executable, BROWSERS[browser].args(profileDir, url, show), {stdio: ['ignore', 'ignore', 'pipe']});
        child = browserProcess;
        var browserExit = new Promise<void>(resolve => { browserProcess.once('exit', () => resolve()); });
        var report = await new Promise<BrowserTestReport>((resolve, reject) => {
            var timer = show ? undefined : setTimeout(() => reject(new Error(`server4test: timeout (${timeout}ms) waiting for ${browser} results`)), timeout);
            server.browserTestListeners.set(runId, (report) => {
                clearTimeout(timer);
                resolve(report);
            });
            browserProcess.stderr?.on('data', (chunk: Buffer) => {
                stderr = (stderr + chunk.toString()).slice(-8000);
            });
            browserProcess.on('error', (err) => {
                clearTimeout(timer);
                reject(err);
            });
            browserProcess.on('exit', (code, signal) => {
                clearTimeout(timer);
                reject(new Error(`server4test: ${browser} finished (code ${code}, signal ${signal}) before sending results`));
            });
        });
        await saveBrowserTestCoverage(report, browser, browserTest);
        var ok = printBrowserTestReport(report, browser);
        if(show){
            console.log(`[${browser}] close the browser to continue`);
            await browserExit;
        }
        return ok;
    }catch(err){
        console.error(`[${browser}]`, err);
        if(stderr){
            console.error(`[${browser}] browser stderr:\n${stderr}`);
        }
        return false;
    }finally{
        server.browserTestListeners.delete(runId);
        if(child){
            await stopProcess(child);
        }
        try{
            await fsp.rm(profileDir, {recursive: true, force: true, maxRetries: 10, retryDelay: 300});
        }catch(err){
            console.error(`[${browser}] server4test: can not remove the temporary profile ${profileDir}`, err);
        }
    }
}

/** runs the browser test in each browser (comma separated list), returns true if all is ok */
export async function runBrowsers(ServerConstructor: typeof Server4Test, opts: Server4TestOpts, browserList: string | undefined, runOptions: RunBrowsersOptions = {}): Promise<boolean>{
    var browserTest = opts["browser-test"];
    if(browserTest == null){
        console.error('server4test: --run-browser needs "browser-test" in server4test-config');
        return false;
    }
    if(!browserList){
        console.error('server4test: --run-browser needs a browser list, i.e.: --run-browser chrome,firefox');
        return false;
    }
    var browsers = browserList.split(',');
    var unknown = browsers.filter(browser => !isBrowserName(browser));
    if(unknown.length){
        console.error(`server4test: unknown browser ${unknown.join(', ')}. Valid browsers: ${Object.keys(BROWSERS).join(', ')}`);
        return false;
    }
    var server = new ServerConstructor({...opts, port: 0});
    await server.start();
    try{
        var address = server.listener.address();
        if(!isObject(address) || typeof address.port !== 'number'){
            throw new Error('server4test: can not get the server port');
        }
        var baseUrl = 'http://localhost:' + address.port + opts["base-url"];
        var ok = true;
        for(var browser of browsers.filter(isBrowserName)){
            ok = await runBrowser(server, baseUrl, browser, browserTest, runOptions) && ok;
        }
        return ok;
    }finally{
        await server.closeServer();
    }
}
