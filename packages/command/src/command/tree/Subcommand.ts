import {
	BaseExecutableCommand,
	type ExecutableCommandOptions as BaseOptions,
	type ParameterMap,
} from "../BaseExecutableCommand";
import type { CommandTree } from "./CommandTree";
import type { SubcommandGroup } from "./SubcommandGroup";

export interface SubcommandOptions<P extends ParameterMap = ParameterMap> extends BaseOptions<P> {}

export class Subcommand<P extends ParameterMap = ParameterMap> extends BaseExecutableCommand<P> {
	parent: SubcommandGroup | CommandTree;

	constructor(options: SubcommandOptions<P>, parent: SubcommandGroup | CommandTree) {
		super(options);
		this.parent = parent;
	}
}
