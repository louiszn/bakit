export enum ArgumentType {
	String = "string",
	Integer = "integer",
	Number = "number",
	User = "user",
	Member = "member",
	Literal = "literal",
}

export interface BaseArgumentOptions {
	type: ArgumentType;
	name: string;
	description?: string;
	required?: boolean;
	tuple?: boolean;
}

export interface StringArgumentOptions extends BaseArgumentOptions {
	type: ArgumentType.String;
	maxLength?: number;
	minLength?: number;
}

export interface IntegerArgumentOptions extends BaseArgumentOptions {
	type: ArgumentType.Integer;
	maxValue?: number;
	minValue?: number;
}

export interface NumberArgumentOptions extends BaseArgumentOptions {
	type: ArgumentType.Number;
	maxValue?: number;
	minValue?: number;
}

export interface UserArgumentOptions extends BaseArgumentOptions {
	type: ArgumentType.User;
}

export interface MemberArgumentOptions extends BaseArgumentOptions {
	type: ArgumentType.Member;
}

export interface LiteralArgumentOptions extends Omit<BaseArgumentOptions, "name"> {
	type: ArgumentType.Literal;
	value: string;
}

export type ArgumentOptions =
	| StringArgumentOptions
	| IntegerArgumentOptions
	| NumberArgumentOptions
	| UserArgumentOptions
	| MemberArgumentOptions;
