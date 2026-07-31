import { Collection } from "@discordjs/collection";
import {
	type APIApplicationCommandInteractionDataBasicOption,
	type APIApplicationCommandInteractionDataOption,
	type APIApplicationCommandInteractionDataSubcommandGroupOption,
	type APIApplicationCommandInteractionDataSubcommandOption,
	ApplicationCommandOptionType,
} from "discord-api-types/v10";

import type { ChatInputInteractionSnapshot } from "./ChatInputInteractionSnapshot";

type LeafOption = Exclude<
	APIApplicationCommandInteractionDataOption,
	| APIApplicationCommandInteractionDataSubcommandGroupOption
	| APIApplicationCommandInteractionDataSubcommandOption
>;

export class InteractionOptions implements Iterable<LeafOption> {
	readonly #data: readonly APIApplicationCommandInteractionDataOption[];
	readonly #options: Collection<string, LeafOption>;

	readonly subcommandGroup: string | null;
	readonly subcommand: string | null;

	constructor(interaction: ChatInputInteractionSnapshot) {
		this.#data = interaction.raw.data.options ?? [];

		const result = this.#hoistOptions(interaction.raw.data.options ?? []);

		this.subcommandGroup = result.group;
		this.subcommand = result.subcommand;

		this.#options = new Collection(result.options.map((option) => [option.name, option]));
	}

	get data() {
		return this.#data;
	}

	get size() {
		return this.#options.size;
	}

	has(name: string) {
		return this.#options.has(name);
	}

	get(name: string) {
		return this.#options.get(name);
	}

	getString(name: string) {
		return this.#getPrimitive<string>(name, ApplicationCommandOptionType.String);
	}

	getInteger(name: string) {
		return this.#getPrimitive<number>(name, ApplicationCommandOptionType.Integer);
	}

	getNumber(name: string) {
		return this.#getPrimitive<number>(name, ApplicationCommandOptionType.Number);
	}

	getBoolean(name: string) {
		return this.#getPrimitive<boolean>(name, ApplicationCommandOptionType.Boolean);
	}

	getFocused() {
		return this.#options.find((option) => "focused" in option && option.focused);
	}

	keys() {
		return this.#options.keys();
	}

	values() {
		return this.#options.values();
	}

	entries() {
		return this.#options.entries();
	}

	[Symbol.iterator]() {
		return this.values();
	}

	#getPrimitive<T>(name: string, type: ApplicationCommandOptionType): T | undefined {
		const option = this.#options.get(name);

		if (!option || option.type !== type) {
			return;
		}

		return (option as APIApplicationCommandInteractionDataBasicOption).value as T;
	}

	#hoistOptions(options: readonly APIApplicationCommandInteractionDataOption[]): {
		options: readonly LeafOption[];
		group: string | null;
		subcommand: string | null;
	} {
		let current = options;

		let group: string | null = null;
		let subcommand: string | null = null;

		if (current[0]?.type === ApplicationCommandOptionType.SubcommandGroup) {
			group = current[0].name;
			current = current[0].options ?? [];
		}

		if (current[0]?.type === ApplicationCommandOptionType.Subcommand) {
			subcommand = current[0].name;
			current = current[0].options ?? [];
		}

		return {
			options: current as readonly LeafOption[],
			group,
			subcommand,
		};
	}
}
