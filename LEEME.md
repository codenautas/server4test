<!--multilang v0 es:LEEME.md en:README.md -->
# server4test
<!--lang:es-->

servidor para pruebas

<!--lang:en--]

server for test

[!--lang:*-->

<!-- cucardas -->
[![npm-version](https://img.shields.io/npm/v/server4test.svg)](https://npmjs.org/package/server4test)
[![downloads](https://img.shields.io/npm/dm/server4test.svg)](https://npmjs.org/package/server4test)
[![linux](https://github.com/codenautas/server4test/actions/workflows/build-and-test.yml/badge.svg)](https://github.com/codenautas/server4test/actions/workflows/build-and-test.yml)
[![windows](https://ci.appveyor.com/api/projects/status/github/codenautas/server4test?svg=true)](https://ci.appveyor.com/project/codenautas/server4test)
[![security](https://socket.dev/api/badge/npm/package/server4test)](https://socket.dev/npm/package/server4test)
[![qa-control](https://github.com/codenautas/server4test/actions/workflows/qa-control.yml/badge.svg)](https://github.com/codenautas/server4test/actions/workflows/qa-control.yml)

<!--multilang buttons-->

idioma: ![castellano](https://raw.githubusercontent.com/codenautas/multilang/master/img/lang-es.png)
también disponible en:
[![inglés](https://raw.githubusercontent.com/codenautas/multilang/master/img/lang-en.png)](README.md)

<!--lang:es-->

# objetivo principal

<!--lang:en--]

# main goal

[!--lang:es-->

servir archivos estáticos y un poco más.

<!--lang:en--]

serve static files and a bit plus.

[!--lang:es-->

# uso

<!--lang:en--]

# usage

[!--lang:*-->

```cmd
npm install -g server4test

server4test
```

<!--lang:es-->

# configuración

<!--lang:en--]

# config

[!--lang:es-->

_server4test_ lee la configuración de `server4test-config.yaml` o `server4test-config.json`
y la combina con `local-config.yaml` o `local-config.json`.

El formato de la configuración es:

<!--lang:en--]

_server4test_ reads the config from `server4test-config.yaml` or `server4test-config.json`
and merges with `local-config.yaml` or `local-config.json`.

The config format is:

[!--lang:*-->

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

<!--lang:es-->

Correr `server4test --super-insecure` reemplaza la configuración por omisión por una
permisiva, pensada únicamente para pruebas locales:

<!--lang:en--]

Running `server4test --super-insecure` replaces the default config with a permissive
one, intended only for local testing:

[!--lang:*-->

- `serve-content.allowAllExts: true` (serves any extension)
- `serve-content.dotfiles: "allow"`
- `serve-content.index: ["index.html", "index.htm", "index.js"]`
- `server4test-directory: true`
- `local-file-repo.enabled: true`
- `serve-index.hidden: true` (lists hidden files)

<!--lang:es-->

Como su nombre lo indica, no la use para servir nada que no publicaría.

<!--lang:en--]

As the name says, do not use it to serve anything you would not publish.

[!--lang:es-->

# servir archivos

<!--lang:en--]

# serving files

[!--lang:es-->

Los archivos los sirve [serve-content](https://www.npmjs.com/package/serve-content),
tomando como raíz `public-dir` (por omisión, el directorio actual). `public-dir` también
acepta una lista de directorios, que se prueban en orden.

Un archivo se sirve solo si su extensión figura en `serve-content.allowedExts`
(o si está activo `allowAllExts`). Las extensiones que no están en la lista no se sirven.

<!--lang:en--]

The files are served by [serve-content](https://www.npmjs.com/package/serve-content),
rooted at `public-dir` (defaults to the current working directory). `public-dir` also
accepts a list of directories, tried in order.

A file is served only if its extension is listed in `serve-content.allowedExts`
(or if `allowAllExts` is set). Extensions not in the list are not served.

[!--lang:es-->

## archivos transformados

<!--lang:en--]

## transformed files

[!--lang:es-->

Algunos archivos se compilan al vuelo, por lo que se piden **sin** su extensión:

<!--lang:en--]

Some files are compiled on the fly, so they are requested **without** their extension:

[!--lang:*-->

| file        | request        | result |
| ----------- | -------------- | ------ |
| `page.jade` | `/page`        | html   |
| `page.md`   | `/page`        | html   |
| `style.styl`| `/style.css`   | css    |

<!--lang:es-->

Los archivos `.jade` y `.styl` también se pueden pedir con su propia extensión
(`/page.jade`, `/style.styl`) para obtener el fuente, si la extensión está permitida.

<!--lang:en--]

The `.jade` and `.styl` files can also be requested with their own extension
(`/page.jade`, `/style.styl`) to get the source, if the extension is allowed.

[!--lang:es-->

## índice de directorio

<!--lang:en--]

## directory index

[!--lang:es-->

Cuando el pedido apunta a un directorio, el archivo índice lo resuelve
[serve-static](https://www.npmjs.com/package/serve-static), que busca un nombre de
archivo **literal** en el disco. Por omisión es `index.html`; la lista se puede
cambiar con `serve-content.index`.

<!--lang:en--]

When the request points to a directory, the index file is resolved by
[serve-static](https://www.npmjs.com/package/serve-static), which looks for a
**literal** file name on disk. By default that is `index.html`; the list can be
changed with `serve-content.index`.

[!--lang:es-->

Tener en cuenta que la transformación descripta arriba **no** se aplica acá: un
`index.jade` en el directorio no se compila para servirlo como índice, y agregar
`index` a `serve-content.index` tampoco ayuda, porque la búsqueda es una búsqueda
de archivo simple, sin resolución de extensión. Para servir un índice jade, pídalo
explícitamente como `/el-directorio/index`.

<!--lang:en--]

Note that the transformation described above does **not** apply here: an
`index.jade` in the directory is not compiled and served as the index, and adding
`index` to `serve-content.index` does not help either, because the lookup is a
plain file lookup with no extension resolution. To serve a jade index, request it
explicitly as `/the-directory/index`.

[!--lang:es-->

# listado de directorio

<!--lang:en--]

# directory listing

[!--lang:es-->

Agregando `?dir` a cualquier URL se sirve el listado del directorio de esa ruta, usando
[serve-index](https://www.npmjs.com/package/serve-index):

<!--lang:en--]

Adding `?dir` to any URL serves the directory listing for that path, using
[serve-index](https://www.npmjs.com/package/serve-index):

[!--lang:*-->

```
http://localhost:8080/?dir
http://localhost:8080/some/folder?dir
```

<!--lang:es-->

El listado está disponible solamente cuando:

- `server4test-directory` está en `true` (por omisión es `false`; `--super-insecure` lo activa), y
- la ruta está dentro del **primer** directorio de `public-dir` (cuando se usa una lista, solo se lista el primero).

<!--lang:en--]

The listing is only available when:

- `server4test-directory` is set to `true` (it is `false` by default; `--super-insecure` sets it), and
- the path is under the **first** directory of `public-dir` (when a list is used, only the first one is listed).

[!--lang:es-->

En el listado generado, los links a directorios conservan el sufijo `?dir`, de modo que
el listado se puede navegar; los links a archivos apuntan a los archivos mismos.

<!--lang:en--]

In the generated listing the links to directories keep the `?dir` suffix, so the
listing can be navigated; the links to files point to the files themselves.

[!--lang:*-->

# echo

<!--lang:es-->

Con `echo: true` se agrega un servicio `/echo`, que responde con el `query`, `path`,
`headers`, `cookies`, `ip`, `originalUrl` y `xhr` recibidos. Útil para inspeccionar
qué está mandando realmente el cliente.

<!--lang:en--]

With `echo: true` a `/echo` service is added, that answers with the received
`query`, `path`, `headers`, `cookies`, `ip`, `originalUrl` and `xhr`. Useful to
inspect what the client is actually sending.

[!--lang:*-->

# webpack

<!--lang:es-->

Si existe un `webpack.config.js` en el directorio actual, se carga y se sirve a través de
[webpack-dev-middleware](https://www.npmjs.com/package/webpack-dev-middleware)
(por omisión bajo `/dist`).

<!--lang:en--]

If a `webpack.config.js` exists in the current directory, it is loaded and served
through [webpack-dev-middleware](https://www.npmjs.com/package/webpack-dev-middleware)
(by default under `/dist`).

[!--lang:es-->

Desde la versión 2.0 `webpack` y `webpack-dev-middleware` son dependencias opcionales
(`peerDependencies`), así que para usar `webpack.config.js` hay que instalarlas en el proyecto:

<!--lang:en--]

Since version 2.0 `webpack` and `webpack-dev-middleware` are optional dependencies
(`peerDependencies`), so to use `webpack.config.js` they must be installed in the project:

[!--lang:*-->

```sh
npm install --save-dev webpack webpack-dev-middleware
```

# local-file-repo

<!--lang:es-->

Un almacén de archivos mínimo para mantener el estado entre recargas mientras se prueba.
Cuando `local-file-repo.enabled` está en true, se agregan tres servicios:

<!--lang:en--]

A minimal file store to keep state between reloads while testing. When
`local-file-repo.enabled` is true, three services are added:

[!--lang:*-->

| request                                   | action |
| ----------------------------------------- | ------ |
| `/file-read?file=NAME`                    | returns `{content, timestamp}` |
| `/file-write?file=NAME&content=TEXT`      | writes the file, returns `{timestamp}` |
| `/file-delete?file=NAME`                  | deletes the file, returns `{timestamp}` |

<!--lang:es-->

Las rutas y los métodos se configuran con `readRequest`, `writeRequest` y
`deleteRequest`. Los archivos se guardan en `local-file-repo.directory`, y el nombre
se sanitiza (todo carácter fuera de `-A-Za-z_0-9.@` se reemplaza por `_`), de modo que
el almacén es plano y no puede escaparse del directorio. A cada respuesta se le agrega
una demora al azar de hasta `local-file-repo.delay` milisegundos, para hacer visible la
asincronía durante las pruebas.

<!--lang:en--]

The paths and methods are configurable with `readRequest`, `writeRequest` and
`deleteRequest`. The files are stored in `local-file-repo.directory`, and the name
is sanitized (any character outside `-A-Za-z_0-9.@` is replaced by `_`), so the
store is flat and cannot escape the directory. A random delay of up to
`local-file-repo.delay` milliseconds is added to each response, to make the
asynchrony visible while testing.

[!--lang:*-->

# browser-test

<!--lang:es-->

Corre los tests de [mocha](https://mochajs.org/) en navegadores reales (Chrome y Firefox)
en modo _headless_ y sin _drivers_: _server4test_ genera una página que carga mocha y los
archivos indicados, lanza el navegador apuntando a esa página y espera que la página le
mande el resultado con un POST.

Se configura con la lista de archivos a cargar, en orden (mocha se carga solo, desde
`node_modules/mocha`):

<!--lang:en--]

Runs the [mocha](https://mochajs.org/) tests in real browsers (Chrome and Firefox)
in headless mode and without drivers: _server4test_ generates a page that loads mocha
and the listed files, launches the browser pointing to that page and waits for the page
to send the result with a POST.

It is configured with the list of files to load, in order (mocha is loaded automatically,
from `node_modules/mocha`):

[!--lang:*-->

```yaml
server4test:
  browser-test:
    files:
      - node_modules/require-bro/lib/require-bro.js
      - node_modules/expect.js/index.js
      - my-lib.js
      - test/test.js
    timeout: 120000 # ms waiting for the results of each browser (default 120000)
```

<!--lang:es-->

Para correrlos y terminar (con código de salida 0 si todo anduvo bien y 1 si no):

<!--lang:en--]

To run them and exit (with exit code 0 if all is ok and 1 otherwise):

[!--lang:*-->

```sh
server4test --run-browser chrome,firefox
```

<!--lang:es-->

Cada navegador corre por separado, con un perfil temporal, y el servidor usa un puerto
libre. Se muestra la salida de `console` de la página, los errores y los tests fallidos.
La corrida falla si falla algún test, si hay errores al cargar o ejecutar los archivos,
si no se corrió ningún test, si se vence el `timeout` o si el navegador termina antes de
mandar el resultado.

El navegador se busca en las variables de ambiente `CHROME_BIN` y `FIREFOX_BIN` y, si no
están, en los lugares habituales de cada sistema operativo. Los _runners_ `ubuntu` de
GitHub Actions ya traen Chrome y Firefox instalados.

Corriendo `server4test` sin `--run-browser` la página queda disponible en
`/server4test-browser-test` para abrirla a mano en cualquier navegador; el resultado se
muestra en la consola del servidor.

<!--lang:en--]

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

[!--lang:es-->

# usarlo como librería

<!--lang:en--]

# using it as a library

[!--lang:es-->

El servidor se puede extender para agregar servicios, sobreescribiendo `directServices()`:

<!--lang:en--]

The server can be extended to add services, overriding `directServices()`:

[!--lang:*-->

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

<!--lang:es-->

Cada servicio es `{path, method?}` más `html` (que se sirve como html) o
`middleware` (un _middleware_ de express). El `method` por omisión es `use`.

<!--lang:en--]

Each service is `{path, method?}` plus either `html` (served as html) or
`middleware` (an express middleware). The default `method` is `use`.

[!--lang:*-->
