import { Cluster, ClusterProcess } from "@bakit/gateway";

const {
	BAKIT_CLUSTER_ID,
	BAKIT_DISCORD_TOKEN,
	BAKIT_DISCORD_INTENTS,
	BAKIT_CLUSTER_TOTAL,
	BAKIT_DISCORD_GATEWAY_URL,
	BAKIT_DISCORD_GATEWAY_VERSION,
} = process.env;

const cluster = new Cluster(Number(BAKIT_CLUSTER_ID), {
	token: BAKIT_DISCORD_TOKEN!,
	intents: Number(BAKIT_DISCORD_INTENTS),
	total: Number(BAKIT_CLUSTER_TOTAL),
	gateway: {
		baseURL: BAKIT_DISCORD_GATEWAY_URL!,
		version: Number(BAKIT_DISCORD_GATEWAY_VERSION),
	},
});

ClusterProcess.bind(cluster);

await cluster.spawn();
