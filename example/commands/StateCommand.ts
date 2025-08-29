import { StateBox, type Context, Command } from "bakit";

const State = Command("state");

@Command.use(State)
export default class StateCommand {
	@StateBox.use(100)
	declare myStateCount: number;

	public count = 0;

	@State.pre
	public async preExecute(ctx: Context) {
		this.count++;
		this.myStateCount++;
		await ctx.send(
			`Pre-hook executed. Count: ${String(this.count)}, State count: ${String(this.myStateCount)}`,
		);
	}

	@State.main
	public async execute(ctx: Context) {
		this.count++;
		this.myStateCount++;
		await ctx.send(
			`Main command executed. Count: ${String(this.count)}, State count: ${String(this.myStateCount)}`,
		);
	}

	@State.post
	public async postExecute(ctx: Context) {
		this.count++;
		this.myStateCount++;
		await ctx.send(
			`Post-hook executed. Count: ${String(this.count)}, State count: ${String(this.myStateCount)}`,
		);
	}
}
