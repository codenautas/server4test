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

/*
var server = new ExampleServer({port:3339, verbose:true});

server.start().then(function(){
    console.log('try: http://localhost:3339/example/example.html');
});
*/

launch({serverClass:ExampleServer, server4test:{port:3339, verbose:true}})