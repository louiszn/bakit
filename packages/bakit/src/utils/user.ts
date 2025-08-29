export function extractId(value: string): string | null {
	const idMatch = value.match(/^<@!?(\d+)>$/);

	if (idMatch) {
		return idMatch[1];
	}

	const numericMatch = value.match(/^(\d{17,19})$/);

	if (numericMatch) {
		return numericMatch[1];
	}

	return null;
}
