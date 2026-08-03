import {
	BaseExecutableCommand,
	type ExecutableCommandOptions as BaseOptions,
	type ParameterMap,
} from "./BaseExecutableCommand";

export interface CommandOptions<P extends ParameterMap = ParameterMap> extends BaseOptions<P> {}

export class Command<P extends ParameterMap = ParameterMap> extends BaseExecutableCommand<P> {
	// biome-ignore lint/complexity/noUselessConstructor: Ignore for now
	constructor(options: CommandOptions<P>) {
		super(options);
	}
}

export function useCommand<const P extends ParameterMap>(options: CommandOptions<P>) {
	return new Command(options);
}
