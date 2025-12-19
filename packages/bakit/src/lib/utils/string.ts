export function tokenize(content: string): string[] {
	const args: string[] = [];
	let current = "";
	let quoteChar: '"' | null = null;
	let isEscaped = false;

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

/**
 * Extracts a valid Discord Snowflake (User ID, Channel ID, etc.) from a string.
 * @param input The raw string to parse
 * @returns The extracted ID string, or null if invalid
 */
export function extractSnowflakeId(input: string): string | null {
	if (!input) return null;

	const mentionMatch = /^<@!?(\d{17,20})>$/.exec(input);
	if (mentionMatch?.[1]) {
		return mentionMatch[1];
	}

	const idMatch = /^(\d{17,20})$/.exec(input);
	if (idMatch?.[1]) {
		return idMatch[1];
	}

	return null;
}
