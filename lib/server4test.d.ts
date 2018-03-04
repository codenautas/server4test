/// <reference types="express" />
import * as express from 'express';
export declare class Server4Test {
    app: express.Express;
    opts: {
        port: number;
        verbose?: boolean;
    };
    port: number;
    listener: any;
    constructor(opts: {
        port: number;
        verbose?: boolean;
    });
    start(): Promise<void>;
    directServices(): Array<{
        path: string;
        html: string;
    }>;
    closeServer(): Promise<void>;
}
