"use script";

let Server4test = require("../server4test.js");

class ExampleServer extends Server4test{
    constructor(opts){
        super(opts)
    }
    directServices(){
        return [].concat([
            {path:'/dummy1' , html:'dummy 1'},
            {path:'/up-time', html:new Date().toString()},
        ])
    }
}

var server = new ExampleServer({port:3339, verbose:true});

server.start().then(function(){
    console.log('try: http://localhost:3339/example/example.js.html');
});