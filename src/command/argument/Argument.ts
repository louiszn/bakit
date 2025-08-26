export enum ArgumentType {
	String = "string",
	Integer = "integer",
	Number = "number",
	User = "user",
	Member = "member",
}

export interface BaseArgumentOptions {
	type: ArgumentType;
	name: string;
	description?: string;
	required?: boolean;
}

export interface StringArgumentOptions extends BaseArgumentOptions {
	type: ArgumentType.String;
}

export interface IntegerArgumentOptions extends BaseArgumentOptions {
	type: ArgumentType.Integer;
}

export interface NumberArgumentOptions extends BaseArgumentOptions {
	type: ArgumentType.Number;
}

export interface UserArgumentOptions extends BaseArgumentOptions {
	type: ArgumentType.User;
}

export interface MemberArgumentOptions extends BaseArgumentOptions {
	type: ArgumentType.Member;
}

export type ArgumentOptions =
	| StringArgumentOptions
	| IntegerArgumentOptions
	| NumberArgumentOptions
	| UserArgumentOptions
	| MemberArgumentOptions;
