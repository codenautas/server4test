import * as express      from 'express';
import * as cookieParser from 'cookie-parser';
import * as MiniTools    from "mini-tools";
import * as serveContent from 'serve-content';
import * as serveIndex   from 'serve-index';
import {changing, sleep} from 'best-globals';
import * as fs           from 'fs-extra';
import { existsSync }    from 'fs';
import * as Path         from 'path';
import {unexpected}      from 'cast-error';

type RequestDefinition = {
    method:'get'|'post'|'put'|'delete'|'use',
    path:string
};
export const CONFIG_DEFAULT:Server4TestOpts={
    port: 8080,
    verbose: true,
    "serve-content":{
        allowAllExts:false,
        allowedExts:['', 'png', 'jpg', 'jpeg', 'bmp', 'svg', 'gif', 'html', 'css', 'htm', 'js', 'manifest', 'cache', 'md', 'jade', 'styl', 'ico',
            /* FONTS: */ 'ttf', 'jfproj', 'pfa', 'woff', 'fnt', 'fot', 'otf', 'odttf', 'fon',
            /* OTHERS */ 'map', 'appcache', 'json', 'webmanifest', 'zip', 'pdf', 'xlsx', 'csv', 'mjs', 'jsx'
        ],
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
    },
    "serve-index": {icons: true, view:'details'}
};

export const CONFIG_SUPER_INSECURE:Server4TestOpts={
    ...CONFIG_DEFAULT,
    "serve-content":{
        allowAllExts:true,
        allowedExts:['', 'png', 'jpg', 'jpeg', 'bmp', 'svg', 'gif', 'html', 'css', 'htm', 'js', 'manifest', 'cache', 'md', 'jade', 'styl'],
        dotfiles: "allow",
        index: ["index.html", "index.htm", "index.js"]
        /*
        ".jade":{extOriginal:"jade"},
        ".styl":{extOriginal:"styl"},
        */
    },
    "server4test-directory":true,
    "local-file-repo":{
        ...CONFIG_DEFAULT["local-file-repo"],
        enabled: true,
    },
    "serve-index": {
        ...CONFIG_DEFAULT["serve-index"],
        hidden:true
    }
};

export type Server4TestOpts={
    port:number, 
    verbose:boolean,
    devel?:boolean,
    "base-url":string,
    echo:boolean,
    "serve-content":serveContent.ServeContentOptions,
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
    "serve-index":serveIndex.Options
}

serveContent.transformer.jade = changing(serveContent.transformer[''],{/*extOriginal:'jade', */ optionName:'jade-direct'});
serveContent.transformer.styl = changing(serveContent.transformer.css,{/*extOriginal:'styl', */ optionName:'styl-direct'});

export declare type Request = express.Request;
export declare type Response = express.Response;
export declare type NextFunction = express.NextFunction;

