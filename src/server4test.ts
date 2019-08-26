import * as express      from 'express';
import * as MiniTools    from "mini-tools";
import * as serveContent from 'serve-content';
import {changing}        from 'best-globals';
import { existsSync }    from 'fs';
import * as Path         from 'path';

export type Server4TestOpts={
    port:number, 
    verbose?:boolean,
    devel?:boolean,
    "serve-content"?:serveContent.serveContentOptions
}

serveContent.transformer.jade = changing(serveContent.transformer[''],{/*extOriginal:'jade', */ optionName:'.jade'});
serveContent.transformer.styl = changing(serveContent.transformer.css,{/*extOriginal:'styl', */ optionName:'.styl'});

export type ServiceDef = {path:string, html:string}|{path:string, middleware:(req:express.Request, res:express.Response, next?:express.NextFunction)=>any};

export class Server4Test{
    app:express.Express;
    opts:Server4TestOpts;
    port:number;
    listener:any;
    constructor(opts:Server4TestOpts){
        this.app = express();
        this.opts = opts;
    }
    async start(): Promise<void>{
        var server = this;
        var baseUrl = '';
        var optsGenericForFiles=changing({
            allowedExts:['', 'js', 'html', 'css', 'jpg', 'jpeg', 'png', 'ico', 'gif', 'eot', 'svg', 'ttf', 'woff', 'woff2', 'appcache', 'jade', 'styl']
        },this.opts["serve-content"]||{});
        server.port = this.opts.port;
        this.directServices().forEach(function(serviceDef){
            var middleware = 'middleware' in serviceDef?serviceDef.middleware:function(req:express.Request, res:express.Response){
                MiniTools.serveText(serviceDef.html,'html')(req,res);
            };
            if(serviceDef.path){
                server.app.use(serviceDef.path, middleware);
            }else{
                server.app.use(middleware);
                server.app.use('/',middleware);
            }
        });
        if(this.opts.devel){
            server.app.use()
        }
        server.app.use(baseUrl+'/',serveContent(process.cwd(),optsGenericForFiles));
        await new Promise(function(resolve, reject){
            server.listener = server.app.listen(server.port, function(err:Error){
                if(err){
                    reject(err);
                }else{
                    resolve();
                }
            });
        });
    }
    webPackService(webPackOptions:any, webpackDevMiddlewareOptions?:any){
        const webpack = require('webpack');
        const middleware = require('webpack-dev-middleware');
        const compiler = webpack(webPackOptions||{
        // webpack options
        });
        const express = require('express');
        const app = express();
        return middleware(compiler, webpackDevMiddlewareOptions||{
            publicPath:'/dist',
            headers: { "X-Custom-Header": "yes" }
            // webpack-dev-middleware options
        })
    }
    directServices():Array<ServiceDef>{
        var services = [];
        if(existsSync('./webpack.config.js')){
            console.log('using webpack.config.js')
            var options = require(Path.resolve('./webpack.config.js'));
            services.push({path:'', middleware:this.webPackService(options)})
        }
        return services;
    }
    async closeServer():Promise<void>{
        var server = this;
        await new Promise(function(resolve,reject){
            try{
                server.listener.close(function(err:Error){
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
