"use strict";

import {Server4Test, Server4TestOpts} from "./server4test";
import * as MiniTools from 'mini-tools';


async function  launch(){
    var config = await MiniTools.readConfig([
        {server:{
            port: 8080,
            verbose: true
        }},
        'local-config'
    ], {whenNotExist: 'ignore'});
    var server= new Server4Test(config.server);

}