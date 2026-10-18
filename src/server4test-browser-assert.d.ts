declare type BrowserAssert = ((value: unknown, message?: string) => void) & {
    ok: (value: unknown, message?: string) => void
    equal: (actual: unknown, expected: unknown, message?: string) => void
    notEqual: (actual: unknown, expected: unknown, message?: string) => void
    strictEqual: (actual: unknown, expected: unknown, message?: string) => void
    notStrictEqual: (actual: unknown, expected: unknown, message?: string) => void
    deepEqual: (actual: unknown, expected: unknown, message?: string) => void
    notDeepEqual: (actual: unknown, expected: unknown, message?: string) => void
    deepStrictEqual: (actual: unknown, expected: unknown, message?: string) => void
    notDeepStrictEqual: (actual: unknown, expected: unknown, message?: string) => void
    fail: (message?: string) => void
    throws: (fn: () => void, expected?: unknown, message?: string) => void
    strict: BrowserAssert
};
declare const assert: BrowserAssert;
export = assert;
