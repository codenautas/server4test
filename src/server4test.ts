import * as express      from 'express';
import * as MiniTools    from 'mini-tools';
import * as serveContent from 'serve-content';

export type Server4TestOpts={
    port:number, 
    verbose?:boolean
}

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
        await new Promise(function(resolve, reject){
            server.listener = server.app.listen(server.port, function(err){
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
                server.listener.close(function(err){
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
