import { Cluster, ClusterProcess } from "@bakit/gateway";

const {
	BAKIT_CLUSTER_ID,
	BAKIT_DISCORD_TOKEN,
	BAKIT_DISCORD_INTENTS,
	BAKIT_DISCORD_GATEWAY_URL,
	BAKIT_DISCORD_GATEWAY_VERSION,
	BAKIT_CLUSTER_SHARD_TOTAL,
	BAKIT_CLUSTER_SHARD_LIST,
} = process.env;

const cluster = new Cluster(Number(BAKIT_CLUSTER_ID), {
	token: BAKIT_DISCORD_TOKEN!,
	intents: Number(BAKIT_DISCORD_INTENTS),
	total: Number(BAKIT_CLUSTER_SHARD_TOTAL),
	shards: JSON.parse(BAKIT_CLUSTER_SHARD_LIST!),
	gateway: {
		baseURL: BAKIT_DISCORD_GATEWAY_URL!,
		version: Number(BAKIT_DISCORD_GATEWAY_VERSION),
	},
});

ClusterProcess.bindProcess(cluster);

await cluster.spawn();
