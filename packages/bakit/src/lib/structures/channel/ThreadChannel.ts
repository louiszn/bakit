import { applyMixins } from "tiny-mixin";

import { BaseChannel } from "./BaseChannel.js";
import { GuildChannelMixin, TextBasedChannelMixin } from "@/lib/mixins/ChannelMixin.js";

import type { APIThreadChannel, ChannelType } from "discord-api-types/v10";

export interface PublicThread extends ThreadChannel {
	readonly type: ChannelType.PublicThread;
}

export interface PrivateThread extends ThreadChannel {
	readonly type: ChannelType.PrivateThread;
}

export interface AnnouncementThread extends ThreadChannel {
	readonly type: ChannelType.AnnouncementThread;
}

export type ThreadBasedChannel = PublicThread | PrivateThread | AnnouncementThread;

export class ThreadChannel extends applyMixins(BaseChannel<APIThreadChannel>, [
	GuildChannelMixin,
	TextBasedChannelMixin,
]) {
	public get ownerId() {
		return this.data.owner_id;
	}

	public get archived() {
		return this.data.thread_metadata?.archived ?? false;
	}

	public get locked() {
		return this.data.thread_metadata?.locked ?? false;
	}

	public get autoArchiveDuration() {
		return this.data.thread_metadata?.auto_archive_duration;
	}

	public get archiveTimestamp() {
		return this.data.thread_metadata?.archive_timestamp;
	}

	public get invitable() {
		return this.data.thread_metadata?.invitable;
	}

	public get memberCount() {
		return this.data.member_count;
	}

	public get messageCount() {
		return this.data.message_count;
	}

	public get totalMessageSent() {
		return this.data.total_message_sent;
	}
}
