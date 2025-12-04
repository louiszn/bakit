// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ConstructorLike<Args extends any[] = any[], T = any> = new (...args: Args) => T;
