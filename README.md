# server4test
server for test

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
