export function resolveFlags<T>(flags: number | T | readonly T[] | undefined): number {
	if (flags === undefined) {
		return 0;
	}

	if (typeof flags === "number") {
		return flags;
	}

	const values = Array.isArray(flags) ? flags : [flags];

	return values.reduce((result, flag) => result | Number(flag), 0);
}
