import { createConnection, createServer, Socket } from "node:net";
import { existsSync, unlinkSync } from "node:fs";
import { join } from "node:path";

import { unpack, pack } from "msgpackr";
import { createEventEmitter } from "@bakit/utils";

import type { Serializable, Driver } from "@/types/driver.js";

const { platform } = process;
const isWin32 = platform === "win32";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SocketOnMessage = (message: any) => void;

export interface CreateSocketHandlerOptions {
	onMessage: SocketOnMessage;
}

export function getIPCPath(id: string) {
	return isWin32 ? `\\\\.\\pipe\\${id}` : join("/tmp", `${id}.sock`);
}

export function createSocketServer(id: string) {
	const socketPath = getIPCPath(id);

	if (!isWin32 && existsSync(socketPath)) {
		unlinkSync(socketPath);
	}

	const handler = createSocketHandler();

	const server = createServer((socket) => {
		handler.addSocket(socket);
	});

	function start() {
		server.listen(socketPath, () => handler.emit("ready"));
	}

	return Object.assign(handler, {
		start,
	}) satisfies Driver;
}

export function createSocketClient(id: string) {
	const socketPath = getIPCPath(id);

	const handler = createSocketHandler();

	function start() {
		const socket = createConnection(socketPath);
		handler.addSocket(socket);
	}

	return Object.assign(handler, {
		start,
	}) satisfies Driver;
}

export function createSocketHandler() {
	const sockets = new Set<Socket>();
	const buffers = new WeakMap<Socket, Buffer>();

	const emitter = createEventEmitter();

	function addSocket(socket: Socket) {
		sockets.add(socket);
		buffers.set(socket, Buffer.alloc(0));

		socket.on("connect", () => emitter.emit("connect", socket));

		socket.on("close", () => {
			sockets.delete(socket);
			buffers.delete(socket);
			emitter.emit("disconnect", socket);
		});

		socket.on("error", (err) => {
			sockets.delete(socket);
			buffers.delete(socket);
			emitter.emit("error", err, socket);
		});

		socket.on("data", (data) => onData(socket, data as Buffer));
	}

	function onData(socket: Socket, chunk: Buffer) {
		let buffer = buffers.get(socket);

		if (!buffer) {
			return;
		}

		buffer = Buffer.concat([buffer, chunk]);

		while (true) {
			if (buffer.length < 4) {
				break;
			}

			const messageLength = buffer.readUInt32LE(0);

			if (buffer.length < 4 + messageLength) {
				break;
			}

			const payload = buffer.subarray(4, 4 + messageLength);

			try {
				const message = unpack(payload);
				emitter.emit("message", message);
			} catch (error) {
				console.error("Failed to unpack message:", error);
			}

			buffer = buffer.subarray(4 + messageLength);
		}

		buffers.set(socket, buffer);
	}

	function send(data: Serializable) {
		for (const socket of sockets) {
			sendSocket(socket, data);
		}
	}

	function sendSocket(socket: Socket, data: Serializable) {
		const payload = pack(data);

		const header = Buffer.alloc(4);
		header.writeUInt32LE(payload.length);

		const packet = Buffer.concat([header, payload]);
		socket.write(packet);
	}

	return Object.assign(emitter, {
		sockets,
		addSocket,
		send,
		sendSocket,
	});
}
