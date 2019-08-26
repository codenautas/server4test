"#!/usr/bin/env node";

import {Server4Test, Server4TestOpts} from "./server4test";
import * as serveIndex from 'serve-index';
import * as MiniTools from 'mini-tools';


async function  launch(){
    var config = await MiniTools.readConfig([
        {
            server:{
                port: 8080,
                verbose: true,
                "serve-content":{
                    allowAllExts:true,
                    ".jade":{extOriginal:"jade"},
                    ".styl":{extOriginal:"styl"},
                },
            },
            "serve-directory":true,
            "base-dir":process.cwd()
        },
        'local-config'
    ], {whenNotExist: 'ignore'});
    var x:Server4TestOpts = config.server;
    var server= new Server4Test(config.server);
    server.start();
    server.app.use('/', serveIndex(config["base-dir"],{icons: true, view:'details'}));
    console.log('server listening at',server.port);
}

launch();