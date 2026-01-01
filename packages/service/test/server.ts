import { createService, TransportDriver } from "../dist/index.js";

const service = createService({
	name: "hello_world",
	transport: {
		driver: TransportDriver.WebSocket,
		server: {
			port: 3000,
		},
		serverURL: "ws://localhost:3000",
	},
});

export const toUpper = service.define((value: string) => {
	return value.toUpperCase();
});

export default service;
