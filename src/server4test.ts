import * as express      from 'express';
import * as MiniTools    from "mini-tools";
import * as serveContent from 'serve-content';
import {changing, sleep}        from 'best-globals';
import * as fs           from 'fs-extra';
import { existsSync }    from 'fs';
import * as Path         from 'path';
import { Request, Response } from 'express';

type RequestDefinition = {
    method:'get'|'post'|'put'|'delete'|'use',
    path:string
};

export type Server4TestOpts={
    port:number, 
    verbose?:boolean,
    devel?:boolean,
    "serve-content"?:serveContent.serveContentOptions,
    "local-file-repo":{
        enabled: boolean,
        delay: number,
        directory:string,
        readRequest:RequestDefinition,
        writeRequest:RequestDefinition
        deleteRequest:RequestDefinition
    }
}

serveContent.transformer.jade = changing(serveContent.transformer[''],{/*extOriginal:'jade', */ optionName:'.jade'});
serveContent.transformer.styl = changing(serveContent.transformer.css,{/*extOriginal:'styl', */ optionName:'.styl'});

export type ServiceDef = {
    path:string, 
    method?:'get'|'post'|'delete'|'put'|'use'
} & (
    {html:string}|
    {middleware:(req:express.Request, res:express.Response, next?:express.NextFunction)=>any}
);

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
            var method = serviceDef.method||'use'
            if(serviceDef.path){
                server.app[method](serviceDef.path, middleware);
            }else{
                if(method=='use'){
                    server.app[method](middleware);
                }
                server.app[method]('/',middleware);
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
    localFileRepoMiddleware(
        fun:(filename:string, params?:{content:string})=>Promise<{content?:string, timestamp?:number}>
    ){
        return async (req:Request, res:Response)=>{
            if(this.opts.verbose){
                console.log(req.method, req.path, req.query);
            }
            try{
                await sleep(Math.random()*(this.opts["local-file-repo"].delay||100));
                var filename=Path.join(this.opts["local-file-repo"].directory,req.query.file.replace(/[^-A-Za-z_0-9.@]/g,'_'));
                var result = await fun(filename,req.query);
                var data = {...result, timestamp:result.timestamp || (await fs.stat(filename)).mtimeMs}
                await sleep(Math.random()*(this.opts["local-file-repo"].delay||100));
                res.send(JSON.stringify(data));
                res.end();
            }catch(err){
                console.log(req.path, req.query, err);
                res.statusCode=err.code=='ENOENT'?404:502;
                res.send('server error');
                res.end();
            }
        };
    }
    async launchEnsureDirOrDie(){
        try{
            await fs.ensureDir(this.opts["local-file-repo"].directory);
        }catch(err){
            console.log("Can't ensureDir",this.opts["local-file-repo"].directory);
            process.exit(1);
        }
    }
    fileServices(){
        this.launchEnsureDirOrDie();
        return [
            {...this.opts["local-file-repo"].readRequest, middleware:this.localFileRepoMiddleware(async (filename:string)=>{
                var content = await fs.readFile(filename, 'utf8')
                return {content};
            })},
            {...this.opts["local-file-repo"].writeRequest, middleware:this.localFileRepoMiddleware(async (filename:string, {content})=>{
                await fs.writeFile(filename, JSON.parse(content), 'utf8')
                return {};
            })},
            {...this.opts["local-file-repo"].deleteRequest, middleware:this.localFileRepoMiddleware(async (filename:string)=>{
                await fs.remove(filename)
                return {timestamp:new Date().getTime()};
            })},
        ]
    }
    directServices():Array<ServiceDef>{
        var services:ServiceDef[] = [];
        if(existsSync('./webpack.config.js')){
            console.log('using webpack.config.js')
            var options = require(Path.resolve('./webpack.config.js'));
            services.push({path:'', middleware:this.webPackService(options)})
        }
        if(this.opts["local-file-repo"].enabled){
            services = [...services, ...this.fileServices()];
            console.log('services', services)
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
