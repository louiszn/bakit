import type { CommandHandler, ParameterMap } from "./ExecutableCommand";

export interface CommandOptions<P extends ParameterMap = ParameterMap> {
	name: string;
	description?: string;
	parameters?: P;
	execute: CommandHandler<P>;
}

export class Command<P extends ParameterMap = ParameterMap> {
	readonly name: string;
	readonly description: string;
	readonly parameters: P;
	readonly execute: CommandHandler<P>;

	constructor(options: CommandOptions<P>) {
		this.name = options.name;
		this.description = options.description ?? `${options.name} command`;
		this.parameters = options.parameters ?? ({} as P);

		for (const [name, parameter] of Object.entries(this.parameters)) {
			Object.defineProperty(parameter, "name", {
				value: parameter.name || name,
			});
		}

		this.execute = options.execute;
	}
}

export function useCommand<const P extends ParameterMap>(options: CommandOptions<P>) {
	return new Command(options);
}
