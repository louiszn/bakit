import { Events, GatewayIntentBits } from "discord.js";

const INTENT_GROUPS: Record<number, string[]> = {
	[GatewayIntentBits.Guilds]: [
		Events.GuildCreate,
		Events.GuildDelete,
		Events.GuildUpdate,
		Events.GuildUnavailable,
		Events.GuildRoleCreate,
		Events.GuildRoleDelete,
		Events.GuildRoleUpdate,
		Events.ChannelCreate,
		Events.ChannelDelete,
		Events.ChannelUpdate,
		Events.ChannelPinsUpdate,
		Events.ThreadCreate,
		Events.ThreadDelete,
		Events.ThreadUpdate,
		Events.ThreadListSync,
		Events.ThreadMemberUpdate,
		Events.ThreadMembersUpdate,
		Events.StageInstanceCreate,
		Events.StageInstanceUpdate,
		Events.StageInstanceDelete,
	],
	[GatewayIntentBits.GuildMembers]: [
		Events.GuildMemberAdd,
		Events.GuildMemberUpdate,
		Events.GuildMemberRemove,
		Events.ThreadMembersUpdate,
	],
	[GatewayIntentBits.GuildModeration]: [Events.GuildAuditLogEntryCreate, Events.GuildBanAdd, Events.GuildBanRemove],
	[GatewayIntentBits.GuildExpressions]: [
		Events.GuildEmojiCreate,
		Events.GuildEmojiDelete,
		Events.GuildEmojiUpdate,
		Events.GuildStickerCreate,
		Events.GuildStickerDelete,
		Events.GuildStickerUpdate,
		Events.GuildSoundboardSoundCreate,
		Events.GuildSoundboardSoundUpdate,
		Events.GuildSoundboardSoundDelete,
		Events.GuildSoundboardSoundsUpdate,
	],
	[GatewayIntentBits.GuildIntegrations]: [Events.GuildIntegrationsUpdate],
	[GatewayIntentBits.GuildWebhooks]: [Events.WebhooksUpdate],
	[GatewayIntentBits.GuildInvites]: [Events.InviteCreate, Events.InviteDelete],
	[GatewayIntentBits.GuildVoiceStates]: [Events.VoiceStateUpdate],
	[GatewayIntentBits.GuildPresences]: [Events.PresenceUpdate],
	[GatewayIntentBits.GuildMessages]: [
		Events.MessageCreate,
		Events.MessageUpdate,
		Events.MessageDelete,
		Events.MessageBulkDelete,
	],
	[GatewayIntentBits.GuildMessageReactions]: [
		Events.MessageReactionAdd,
		Events.MessageReactionRemove,
		Events.MessageReactionRemoveAll,
		Events.MessageReactionRemoveEmoji,
	],
	[GatewayIntentBits.GuildMessageTyping]: [Events.TypingStart],
	[GatewayIntentBits.DirectMessages]: [
		Events.MessageCreate,
		Events.MessageUpdate,
		Events.MessageDelete,
		Events.ChannelPinsUpdate,
	],
	[GatewayIntentBits.DirectMessageReactions]: [
		Events.MessageReactionAdd,
		Events.MessageReactionRemove,
		Events.MessageReactionRemoveAll,
		Events.MessageReactionRemoveEmoji,
	],
	[GatewayIntentBits.DirectMessageTyping]: [Events.TypingStart],
	[GatewayIntentBits.MessageContent]: [Events.MessageCreate, Events.MessageUpdate],
	[GatewayIntentBits.GuildScheduledEvents]: [
		Events.GuildScheduledEventCreate,
		Events.GuildScheduledEventDelete,
		Events.GuildScheduledEventUpdate,
		Events.GuildScheduledEventUserAdd,
		Events.GuildScheduledEventUserRemove,
	],
	[GatewayIntentBits.AutoModerationConfiguration]: [
		Events.AutoModerationRuleCreate,
		Events.AutoModerationRuleDelete,
		Events.AutoModerationRuleUpdate,
	],
	[GatewayIntentBits.AutoModerationExecution]: [Events.AutoModerationActionExecution],
	[GatewayIntentBits.GuildMessagePolls]: [Events.MessagePollVoteAdd, Events.MessagePollVoteRemove],
	[GatewayIntentBits.DirectMessagePolls]: [Events.MessagePollVoteAdd, Events.MessagePollVoteRemove],
};

export const EVENT_INTENT_MAPPING: Record<string, number[]> = {};

for (const [intentStr, events] of Object.entries(INTENT_GROUPS)) {
	const intent = Number(intentStr);

	for (const event of events) {
		EVENT_INTENT_MAPPING[event] ??= [];

		if (!EVENT_INTENT_MAPPING[event].includes(intent)) {
			EVENT_INTENT_MAPPING[event].push(intent);
		}
	}
}
