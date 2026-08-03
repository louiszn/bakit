import { Collection, type ReadonlyCollection } from "bakit";

import type { ParameterMap } from "../BaseExecutableCommand";
import type { CommandTree } from "./CommandTree";
import { Subcommand, type SubcommandOptions } from "./Subcommand";

export interface SubcommandGroupOptions {
	name: string;
	description?: string;
}

export class SubcommandGroup {
	readonly name: string;
	readonly description: string;

	readonly parent: CommandTree;
	readonly commands: ReadonlyCollection<string, Subcommand> = new Collection();

	constructor(options: SubcommandGroupOptions, parent: CommandTree) {
		this.name = options.name;
		this.description = options.description ?? "command";
		this.parent = parent;
	}

	addSubcommand<const P extends ParameterMap>(options: SubcommandOptions<P>) {
		const command = new Subcommand<P>(options, this);
		(this.commands as Collection<string, Subcommand>).set(command.name, command as Subcommand);
		return command;
	}
}
