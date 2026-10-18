"use strict";

import browserAssert = require('../src/server4test-browser-assert');

import * as assert from 'assert';

describe("browser assert", function(){
    var expectAssertionError = (fn: () => void, message: string) => assert.throws(fn, (error: Error) => {
        assert.equal(error.name, 'AssertionError');
        assert.equal(error.message, message);
        return true;
    });
    it("checks truthy values", function(){
        browserAssert(1);
        browserAssert.ok('yes');
        expectAssertionError(() => browserAssert(0), 'The expression evaluated to a falsy value: 0');
        expectAssertionError(() => browserAssert.ok(false, 'custom message'), 'custom message');
    })
    it("compares with == and ===", function(){
        browserAssert.equal('1', 1);
        browserAssert.notEqual(1, 2);
        browserAssert.strictEqual(NaN, NaN);
        browserAssert.notStrictEqual('1', 1);
        expectAssertionError(() => browserAssert.equal(1, 2), '1 == 2');
        expectAssertionError(() => browserAssert.notEqual('1', 1), '"1" != 1');
        expectAssertionError(() => browserAssert.strictEqual('1', 1), '"1" === 1');
        expectAssertionError(() => browserAssert.notStrictEqual(1, 1), '1 !== 1');
        expectAssertionError(() => browserAssert.fail('it fails'), 'it fails');
    })
    it("compares deeply", function(){
        var cyclic1: {self?: unknown, n: number} = {n: 1};
        cyclic1.self = cyclic1;
        var cyclic2: {self?: unknown, n: number} = {n: 1};
        cyclic2.self = cyclic2;
        browserAssert.deepEqual({a: [1, '2', {b: new Date(2020, 1, 1)}], r: /x/g}, {a: ['1', 2, {b: new Date(2020, 1, 1)}], r: /x/g});
        browserAssert.deepStrictEqual({a: [1, {b: null}], e: new Error('m')}, {a: [1, {b: null}], e: new Error('m')});
        browserAssert.deepStrictEqual(cyclic1, cyclic2);
        browserAssert.deepStrictEqual([NaN], [NaN]);
        browserAssert.notDeepEqual({a: 1}, {a: 1, b: 2});
        browserAssert.notDeepStrictEqual({a: 1}, {a: '1'});
        browserAssert.notDeepStrictEqual([1], {0: 1});
        browserAssert.notDeepStrictEqual(new Date(2020, 1, 1), new Date(2020, 1, 2));
        browserAssert.notDeepStrictEqual(new Error('m'), new Error('n'));
        expectAssertionError(() => browserAssert.deepStrictEqual({a: 1}, {a: '1'}), '{"a":1} deepStrictEqual {"a":"1"}');
        expectAssertionError(() => browserAssert.deepEqual([1, 2], [1]), '[1,2] deepEqual [1]');
        expectAssertionError(() => browserAssert.notDeepEqual({a: 1}, {a: 1}), '{"a":1} notDeepEqual {"a":1}');
        assert.throws(() => browserAssert.deepEqual(new Map(), new Map()), /deepEqual does not support Map/);
    })
    it("has the strict mode", function(){
        var strict = browserAssert.strict;
        strict(1);
        strict.equal(1, 1);
        strict.deepEqual({a: [1]}, {a: [1]});
        strict.notEqual('1', 1);
        strict.notDeepEqual({a: 1}, {a: '1'});
        strict.throws(() => { throw new Error('x'); }, /x/);
        assert.equal(strict.strict, strict);
        expectAssertionError(() => strict.equal('1', 1), '"1" === 1');
        expectAssertionError(() => strict.deepEqual({a: 1}, {a: '1'}), '{"a":1} deepStrictEqual {"a":"1"}');
        expectAssertionError(() => strict.ok(0), 'The expression evaluated to a falsy value: 0');
    })
    it("checks thrown errors", function(){
        browserAssert.throws(() => { throw new TypeError('wrong type'); });
        browserAssert.throws(() => { throw new TypeError('wrong type'); }, TypeError);
        browserAssert.throws(() => { throw new TypeError('wrong type'); }, /^TypeError: wrong/);
        browserAssert.throws(() => { throw new TypeError('wrong type'); }, {name: 'TypeError', message: /wrong/});
        browserAssert.throws(() => { throw new TypeError('wrong type'); }, (error: Error) => error.message == 'wrong type');
        expectAssertionError(() => browserAssert.throws(() => undefined), 'Missing expected exception.');
        expectAssertionError(() => browserAssert.throws(() => undefined, 'must throw'), 'must throw');
        expectAssertionError(() => browserAssert.throws(() => { throw new Error('other'); }, TypeError), 'The error "Error: other" does not match the expected');
        expectAssertionError(() => browserAssert.throws(() => { throw new Error('other'); }, /wrong/), 'The error "Error: other" does not match the expected');
    })
})
