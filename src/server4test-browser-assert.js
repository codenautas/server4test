"use strict";
/**
 * Browser replacement of the basic functions of the node module "assert" (ok, equal, notEqual, strictEqual,
 * notStrictEqual, deepEqual, notDeepEqual, deepStrictEqual, notDeepStrictEqual, throws, fail) and assert.strict.
 * deepEqual compares primitives, arrays, own enumerable keys, Date, RegExp and name/message of Error;
 * it throws for Map, Set and typed arrays (not supported). In the browser it defines window.assert, so require('assert') finds it with require-bro.
 * It is served in BROWSER_TEST_ASSERT_PATH, to be included in the browser-test files list.
 */
(function codenautasModuleDefinition(root, name, factory) {
    /* global define */
    /* istanbul ignore next */
    if(typeof root.globalModuleName !== 'string'){
        root.globalModuleName = name;
    }
    /* istanbul ignore next */
    if(typeof exports === 'object' && typeof module === 'object'){
        module.exports = factory();
    }else if(typeof define === 'function' && define.amd){
        define(factory);
    }else if(typeof exports === 'object'){
        exports[root.globalModuleName] = factory();
    }else{
        root[root.globalModuleName] = factory();
    }
    root.globalModuleName = null;
})(/*jshint -W040 */this, 'assert', function() {
/*jshint +W040 */
    function show(value){
        if(typeof value === 'string') return JSON.stringify(value);
        try{
            var json = JSON.stringify(value);
            return json === undefined ? String(value) : json;
        }catch(err){
            return String(value);
        }
    }
    function check(ok, message, actual, expected, operator){
        if(ok) return;
        if(message instanceof Error) throw message;
        var error = new Error(message || show(actual) + ' ' + operator + ' ' + show(expected));
        error.name = 'AssertionError';
        error.code = 'ERR_ASSERTION';
        error.actual = actual;
        error.expected = expected;
        error.operator = operator;
        throw error;
    }
    function isRegExp(value){
        return Object.prototype.toString.call(value) === '[object RegExp]';
    }
    function matches(error, expected){
        if(expected === undefined) return true;
        if(isRegExp(expected)) return expected.test(String(error));
        if(typeof expected === 'function'){
            if(expected.prototype !== undefined && error instanceof expected) return true;
            if(Error.isPrototypeOf(expected) || expected === Error) return false;
            return expected(error) === true;
        }
        return Object.keys(expected).every(function(key){
            return isRegExp(expected[key]) && typeof error[key] === 'string' ? expected[key].test(error[key]) : Object.is(error[key], expected[key]);
        });
    }
    function className(value){
        return Object.prototype.toString.call(value).slice(8, -1);
    }
    var unsupportedClasses = ['Map', 'Set', 'WeakMap', 'WeakSet', 'ArrayBuffer', 'DataView', 'Int8Array', 'Uint8Array',
        'Uint8ClampedArray', 'Int16Array', 'Uint16Array', 'Int32Array', 'Uint32Array', 'Float32Array', 'Float64Array',
        'BigInt64Array', 'BigUint64Array'];
    function deepEqual(actual, expected, strict, stack){
        if(strict ? Object.is(actual, expected) : actual == expected || actual !== actual && expected !== expected) return true;
        if(typeof actual !== 'object' || typeof expected !== 'object' || actual === null || expected === null) return false;
        if(strict && Object.getPrototypeOf(actual) !== Object.getPrototypeOf(expected)) return false;
        var actualClass = className(actual);
        if(actualClass !== className(expected)) return false;
        if(unsupportedClasses.indexOf(actualClass) >= 0){
            throw new Error('server4test assert: deepEqual does not support ' + actualClass);
        }
        if(actualClass === 'Date') return actual.getTime() === expected.getTime() || actual.getTime() !== actual.getTime() && expected.getTime() !== expected.getTime();
        if(actualClass === 'RegExp') return String(actual) === String(expected);
        if(actualClass === 'Error' && (actual.name !== expected.name || actual.message !== expected.message)) return false;
        for(var i = 0; i < stack.length; i++){
            if(stack[i][0] === actual && stack[i][1] === expected) return true;
        }
        var actualKeys = Object.keys(actual);
        var expectedKeys = Object.keys(expected);
        if(actualKeys.length !== expectedKeys.length) return false;
        stack.push([actual, expected]);
        var equal = actualKeys.every(function(key){
            return Object.prototype.hasOwnProperty.call(expected, key) && deepEqual(actual[key], expected[key], strict, stack);
        });
        stack.pop();
        return equal;
    }
    var assert = function assert(value, message){
        check(!!value, message || 'The expression evaluated to a falsy value: ' + show(value), value, true, '==');
    };
    assert.ok = assert;
    assert.equal = function equal(actual, expected, message){
        check(actual == expected, message, actual, expected, '==');
    };
    assert.notEqual = function notEqual(actual, expected, message){
        check(actual != expected, message, actual, expected, '!=');
    };
    assert.strictEqual = function strictEqual(actual, expected, message){
        check(Object.is(actual, expected), message, actual, expected, '===');
    };
    assert.notStrictEqual = function notStrictEqual(actual, expected, message){
        check(!Object.is(actual, expected), message, actual, expected, '!==');
    };
    assert.deepEqual = function deepEqual_(actual, expected, message){
        check(deepEqual(actual, expected, false, []), message, actual, expected, 'deepEqual');
    };
    assert.notDeepEqual = function notDeepEqual(actual, expected, message){
        check(!deepEqual(actual, expected, false, []), message, actual, expected, 'notDeepEqual');
    };
    assert.deepStrictEqual = function deepStrictEqual(actual, expected, message){
        check(deepEqual(actual, expected, true, []), message, actual, expected, 'deepStrictEqual');
    };
    assert.notDeepStrictEqual = function notDeepStrictEqual(actual, expected, message){
        check(!deepEqual(actual, expected, true, []), message, actual, expected, 'notDeepStrictEqual');
    };
    assert.fail = function fail(message){
        check(false, message || 'Failed', undefined, undefined, 'fail');
    };
    assert.throws = function throws(fn, expected, message){
        if(typeof expected === 'string'){
            message = expected;
            expected = undefined;
        }
        var thrown = false;
        var error;
        try{
            fn();
        }catch(err){
            thrown = true;
            error = err;
        }
        check(thrown, message || 'Missing expected exception.', undefined, expected, 'throws');
        check(matches(error, expected), message || 'The error ' + show(String(error)) + ' does not match the expected', error, expected, 'throws');
    };
    var strict = function strict(value, message){
        assert(value, message);
    };
    strict.ok = strict;
    strict.equal = assert.strictEqual;
    strict.notEqual = assert.notStrictEqual;
    strict.deepEqual = assert.deepStrictEqual;
    strict.notDeepEqual = assert.notDeepStrictEqual;
    ['strictEqual', 'notStrictEqual', 'deepStrictEqual', 'notDeepStrictEqual', 'throws', 'fail'].forEach(function(name){
        strict[name] = assert[name];
    });
    strict.strict = strict;
    assert.strict = strict;
    return assert;
});
