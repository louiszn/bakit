import { existsSync } from "node:fs";
import { createConnection } from "node:net";
import { join } from "node:path";

const WINDOWS_PIPE_PREFIX = "\\\\.\\pipe\\";
const UNIX_SOCKET_DIR = "/tmp";

export function getIPCPath(id: string, platform = process.platform) {
	// Using a switch so we can add more weird OS adventures later.
	// Seriously, if you’re on some alien platform, good luck finding this code.
	switch (platform) {
		case "win32":
			// Windows pipes: where plumbers earn their paycheck.
			return `${WINDOWS_PIPE_PREFIX}${id}`;
		default:
			// Unix: just a cozy little socket file in /tmp
			return join(UNIX_SOCKET_DIR, `${id}.sock`);
	}
}

export function isServerRunning(path: string): Promise<boolean> {
	return new Promise((resolve) => {
		if (!existsSync(path)) {
			resolve(false);
			return;
		}

		// Try to connect with short timeout
		const socket = createConnection(path);

		const timer = setTimeout(() => {
			socket.destroy();
			resolve(false); // Connection timeout = probably not running
		}, 500);

		socket.once("connect", () => {
			clearTimeout(timer);
			socket.destroy();
			resolve(true); // Someone accepted the connection
		});

		socket.once("error", () => {
			clearTimeout(timer);
			socket.destroy();

			// ECONNREFUSED = socket file exists but no server listening (stale)
			// ENOENT = socket file doesn't exist
			// Both mean "no server running"
			resolve(false);
		});
	});
}
