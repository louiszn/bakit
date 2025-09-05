import { Awaitable } from "discord.js";

export type ConstructorLike = new (...args: unknown[]) => object;

export enum HookExecutionState {
	Main = "MAIN",
	Pre = "PRE",
	Post = "POST",
	Error = "ERROR",
}

export type BaseMainHookMethod<Args extends unknown[]> = (...args: Args) => Awaitable<void>;
export type BaseErrorHookMethod<Args extends unknown[]> = (
	error: unknown,
	...args: Args
) => Awaitable<void>;

export interface BaseHook {
	state: HookExecutionState;
	method: BaseMainHookMethod<never> | BaseErrorHookMethod<never>;
	entry: unknown;
}

export class BaseEntry<
	Constructor extends ConstructorLike,
	Hook extends BaseHook,
	MainHookMethod extends BaseMainHookMethod<never>,
	ErrorHookMethod extends BaseErrorHookMethod<never>,
> {
	protected target?: Constructor;

	public hooks: Record<HookExecutionState, Hook | undefined> = {
		[HookExecutionState.Main]: undefined,
		[HookExecutionState.Error]: undefined,
		[HookExecutionState.Post]: undefined,
		[HookExecutionState.Pre]: undefined,
	};

	public main;
	public pre;
	public post;
	public error;

	public constructor() {
		this.main = this.createMainHookDecorator(HookExecutionState.Main);
		this.pre = this.createMainHookDecorator(HookExecutionState.Pre);
		this.post = this.createMainHookDecorator(HookExecutionState.Post);
		this.error = this.createMainHookDecorator(HookExecutionState.Error);
	}

	public setTarget(target: Constructor) {
		this.target = target;
	}

	public createMainHookDecorator(state: HookExecutionState) {
		return <T extends MainHookMethod>(
			target: object,
			_key: string,
			descriptor: TypedPropertyDescriptor<T>,
		) => {
			this.addHook(state, target, descriptor);
		};
	}

	public createErrorHookDecorator(state: HookExecutionState) {
		return <T extends ErrorHookMethod>(
			target: object,
			_key: string,
			descriptor: TypedPropertyDescriptor<T>,
		) => {
			this.addHook(state, target, descriptor);
		};
	}

	protected addHook<T extends Hook["method"]>(
		state: HookExecutionState,
		target: object,
		descriptor: TypedPropertyDescriptor<T>,
	) {
		if (this.target && this.target !== target.constructor) {
			throw new Error("Hook is used at wrong constructor.");
		}

		const { value: method } = descriptor;

		if (typeof method !== "function") {
			throw new Error("Invalid target method for hook.");
		}

		const hook: BaseHook = {
			state,
			method,
			entry: this,
		};

		this.hooks[state] = hook as Hook;
	}
}
