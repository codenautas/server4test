"use strict";

var express = require('express');
var MiniTools = require('mini-tools');
var serveContent = require('serve-content');

class Server{
    constructor(opts){
        this.app = express();
        this.opts = opts;
    }
    start(){
        var server = this;
        var baseUrl = '';
        var optsGenericForFiles={
            allowedExts:['', 'js', 'html', 'css', 'jpg', 'jpeg', 'png', 'ico', 'gif', 'eot', 'svg', 'ttf', 'woff', 'woff2', 'appcache']
        }
        server.port = this.opts.port;
        this.directServices().map(function(serviceDef){
            server.app.use(serviceDef.path, function(req, res, next){
                MiniTools.serveText(serviceDef.html,'html')(req,res,next);
            });
        });
        server.app.use(baseUrl+'/',serveContent(process.cwd(),optsGenericForFiles));
        return new Promise(function(resolve, reject){
            server.listener = server.app.listen(server.port, function(err){
                if(err){
                    reject(err);
                }else{
                    if(server.opts.verbose){
                        console.log("Listening at",server.port);
                    }
                    resolve();
                }
            });
        });
    }
    directServices(){
        return [];
    }
    closeServer(){
        var server = this;
        return new Promise(function(resolve,reject){
            try{
                server.listener.close(function(err){
                    if(server.opts.verbose){
                        console.log("server closed")
                    }
                    if(err){
                        reject(err);
                    }else{
                        resolve();
                    }
                });
            }catch(err){
                reject(err);
            }
        });
    }
}

module.exports = Server;