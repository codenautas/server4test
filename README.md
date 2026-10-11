# server4test

server for test


[![npm-version](https://img.shields.io/npm/v/server4test.svg)](https://npmjs.org/package/server4test)
[![downloads](https://img.shields.io/npm/dm/server4test.svg)](https://npmjs.org/package/server4test)
[![linux](https://github.com/codenautas/server4test/actions/workflows/build-and-test.yml/badge.svg)](https://github.com/codenautas/server4test/actions/workflows/build-and-test.yml)
[![windows](https://ci.appveyor.com/api/projects/status/github/codenautas/server4test?svg=true)](https://ci.appveyor.com/project/codenautas/server4test)
[![security](https://socket.dev/api/badge/npm/package/server4test)](https://socket.dev/npm/package/server4test)
[![qa-control](https://github.com/codenautas/server4test/actions/workflows/qa-control.yml/badge.svg)](https://github.com/codenautas/server4test/actions/workflows/qa-control.yml)


language: ![English](https://raw.githubusercontent.com/codenautas/multilang/master/img/lang-en.png)
also available in:
[![Spanish](https://raw.githubusercontent.com/codenautas/multilang/master/img/lang-es.png)](LEEME.md)


# main goal


serve static files and a bit plus.


# usage


```cmd
npm install -g server4test

server4test
```


# config


_server4test_ reads the config from `server4test-config.yaml` or `server4test-config.json`
and merges with `local-config.yaml` or `local-config.json`.

The config format is:


```yaml
server4test:
  port: 8080
  verbose: true
  serve-content: # see https://www.npmjs.com/package/serve-content
    allowAllExts: false
    allowedExts:
      - png
      - jpg
      - svg
      - html
      - jade
  base-url: '' # base URL
  echo: false # in console server
  server4test-directory: false # serves the folder file list
  local-file-repo: # fast way to save status to files
    enabled: false # enable fast way
    delay: 200 # set an aditional delay to the responses
    directory: local-file-repo # directory where save files
    readRequest: { method: 'get', path: '/file-read' }
    writeRequest: { method: 'get', path: '/file-write' }
    deleteRequest: { method: 'get', path: '/file-delete' }
  serve-index: # see https://www.npmjs.com/package/serve-index
    icons: true
    view: details
```

## `--super-insecure`


Running `server4test --super-insecure` replaces the default config with a permissive
one, intended only for local testing:


- `serve-content.allowAllExts: true` (serves any extension)
- `serve-content.dotfiles: "allow"`
- `serve-content.index: ["index.html", "index.htm", "index.js"]`
- `server4test-directory: true`
- `local-file-repo.enabled: true`
- `serve-index.hidden: true` (lists hidden files)


As the name says, do not use it to serve anything you would not publish.


# serving files


The files are served by [serve-content](https://www.npmjs.com/package/serve-content),
rooted at `public-dir` (defaults to the current working directory). `public-dir` also
accepts a list of directories, tried in order.

A file is served only if its extension is listed in `serve-content.allowedExts`
(or if `allowAllExts` is set). Extensions not in the list are not served.


## transformed files


Some files are compiled on the fly, so they are requested **without** their extension:


| file        | request        | result |
| ----------- | -------------- | ------ |
| `page.jade` | `/page`        | html   |
| `page.md`   | `/page`        | html   |
| `style.styl`| `/style.css`   | css    |


The `.jade` and `.styl` files can also be requested with their own extension
(`/page.jade`, `/style.styl`) to get the source, if the extension is allowed.


## directory index


When the request points to a directory, the index file is resolved by
[serve-static](https://www.npmjs.com/package/serve-static), which looks for a
**literal** file name on disk. By default that is `index.html`; the list can be
changed with `serve-content.index`.


Note that the transformation described above does **not** apply here: an
`index.jade` in the directory is not compiled and served as the index, and adding
`index` to `serve-content.index` does not help either, because the lookup is a
plain file lookup with no extension resolution. To serve a jade index, request it
explicitly as `/the-directory/index`.


# directory listing


Adding `?dir` to any URL serves the directory listing for that path, using
[serve-index](https://www.npmjs.com/package/serve-index):


```
http://localhost:8080/?dir
http://localhost:8080/some/folder?dir
```


The listing is only available when:

- `server4test-directory` is set to `true` (it is `false` by default; `--super-insecure` sets it), and
- the path is under the **first** directory of `public-dir` (when a list is used, only the first one is listed).


In the generated listing the links to directories keep the `?dir` suffix, so the
listing can be navigated; the links to files point to the files themselves.


# echo


With `echo: true` a `/echo` service is added, that answers with the received
`query`, `path`, `headers`, `cookies`, `ip`, `originalUrl` and `xhr`. Useful to
inspect what the client is actually sending.


# webpack


If a `webpack.config.js` exists in the current directory, it is loaded and served
through [webpack-dev-middleware](https://www.npmjs.com/package/webpack-dev-middleware)
(by default under `/dist`).


Since version 2.0 `webpack` and `webpack-dev-middleware` are optional dependencies
(`peerDependencies`), so to use `webpack.config.js` they must be installed in the project:


```sh
npm install --save-dev webpack webpack-dev-middleware
```

# local-file-repo


A minimal file store to keep state between reloads while testing. When
`local-file-repo.enabled` is true, three services are added:


| request                                   | action |
| ----------------------------------------- | ------ |
| `/file-read?file=NAME`                    | returns `{content, timestamp}` |
| `/file-write?file=NAME&content=TEXT`      | writes the file, returns `{timestamp}` |
| `/file-delete?file=NAME`                  | deletes the file, returns `{timestamp}` |


The paths and methods are configurable with `readRequest`, `writeRequest` and
`deleteRequest`. The files are stored in `local-file-repo.directory`, and the name
is sanitized (any character outside `-A-Za-z_0-9.@` is replaced by `_`), so the
store is flat and cannot escape the directory. A random delay of up to
`local-file-repo.delay` milliseconds is added to each response, to make the
asynchrony visible while testing.


# browser-test


Runs the [mocha](https://mochajs.org/) tests in real browsers (Chrome and Firefox)
in headless mode and without drivers: _server4test_ generates a page that loads mocha
and the listed files, launches the browser pointing to that page and waits for the page
to send the result with a POST.

It is configured with the list of files to load, in order (mocha is loaded automatically,
from `node_modules/mocha`). The `.css` files are loaded as stylesheets and the rest as scripts:


```yaml
server4test:
  browser-test:
    files:
      - my-lib.css
      - node_modules/require-bro/lib/require-bro.js
      - node_modules/expect.js/index.js
      - my-lib.js
      - test/test.js
    timeout: 120000 # ms waiting for the results of each browser (default 120000)
    coverage-dir: .nyc_output # where the coverage is saved (default .nyc_output)
```


To run them and exit (with exit code 0 if all is ok and 1 otherwise):


```sh
server4test --run-browser chrome,firefox
```


Each browser runs separately, with a temporary profile, and the server uses a free port.
The `console` output of the page, the errors and the failed tests are shown. The run
fails if any test fails, if there are errors loading or running the files, if no test
was run, if the `timeout` expires or if the browser exits before sending the result.

The browser is searched in the environment variables `CHROME_BIN` and `FIREFOX_BIN` and,
if they are not set, in the usual places of each operating system. The `ubuntu` runners
of GitHub Actions already have Chrome and Firefox installed.

Running `server4test` without `--run-browser` the page is available at
`/server4test-browser-test` to open it manually in any browser; the result is shown in
the server console.

An image (or another resource that is not a file of the list) that can not be loaded is
shown as a warning, it does not make the run fail.


## coverage


If the files are instrumented by istanbul (i.e. with `nyc instrument`), the page sends
`window.__coverage__` together with the result and _server4test_ saves it in
`coverage-dir` as `server4test-<browser>.json`; then `nyc report` builds the report
(merging the browsers):


```sh
nyc instrument --delete lib local-instrumented/lib
server4test --run-browser chrome,firefox
nyc report --reporter=text --reporter=lcov
```


In that case the list of files must load the instrumented version
(`local-instrumented/lib/my-lib.js` in the example).


# using it as a library


The server can be extended to add services, overriding `directServices()`:


```typescript
import {Server4Test, Server4TestOpts, launch} from "server4test";

class ExampleServer extends Server4Test{
    directServices(){
        return super.directServices().concat([
            {path:'/dummy1' , html:'dummy 1'},
            {path:'/up-time', html:new Date().toString()},
        ])
    }
}

launch({serverClass:ExampleServer, server4test:{port:3339, verbose:true}})
```


Each service is `{path, method?}` plus either `html` (served as html) or
`middleware` (an express middleware). The default `method` is `use`.

