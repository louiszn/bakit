import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { pack } from "msgpackr";

import {
	createIPCClient,
	createIPCServer,
	createIPCSocketMessageHandler,
	getIPCPath,
	IPCServerState,
	SocketState,
	type IPCServer,
	type IPCSocketConnection,
} from "@/index.js";

function makePacket(value: unknown) {
	const payload = pack(value);
	const header = Buffer.alloc(4);
	header.writeUInt32LE(payload.length);
	return Buffer.concat([header, payload]);
}

describe("getIPCPath", () => {
	it("uses unix socket path by default", () => {
		const path = getIPCPath("test-id", "linux");
		expect(path).toBe("/tmp/test-id.sock");
	});

	it("uses windows pipe path on win32", () => {
		const path = getIPCPath("test-id", "win32");
		expect(path).toBe("\\\\.\\pipe\\test-id");
	});
});

describe("IPCSocketMessageHandler", () => {
	it("handles a single message", () => {
		const onMessage = vi.fn();

		const handler = createIPCSocketMessageHandler({
			onMessage,
			onWrite: vi.fn(),
		});

		handler.handleData(makePacket({ a: 1 }));

		expect(onMessage).toHaveBeenCalledWith({ a: 1 });
	});

	it("handles message split across chunks", () => {
		const onMessage = vi.fn();

		const handler = createIPCSocketMessageHandler({
			onMessage,
			onWrite: vi.fn(),
		});

		const message = Date.now().toString();
		const packet = makePacket(message);

		handler.handleData(packet.subarray(0, 2));
		expect(onMessage).not.toHaveBeenCalled();

		handler.handleData(packet.subarray(2));
		expect(onMessage).toHaveBeenCalledWith(message);
	});

	it("ignores incomplete payload until complete", () => {
		const onMessage = vi.fn();

		const handler = createIPCSocketMessageHandler({
			onMessage,
			onWrite: vi.fn(),
		});

		const message = Date.now().toString();
		const packet = makePacket(message);

		handler.handleData(packet.subarray(0, 5));
		expect(onMessage).not.toHaveBeenCalled();

		handler.handleData(packet.subarray(5));
		expect(onMessage).toHaveBeenCalledWith(message);
	});

	it("handles multiple messages in one chunk", () => {
		const onMessage = vi.fn();

		const handler = createIPCSocketMessageHandler({
			onMessage,
			onWrite: vi.fn(),
		});

		const chunk = Buffer.concat([makePacket(1), makePacket(2), makePacket(3)]);

		handler.handleData(chunk);

		expect(onMessage.mock.calls.map((c) => c[0])).toEqual([1, 2, 3]);
	});
});

describe("IPCServer integration", () => {
	let server: IPCServer;
	let client: IPCSocketConnection;

	beforeAll(async () => {
		const id = `ipc-test-${Date.now()}`;

		server = createIPCServer({ id });
		client = createIPCClient({ id });

		await new Promise<void>((resolve) => {
			const tryResolve = () => {
				if (client.state === SocketState.Connected && server.state === IPCServerState.Listening) {
					resolve();
				}
			};

			client.once("connect", tryResolve);
			server.once("listen", tryResolve);

			server.listen();
			client.connect();
		});
	});

	afterAll(async () => {
		await new Promise<void>((resolve) => {
			const tryResolve = () => {
				if (client.state === SocketState.Disconnected && server.state === IPCServerState.Closed) {
					resolve();
				}
			};

			client.once("disconnect", tryResolve);
			server.once("close", tryResolve);

			client.disconnect();
			server.close();
		});
	});

	it("delivers messages from client to server", async () => {
		const received: unknown[] = [];

		const promise = new Promise<void>((resolve) => {
			server.on("message", (_socket, msg) => {
				received.push(msg);
				resolve();
			});

			client.send({ hello: "world" });
		});

		await promise;

		expect(received).toEqual([{ hello: "world" }]);
	});
});
