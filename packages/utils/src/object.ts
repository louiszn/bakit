export function isPlainObject(value: unknown): value is Record<PropertyKey, unknown> {
	if (typeof value !== "object" || value === null) {
		return false;
	}

	const proto = Object.getPrototypeOf(value);
	return proto === Object.prototype || proto === null;
}
