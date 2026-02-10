export const DISCORD_EPOCH = 1420070400000n;

export function getSnowflakeTimestamp(snowflake: string | bigint, epoch = DISCORD_EPOCH): number {
	return Number((BigInt(snowflake) >> 22n) + epoch);
}

export function getSnowflakeDate(snowflake: string | bigint, epoch = DISCORD_EPOCH): Date {
	return new Date(getSnowflakeTimestamp(snowflake, epoch));
}