export type ServiceDef = {
    path:string, 
    method?:'get'|'post'|'delete'|'put'|'use'
} & (
    {html:string}|
    {middleware:(req:Request, res:Response, next?:NextFunction)=>any}
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
            allowedExts:['', 'js', 'html', 'css', 'jpg', 'jpeg', 'png', 'ico', 'gif', 'eot', 'svg', 'ttf', 'woff', 'woff2', 'appcache', 'jade', 'styl'],
            /*
            options:{
                "jade-direct":{extOriginal:'jade'},
                "styl-direct":{extOriginal:'styl'}
            },
            */
            "jade-direct":{extOriginal:'jade'},
            "styl-direct":{extOriginal:'styl'}
    },this.opts["serve-content"]||{});
        server.port = this.opts.port;
        this.directServices().forEach(function(serviceDef){
            var middleware = 'middleware' in serviceDef?serviceDef.middleware:function(req:Request, res:Response){
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
                server.serveIndex4Test(baseUrl, path);
            }
            server.app.use(baseUrl+'/',serveContent(path,optsGenericForFiles));
        })
        await new Promise<void>(function(resolve, _reject){
            server.listener = server.app.listen(server.port, resolve);
        });
    }
    webPackService(webPackOptions:any, webpackDevMiddlewareOptions?:any){
        const webpack = require('webpack');
        const middleware = require('webpack-dev-middleware');
        const compiler = webpack(webPackOptions||{
        // webpack options
        });
        // const express = require('express');
        // const app = express();
        return middleware(compiler, webpackDevMiddlewareOptions||{
            publicPath:'/dist',
            headers: { "X-Custom-Header": "yes" }
            // webpack-dev-middleware options
        })
    }
    localFileRepoMiddleware(
        fun:(filename:string, params:{content:string|null|undefined})=>Promise<{content?:string, timestamp?:number}>
    ){
        return async (req:Request, res:Response)=>{
            if(this.opts.verbose){
                console.log(req.method, req.path, req.query);
            }
            try{
                await sleep(Math.random()*(this.opts["local-file-repo"].delay||100));
                if(typeof req.query.file !== "string") throw new Error('lack of filename');
                if(req.query.content!=null && typeof req.query.content !== "string") throw new Error('invalid content format');
                var filename=Path.join(this.opts["local-file-repo"].directory,req.query.file.replace(/[^-A-Za-z_0-9.@]/g,'_'));
                var result = await fun(filename,{content:req.query.content as string});
                var data = {...result, timestamp:result.timestamp || (await fs.stat(filename)).mtimeMs}
                await sleep(Math.random()*(this.opts["local-file-repo"].delay||100));
                res.send(JSON.stringify(data));
                res.end();
            }catch(err){
                var error = unexpected(err);
                console.log(req.path, req.query, error);
                res.statusCode=error.code=='ENOENT'?404:502;
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
                if (content == null) throw new Error("null in content accesing local-file-repo")
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
            services.push({path:'/echo', method:'get', middleware:(req:Request, res:Response, _next?:NextFunction)=>{
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
    serveIndex4Test(baseUrl:string, path:string){
        var server = this;
        server.app.use(baseUrl+'/', function(req, res, next){
            var theOrinigalEnd = res.end;
            // @ts-expect-error hacky replace
            res.end = function(chunk, encoding, cb){
                if (typeof chunk == "string") {
                    chunk = chunk
                        .replace(/href="\/">~<\/a>/g, 'href="/?dir">~</a>')
                        .replace(/( \/ <a href="\/[^/<>"]+)(">)/g, '$1?dir$2')
                        .replace(/" class="icon icon-directory"/g, '?dir$&')
                }
                return theOrinigalEnd.call(res, chunk, encoding, cb);
            }
            if (req.query.dir !== undefined) {
                serveIndex(path, server.opts["serve-index"])(req, res, next);
            } else {
                next();
            }
        });
    }
    async closeServer():Promise<void>{
        var server = this;
        await new Promise<void>(function(resolve,reject){
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

export type LaunchOpts={
    serverClass:typeof Server4Test
    server4test:Partial<Server4TestOpts>
}

export async function launch(opts?:Partial<LaunchOpts>){
    var config = await MiniTools.readConfig<LaunchOpts>([
        {
            serverClass: Server4Test,
            server4test: process.argv.includes('--super-insecure') ? CONFIG_SUPER_INSECURE : CONFIG_DEFAULT
        },
        (opts||{}) as LaunchOpts,
        'server4test-config',
        'local-config',
    ], {whenNotExist: 'ignore'});
    var ServerConstructor = config.serverClass;
    var server = new ServerConstructor(config.server4test);
    server.start();
    if(config.server4test.verbose){
        console.log('server4test-config');
        console.dir(config, {depth:6});
    }
    console.log('server listening at','http://localhost:'+server.port+(config.server4test['base-url']??'')+'?dir');
    if(!config.server4test['server4test-directory']){
        console.error('server4test-directory is not set to true');
        console.warn('try', 'server4test --super-insecure');
        var dir = await fs.opendir('.');
        for await (const dirent of dir){
            var ext = Path.extname(dirent.name);
            if(config.server4test['serve-content']?.allowAllExts || ext && config.server4test['serve-content']?.allowedExts?.includes(ext)){
                console.log('  localhost:'+server.port+(config.server4test['base-url']??'')+'/'+dirent.name);
            }
        }
    }
}
