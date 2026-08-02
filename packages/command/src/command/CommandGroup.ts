export interface CommandGroupOptions {
	name: string;
	description?: string;
}

export class CommandGroup {
	readonly name: string;
	readonly description: string;

	constructor(options: CommandGroupOptions) {
		this.name = options.name;
		this.description = options.description ?? `${options.name} command`;
	}
}

export function useCommandGroup(options: CommandGroupOptions) {
	return new CommandGroup(options);
}
