import { StateBox, type Context, Command } from "bakit";

const _root = Command.create("state");

@Command.use(_root)
export default class StateCommand {
	@StateBox.use(100)
	declare myStateCount: number;

	public count = 0;

	@_root.pre
	public async preExecute(ctx: Context) {
		this.count++;
		this.myStateCount++;
		await ctx.send(
			`Pre-hook executed. Count: ${String(this.count)}, State count: ${String(this.myStateCount)}`,
		);
	}

	@_root.main
	public async execute(ctx: Context) {
		this.count++;
		this.myStateCount++;
		await ctx.send(
			`Main command executed. Count: ${String(this.count)}, State count: ${String(this.myStateCount)}`,
		);
	}

	@_root.post
	public async postExecute(ctx: Context) {
		this.count++;
		this.myStateCount++;
		await ctx.send(
			`Post-hook executed. Count: ${String(this.count)}, State count: ${String(this.myStateCount)}`,
		);
	}
}
