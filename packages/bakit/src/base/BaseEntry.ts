import { Awaitable } from "discord.js";

export type MainHookMethod<Args extends unknown[]> = (...args: Args) => Awaitable<void>;
export type ErrorHookMethod<Args extends unknown[]> = (
	error: unknown,
	...args: Args
) => Awaitable<void>;

export class BaseEntry<Args extends unknown[]> {
	public readonly hooks: {
		main?: MainHookMethod<Args>;
		pre?: MainHookMethod<Args>;
		post?: MainHookMethod<Args>;
		error?: ErrorHookMethod<Args>;
	} = {};

	public constructor(public options: object = {}) {}

	public setMain(fn: this["hooks"]["main"]): this {
		this.hooks.main = fn;
		return this;
	}

	public setPre(fn: this["hooks"]["pre"]): this {
		this.hooks.pre = fn;
		return this;
	}

	public setPost(fn: this["hooks"]["post"]): this {
		this.hooks.post = fn;
		return this;
	}

	public setError(fn: this["hooks"]["error"]): this {
		this.hooks.error = fn;
		return this;
	}
}
