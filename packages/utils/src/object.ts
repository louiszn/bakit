export function isPlainObject(value: unknown): value is Record<PropertyKey, unknown> {
	if (typeof value !== "object" || value === null) {
		return false;
	}

	const proto = Object.getPrototypeOf(value);
	return proto === Object.prototype || proto === null;
}

export function instanceToObject<T extends object>(instance: T): { [K in keyof T]: T[K] } {
	const result = {} as { [K in keyof T]: T[K] };

	const propertyNames = new Set<keyof T>();
	let current: object | null = instance;

	while (current && current !== Object.prototype) {
		for (const key of Object.getOwnPropertyNames(current)) {
			propertyNames.add(key as keyof T);
		}

		current = Object.getPrototypeOf(current);
	}

	propertyNames.delete("constructor" as keyof T);

	for (const key of propertyNames) {
		const descriptor =
			Object.getOwnPropertyDescriptor(instance, key) ??
			Object.getOwnPropertyDescriptor(Object.getPrototypeOf(instance), key);

		if (!descriptor) continue;

		if (typeof descriptor.value === "function") {
			// Bind method to original instance so 'this' always refers to T
			result[key] = descriptor.value.bind(instance);
		} else if (descriptor.get) {
			result[key] = instance[key];
		} else {
			result[key] = descriptor.value;
		}
	}

	return result;
}
