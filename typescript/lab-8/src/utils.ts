function identity<T>(value: T): T {
    return value;
}

function first<T>(arr: T[]): T | undefined {
    return arr[0];
}

function groupBy<T>(items: T[], keyFn: (item: T) => string): Record<string, T[]> {
    const result: Record<string, T[]> = {};
    for (const item of items) {
        const key = keyFn(item);
        (result[key] ??= []).push(item);
    }
    return result;
}

function pipe<T>(...fns: Array<(arg: T) => T>): (arg: T) => T {
    return (arg: T): T => fns.reduce((acc, fn) => fn(acc), arg);
}

function memoize<A extends PropertyKey, R>(
    fn: (arg: A) => Promise<R>,
): (arg: A) => Promise<R> {
    const cache = new Map<A, Promise<R>>();
    return (arg: A): Promise<R> => {
        const cached = cache.get(arg);
        if (cached !== undefined) return cached;
        const promise = fn(arg);
        cache.set(arg, promise);
        return promise;
    };
}

export { identity, first, groupBy, pipe, memoize };
