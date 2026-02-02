import { pathToFileURL } from "node:url";

import { Service } from "@bakit/service";
import type { FunctionLike } from "@bakit/utils";

async function start() {
	const { BAKIT_SERVICE_NAME, BAKIT_SERVICE_PATH } = process.env;

	if (typeof BAKIT_SERVICE_NAME !== "string") {
		throw new Error("BAKIT_SERVICE_NAME is not defined");
	}

	if (typeof BAKIT_SERVICE_PATH !== "string") {
		throw new Error("BAKIT_SERVICE_PATH is not defined");
	}

	const module: {
		service: Service;
		initialize: FunctionLike;
		onReady: FunctionLike;
		[key: string]: unknown;
	} = await import(pathToFileURL(BAKIT_SERVICE_PATH).toString());

	const { service, initialize, onReady } = module;

	if (!(service instanceof Service)) {
		throw new Error(`Service "${BAKIT_SERVICE_NAME}" is not an instance of Service`);
	}

	setupShutdown(service);

	if (typeof initialize === "function") {
		await Promise.resolve(initialize());
	}

	await service["ensureServerBound"]();

	if (typeof onReady === "function") {
		await Promise.resolve(onReady());
	}
}

async function setupShutdown(service: Service) {
	const shutdown = async () => {
		const runtime = service["runtime"];

		if (runtime?.role === "server") {
			await new Promise<void>((resolve) => {
				runtime.transport.on("close", resolve);
				runtime.transport.close();
			});
		}

		process.exit(0);
	};

	process.on("SIGINT", shutdown);
	process.on("SIGTERM", shutdown);
}

start();
