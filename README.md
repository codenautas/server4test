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
```