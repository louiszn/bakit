import { WebSocketServer, WebSocket } from "ws";

import { pack, unpack } from "msgpackr";
import { createEventEmitter } from "@bakit/utils";

import type { Serializable, Driver } from "@/types/driver.js";

export interface CreateWebSocketServerOptions {
	path?: string;
	port: number;
}

export function createWebSocketServer(options: CreateWebSocketServerOptions) {
	const { port, path } = options;

	const wss = new WebSocketServer({
		port,
		path,
	});

	const handler = createWebSocketHandler();

	wss.on("connection", (ws) => {
		handler.addSocket(ws);
		handler.emit("connect", ws);
	});
	wss.on("listening", () => handler.emit("ready"));
	wss.on("error", (err) => handler.emit("error", err));

	return Object.assign(handler, {
		start() {},
	}) satisfies Driver;
}

export function createWebSocketClient(url: string) {
	const handler = createWebSocketHandler();

	function start() {
		const ws = new WebSocket(url);
		handler.addSocket(ws);
	}

	return Object.assign(handler, {
		start,
	}) satisfies Driver;
}

export function createWebSocketHandler() {
	const sockets = new Set<WebSocket>();

	const emitter = createEventEmitter();

	function addSocket(socket: WebSocket) {
		sockets.add(socket);

		socket.on("open", () => {
			emitter.emit("connect", socket);
		});

		socket.on("close", () => {
			sockets.delete(socket);
			emitter.emit("disconnect", socket);
		});

		socket.on("error", (err) => {
			sockets.delete(socket);
			emitter.emit("error", err, socket);
		});

		socket.on("message", (data) => {
			try {
				const message = unpack(data as Buffer);
				emitter.emit("message", message);
			} catch (err) {
				emitter.emit("error", err, socket);
			}
		});
	}

	function send(data: Serializable) {
		for (const socket of sockets) {
			sendSocket(socket, data);
		}
	}

	function sendSocket(socket: WebSocket, data: Serializable) {
		const payload = pack(data);
		socket.send(payload);
	}

	return Object.assign(emitter, {
		sockets,
		addSocket,
		send,
		sendSocket,
	});
}
