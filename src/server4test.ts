import * as express      from 'express';
import * as MiniTools    from 'mini-tools';
import * as serveContent from 'serve-content';
import {changing}  from 'best-globals';

export type Server4TestOpts={
    port:number, 
    verbose?:boolean,
    devel?:boolean,
    "serve-content"?:serveContent.serveContentOptions
}

serveContent.transformer.jade = changing(serveContent.transformer[''],{/*extOriginal:'jade', */ optionName:'.jade'});
serveContent.transformer.styl = changing(serveContent.transformer.css,{/*extOriginal:'styl', */ optionName:'.styl'});

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
        this.directServices().map(function(serviceDef){
            server.app.use(serviceDef.path, function(req, res, next){
                MiniTools.serveText(serviceDef.html,'html')(req,res);
            });
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
    directServices():Array<{path:string, html:string}>{
        return [];
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
