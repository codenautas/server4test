import {Server4Test} from "../src/server4test";

class ExampleServer extends Server4Test{
    directServices(){
        return super.directServices().concat([
            {path:'/dummy1' , html:'dummy 1'},
            {path:'/up-time', html:new Date().toString()},
        ])
    }
}

var server = new ExampleServer({port:3339, verbose:true});

server.start().then(function(){
    console.log('try: http://localhost:3339/example/example.js.html');
});