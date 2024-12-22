"use strict";

import { Server4Test, /*CONFIG_DEFAULT,*/ CONFIG_SUPER_INSECURE } from '../src/server4test';

import * as Path from 'path';

import * as assert from 'assert';

// import {promises as fs} from 'fs'

// const TIMEOUT_SPEED = 1000 * (process.env.BP_TIMEOUT_SPEED as unknown as number ?? 1);

function console_log<T>(x:T){
    console.log('____________',x)
    return x;
}

if (!console_log) console.log('dummy');

describe("connected", function(){
    var server: Server4Test
    var port = 8088
    var path = "./example"
    before(async function(){
        server = new Server4Test({...CONFIG_SUPER_INSECURE, port, "public-dir": path})
        console.log("starting server")
        await server.start()
        console.log("server listeining in", port)
    })
    after(async function(){
        if (false) {
            this.timeout(600000)
            console.log();
            console.log("waiting in", process.cwd(), Path.join(process.cwd(), path))
            await new Promise((resolve)=>setTimeout(resolve, 600000))
        }
        console.log("closing server")
        await server.closeServer();
        console.log("server done")
    })
    it("gets an example", async function(){
        const response = await fetch(`http://localhost:${port}/one-example.txt`);
        const status = response.status;
        assert.equal(status, 200);
        const content = await response.text();
        assert.equal(content.replace(/\r/,''),`This is one example\nin two lines.`)
    })
})

