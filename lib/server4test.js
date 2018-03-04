"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const MiniTools = require("mini-tools");
const serveContent = require("serve-content");
class Server4Test {
    constructor(opts) {
        this.app = express();
        this.opts = opts;
    }
    async start() {
        var server = this;
        var baseUrl = '';
        var optsGenericForFiles = {
            allowedExts: ['', 'js', 'html', 'css', 'jpg', 'jpeg', 'png', 'ico', 'gif', 'eot', 'svg', 'ttf', 'woff', 'woff2', 'appcache']
        };
        server.port = this.opts.port;
        this.directServices().map(function (serviceDef) {
            server.app.use(serviceDef.path, function (req, res, next) {
                MiniTools.serveText(serviceDef.html, 'html')(req, res, next);
            });
        });
        server.app.use(baseUrl + '/', serveContent(process.cwd(), optsGenericForFiles));
        await new Promise(function (resolve, reject) {
            server.listener = server.app.listen(server.port, function (err) {
                if (err) {
                    reject(err);
                }
                else {
                    resolve();
                }
            });
        });
    }
    directServices() {
        return [];
    }
    async closeServer() {
        var server = this;
        await new Promise(function (resolve, reject) {
            try {
                server.listener.close(function (err) {
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve();
                    }
                });
            }
            catch (err) {
                reject(err);
            }
        });
    }
}
exports.Server4Test = Server4Test;
//# sourceMappingURL=server4test.js.map