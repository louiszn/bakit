import { Parameters, useCommandTree } from "../../src";

export const admin = useCommandTree({
	name: "admin",
});

const foo = admin.addGroup({
	name: "foo",
});

foo.addSubcommand({
	name: "bar",
	execute(ctx) {
		ctx.send("Bar");
	},
});

admin.addSubcommand({
	name: "ban",
	parameters: {
		user: Parameters.user({ required: true }),
	},
	execute(ctx) {
		ctx.send(`Banned <@${ctx.values.user.id}>`);
	},
});
