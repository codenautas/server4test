"#!/usr/bin/env node";

import {Server4Test, Server4TestOpts} from "./server4test";
import * as serveIndex from 'serve-index';
import * as MiniTools from 'mini-tools';


async function launch(){
    var config = await MiniTools.readConfig([
        {
            server4test:{
                port: 8080,
                verbose: true,
                "serve-content":{
                    allowAllExts:true,
                    ".jade":{extOriginal:"jade"},
                    ".styl":{extOriginal:"styl"},
                },
            },
            "server4test-directory":true,
            "server4test-base-dir":process.cwd()
        },
        'server4test-config',
        'local-config',
    ], {whenNotExist: 'ignore'});
    var x:Server4TestOpts = config.server4test;
    var server= new Server4Test(config.server4test);
    server.start();
    if(config["server4test-directory"]){
        server.app.use('/', serveIndex(config["server4test-base-dir"],{icons: true, view:'details'}));
    }
    console.log('server listening at',server.port);
    if(config.server4test.verbose){
        console.log('server4test-config');
        console.log(config);
    }
}

launch();