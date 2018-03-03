var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "../src/server4test"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var server4test_1 = require("../src/server4test");
    var ExampleServer = /** @class */ (function (_super) {
        __extends(ExampleServer, _super);
        function ExampleServer() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        ExampleServer.prototype.directServices = function () {
            return _super.prototype.directServices.call(this).concat([
                { path: '/dummy1', html: 'dummy 1' },
                { path: '/up-time', html: new Date().toString() },
            ]);
        };
        return ExampleServer;
    }(server4test_1.Server4Test));
    var server = new ExampleServer({ port: 3339, verbose: true });
    server.start().then(function () {
        console.log('try: http://localhost:3339/example/example.js.html');
    });
});
//# sourceMappingURL=example-server.js.map