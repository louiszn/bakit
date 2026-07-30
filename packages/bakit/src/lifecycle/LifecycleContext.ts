export class LifecycleContext<THook extends PropertyKey = PropertyKey> {
	#cancelled = false;
	readonly hook: THook;

	constructor(hook: THook) {
		this.hook = hook;
	}

	get cancelled(): boolean {
		return this.#cancelled;
	}

	cancel(): void {
		this.#cancelled = true;
	}
}
