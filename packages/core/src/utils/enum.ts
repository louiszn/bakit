export type EnumValue<T extends number> = `${T}` extends `${infer N extends number}` ? N : never;

export type NumericEnumObject<T extends object> = {
	readonly [K in Extract<keyof T, string> as T[K] extends number ? K : never]: EnumValue<
		Extract<T[K], number>
	>;
};

export function createNumericEnumObject<const T extends object>(
	enumObject: T,
): NumericEnumObject<T> {
	return Object.fromEntries(
		Object.entries(enumObject).filter(
			(entry): entry is [string, number] => typeof entry[1] === "number",
		),
	) as NumericEnumObject<T>;
}
