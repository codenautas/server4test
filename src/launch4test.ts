"#!/usr/bin/env node";

import {Server4Test, Server4TestOpts} from "./server4test";
import * as MiniTools from 'mini-tools';

async function launch(){
    var config = await MiniTools.readConfig([
        {
            server4test:{
                "server4test-directory":true,
                verbose:true
            }
        },
        'server4test-config',
        'local-config',
    ], {whenNotExist: 'ignore'});
    var server= new Server4Test(config.server4test);
    server.start();
    console.log('server listening at',server.port);
    if(config.server4test.verbose){
        console.log('server4test-config');
        console.dir(config, {depth:6});
    }
}

launch();