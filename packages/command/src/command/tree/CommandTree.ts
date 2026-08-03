import { Collection, type ReadonlyCollection } from "bakit";

import type { ParameterMap } from "../BaseExecutableCommand";
import { Subcommand, type SubcommandOptions } from "./Subcommand";
import { SubcommandGroup, type SubcommandGroupOptions } from "./SubcommandGroup";

export interface CommandTreeOptions {
	name: string;
	description?: string;
}

export class CommandTree {
	readonly name: string;
	readonly description: string;

	readonly groups: ReadonlyCollection<string, SubcommandGroup> = new Collection();
	readonly commands: ReadonlyCollection<string, Subcommand> = new Collection();

	constructor(options: CommandTreeOptions) {
		this.name = options.name;
		this.description = options.description ?? "command tree";
	}

	addGroup(options: SubcommandGroupOptions) {
		const group = new SubcommandGroup(options, this);
		(this.groups as Collection<string, SubcommandGroup>).set(group.name, group);
		return group;
	}

	addSubcommand<const P extends ParameterMap>(options: SubcommandOptions<P>) {
		const command = new Subcommand<P>(options, this);
		(this.commands as Collection<string, Subcommand>).set(command.name, command as Subcommand);
		return command;
	}
}

export function useCommandTree(options: CommandTreeOptions) {
	return new CommandTree(options);
}
