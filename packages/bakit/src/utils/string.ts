export function tokenize(content: string): string[] {
	const args: string[] = [];
	let current = "";
	let quoteChar: '"' | null = null;
	let isEscaped = false;

	// eslint-disable-next-line @typescript-eslint/prefer-for-of
	for (let i = 0; i < content.length; i++) {
		const char = content[i];

		if (char === undefined) {
			break;
		}

		if (isEscaped) {
			current += char;
			isEscaped = false;
			continue;
		}

		if (char === "\\") {
			isEscaped = true;
			continue;
		}

		if (quoteChar) {
			if (char === quoteChar) {
				quoteChar = null;
			} else {
				current += char;
			}
		} else {
			if (char === '"') {
				quoteChar = char;
			} else if (/\s/.test(char)) {
				if (current.length > 0) {
					args.push(current);
					current = "";
				}
			} else {
				current += char;
			}
		}
	}

	if (current.length > 0) {
		args.push(current);
	}

	return args;
}
