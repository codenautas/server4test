import * as express      from 'express';
import * as cookieParser from 'cookie-parser';
import * as MiniTools    from "mini-tools";
import * as serveContent from 'serve-content';
import * as serveIndex   from 'serve-index';
import {changing, sleep} from 'best-globals';
import * as fs           from 'fs-extra';
import { existsSync }    from 'fs';
import * as Path         from 'path';
import { Request, Response } from 'express';

type RequestDefinition = {
    method:'get'|'post'|'put'|'delete'|'use',
    path:string
};
const CONFIG_DEFAULT:Server4TestOpts={
    port: 8080,
    verbose: true,
    "serve-content":{
        allowAllExts:true,
        /*
        ".jade":{extOriginal:"jade"},
        ".styl":{extOriginal:"styl"},
        */
    },
    "base-url":'',
    echo:false,
    "server4test-directory":false,
    "local-file-repo":{
        enabled: false,
        delay:200, 
        directory: "local-file-repo",
        readRequest:{
            method:'get',
            path:'/file-read'
        },
        writeRequest:{
            method:'get',
            path:'/file-write'
        },
        deleteRequest:{
            method:'get',
            path:'/file-delete'
        }
    }
};

export type Server4TestOpts={
    port:number, 
    verbose:boolean,
    devel?:boolean,
    "base-url":string,
    echo:boolean,
    "serve-content":serveContent.serveContentOptions,
    "public-dir"?:string|[string]
    "server4test-directory":boolean
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
    port:number=3000;
    listener:any;
    constructor(opts:Partial<Server4TestOpts>){
        this.app = express();
        this.opts = changing(CONFIG_DEFAULT, opts);
        this.app.use(cookieParser());
    }
    async start(): Promise<void>{
        var server = this;
        var baseUrl = this.opts["base-url"];
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
                server.app[method](Path.posix.join(baseUrl,serviceDef.path), middleware);
            }else{
                if(method=='use'){
                    server.app[method](middleware);
                }
                server.app[method](Path.posix.join(baseUrl,'/'),middleware);
            }
        });
        var paths=this.opts["public-dir"] == null ? [process.cwd()] : typeof this.opts["public-dir"] === "string" ? [this.opts["public-dir"]] : this.opts["public-dir"];
        paths.forEach((path, i)=>{
            if(this.opts["server4test-directory"] && !i){
                server.app.use(baseUrl+'/', serveIndex(path,{icons: true, view:'details'}));
            }
            server.app.use(baseUrl+'/',serveContent(path,optsGenericForFiles));
        })
        await new Promise(function(resolve, _reject){
            server.listener = server.app.listen(server.port, resolve);
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
        fun:(filename:string, params:{content:string})=>Promise<{content?:string, timestamp?:number}>
    ){
        return async (req:Request, res:Response)=>{
            if(this.opts.verbose){
                console.log(req.method, req.path, req.query);
            }
            try{
                await sleep(Math.random()*(this.opts["local-file-repo"].delay||100));
                if(typeof req.query.file !== "string") throw new Error('lack of filename');
                if(typeof req.query.content !== "string") throw new Error('invalid content format');
                var filename=Path.join(this.opts["local-file-repo"].directory,req.query.file.replace(/[^-A-Za-z_0-9.@]/g,'_'));
                var result = await fun(filename,{content:req.query.content});
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
                await fs.writeFile(filename, content, 'utf8')
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
            if(this.opts.verbose){
                console.log('using webpack.config.js')
            }
            var options = require(Path.resolve('./webpack.config.js'));
            services.push({path:'', middleware:this.webPackService(options)})
        }
        if(this.opts.echo){
            if(this.opts.verbose){
                console.log('serving echo')
            }
            services.push({path:'/echo', method:'get', middleware:(req:express.Request, res:express.Response, next?:express.NextFunction)=>{
                var result=`<pre>${
                    [
                        {l:'query', o:req.query},
                        {l:'path', o:req.path},
                        {l:'headers', o:req.headers},
                        {l:'cookies', o:req.cookies},
                        {l:'ip', o:req.ip},
                        {l:'ips', o:req.ips},
                        {l:'originalUrl', o:req.originalUrl},
                        {l:'rawTrailers', o:req.rawTrailers},
                        {l:'url', o:req.url},
                        {l:'xhr', o:req.xhr},
                    ].map(({l,o})=>l+': '+JSON.stringify(o,null,'    ')).join('\n\n').replace(/</g,'&lt;')
                }</pre>`;
                res.send(result);
            }})
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
