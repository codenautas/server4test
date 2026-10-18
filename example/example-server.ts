import {Server4Test, Server4TestOpts, launch} from "../src/server4test";

class ExampleServer extends Server4Test{
    constructor(opts:Partial<Server4TestOpts>){
        super(opts)
    }
    directServices(){
        return super.directServices().concat([
            {path:'/dummy1' , html:'dummy 1'},
            {path:'/up-time', html:new Date().toString()},
        ])
    }
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises -- arranque del servidor ahí queda flotando
launch({serverClass:ExampleServer, server4test:{port:3339, verbose:true}})
