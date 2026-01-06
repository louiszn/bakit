export interface DiscordHTTPErrorEntry {
	code: string;
	message: string;
}

export interface DiscordHTTPErrorGroup {
	_errors: DiscordHTTPErrorEntry[];
}

export interface DiscordHTTPNestedErrors {
	[key: string]: DiscordHTTPErrorGroup | DiscordHTTPNestedErrors;
}

export interface DiscordHTTPValidationError {
	code: number;
	message: string;
	errors: Record<string, DiscordHTTPNestedErrors>;
}

export interface DiscordHTTPFlattenedError {
	code: string | number;
	field: string;
	message: string;
}

export class DiscordHTTPError extends Error {
	public errors: DiscordHTTPFlattenedError[] = [];

	constructor(data: DiscordHTTPValidationError) {
		super(data.message);

		this.name = `DiscordHTTPError[${data.code}]`;

		if (data.errors) {
			this.errors = DiscordHTTPError.flattenErrors(data.errors);
		}
	}

	public static flattenErrors(errors: DiscordHTTPNestedErrors, parentKey = ""): DiscordHTTPFlattenedError[] {
		return Object.entries(errors).flatMap(([key, value]) => {
			const isIndex = !isNaN(Number(key));
			const currentPath = parentKey ? (isIndex ? `${parentKey}[${key}]` : `${parentKey}.${key}`) : key;

			if (key === "_errors" && Array.isArray(value)) {
				return value.map((err) => ({
					code: err.code ?? 0,
					field: parentKey,
					message: err.message ?? "(no message provided)",
				}));
			}

			if (typeof value === "object" && value !== null) {
				return DiscordHTTPError.flattenErrors(value as DiscordHTTPNestedErrors, currentPath);
			}

			return [];
		});
	}
}
