import { GatewayIntentBits } from "discord-api-types/v10";

export type IntentResolvable = number | bigint | GatewayIntentBits | GatewayIntentBits[];

export class IntentsBitField {
	private readonly value: bigint;

	public constructor(input: IntentResolvable) {
		this.value = IntentsBitField.resolve(input);
	}

	public static resolve(input: IntentResolvable): bigint {
		if (Array.isArray(input)) {
			return input.reduce((acc, intent) => acc | BigInt(intent), 0n);
		}

		return BigInt(input);
	}

	public has(intent: GatewayIntentBits): boolean {
		return (this.value & BigInt(intent)) !== 0n;
	}

	public toBigInt(): bigint {
		return this.value;
	}

	public toNumber(): number {
		return Number(this.value);
	}

	public toJSON(): string {
		return this.value.toString();
	}

	public toString(): string {
		return this.value.toString();
	}
}
