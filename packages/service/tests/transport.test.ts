import { describe, it, expect, vi } from "vitest";
import { attachEventBus } from "@bakit/utils";
import {
	createTransportClientProtocol,
	createTransportServerProtocol,
	RPCError,
	type BaseClientDriver,
	type BaseClientDriverEvents,
	type BaseServerDriver,
	type BaseServerDriverEvents,
} from "@/index.js";

function createPair() {
	const clientBase = {
		send: vi.fn(),
		connect: vi.fn(),
		disconnect: vi.fn(),
	};

	const serverBase = {
		send: vi.fn(),
		broadcast: vi.fn(),
		listen: vi.fn(),
	};

	const clientDriver: BaseClientDriver = attachEventBus<BaseClientDriverEvents, typeof clientBase>(clientBase);
	const serverDriver: BaseServerDriver = attachEventBus<BaseServerDriverEvents, typeof serverBase>(serverBase);

	const CONNECTION = Symbol("conn");

	clientBase.send.mockImplementation((msg) => {
		queueMicrotask(() => serverDriver.emit("message", CONNECTION, msg));
	});

	serverBase.send.mockImplementation((_conn, msg) => {
		queueMicrotask(() => clientDriver.emit("message", msg));
	});

	return {
		clientProtocol: createTransportClientProtocol(clientDriver),
		serverProtocol: createTransportServerProtocol(serverDriver),
		clientDriver,
		serverDriver,
		CONNECTION,
	};
}

describe("Transport", () => {
	it("expect server protocol to return 100 ms ealier", async () => {
		const { clientProtocol, serverProtocol } = createPair();

		serverProtocol.handle("update", (time: number) => time + 100);

		const now = Date.now();
		const result = await clientProtocol.request("update", now);

		expect(result).toBe(now + 100);
	});

	it("expect client protocol to receive error", async () => {
		const { clientProtocol, serverProtocol } = createPair();

		const error = new RPCError("boom");

		serverProtocol.handle("boom", () => {
			throw error;
		});

		await expect(clientProtocol.request("boom")).rejects.toThrow(error);
	});

	it("expect client protocol to receive unknown method error", async () => {
		const { clientProtocol } = createPair();

		const method = Date.now().toString();

		await expect(clientProtocol.request(method)).rejects.toThrow(`Unknown method: ${method}`);
	});

	it("multiple concurrent requests resolve correctly", async () => {
		const { clientProtocol, serverProtocol } = createPair();

		serverProtocol.handle("add", (a: number, b: number) => a + b);

		const p1 = clientProtocol.request("add", 1, 2);
		const p2 = clientProtocol.request("add", 10, 20);
		const p3 = clientProtocol.request("add", -5, 5);

		await expect(Promise.all([p1, p2, p3])).resolves.toEqual([3, 30, 0]);
	});

	it("handler receives all arguments correctly", async () => {
		const { clientProtocol, serverProtocol } = createPair();

		serverProtocol.handle("concat", (a: string, b: number, c: boolean) => {
			return `${a}:${b}:${c}`;
		});

		const result = await clientProtocol.request("concat", "x", 42, true);

		expect(result).toBe("x:42:true");
	});

	it("handler overwrite uses latest handler", async () => {
		const { clientProtocol, serverProtocol } = createPair();

		serverProtocol.handle("value", () => 1);
		serverProtocol.handle("value", () => 2);

		await expect(clientProtocol.request("value")).resolves.toBe(2);
	});

	it("non-Error throw is serialized into RPCError", async () => {
		const { clientProtocol, serverProtocol } = createPair();

		serverProtocol.handle("panic", () => {
			throw "panic";
		});

		await expect(clientProtocol.request("panic")).rejects.toBeInstanceOf(RPCError);
	});
});
