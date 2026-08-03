const SNOWFLAKE_REGEX = /\d{17,25}/;

export function extractSnowflake(value: string) {
	return SNOWFLAKE_REGEX.exec(value)?.[0];
}
