#!/usr/bin/env -S npx tsx
import { fileURLToPath, pathToFileURL } from "node:url";
import { type ChildProcess, fork } from "node:child_process";
import { config as loadEnv } from "dotenv";

import { program } from "commander";
import glob from "tiny-glob";

import { getInternalService, ServiceRole, type Service } from "@bakit/service";

import pkg from "../../../package.json" with { type: "json" };

loadEnv();

program.name(pkg.name).description("Bakit CLI tool").version(pkg.version);

program
	.command("start")
	.description("Start the services")
	.argument("[name...]", "Name of the service to start")
	.action(start);

program.parse();

const cliPath = fileURLToPath(import.meta.url);

async function start(names: string[]): Promise<void> {
	await runSupervisor(names);
}

async function runSupervisor(names: string[] = []) {
	if (names.length === 1) {
		await runServiceWorker(names[0]!);
		return;
	}

	const services = await loadServices();

	if (names.length === 0) {
		return spawnServices(services);
	}

	const nameSet = new Set(names);

	const toStart = services.filter((s) => nameSet.has(s.name));

	// Detect missing services
	if (toStart.length !== nameSet.size) {
		const found = new Set(toStart.map((s) => s.name));
		const missing = names.filter((n) => !found.has(n));

		console.error(`Service(s) not found: ${missing.join(", ")}`);
		process.exit(1);
	}

	return spawnServices(toStart);
}

function spawnServices(services: Service[]) {
	const children: ChildProcess[] = [];

	process.on("SIGINT", shutdown);
	process.on("SIGTERM", shutdown);

	for (const service of services) {
		const child = fork(cliPath, ["start", service.name], {
			env: {
				...process.env,
				BAKIT_SERVICE_NAME: service.name,
			},
			stdio: "inherit",
		});

		child.on("exit", (code) => {
			console.log(`Service "${service.name}" exited with code ${code}`);
		});

		children.push(child);
	}

	async function shutdown() {
		await Promise.all(
			children.map((child) => {
				return new Promise<void>((resolve) => {
					child.once("exit", resolve);
					child.kill("SIGTERM");
					setTimeout(() => child.kill("SIGKILL"), 5000);
				});
			}),
		);

		process.exit(0);
	}
}

async function loadServices() {
	const paths = await glob("src/services/**/*.{js,ts}");

	return await Promise.all(
		paths.map(async (path) => {
			const url = pathToFileURL(path).href;

			return (await import(url)).default as Service;
		}),
	);
}

async function runServiceWorker(name: string) {
	const services = await loadServices();
	const service = services.find((s) => s.name === name);

	if (!service) {
		console.error(`Service "${name}" not found.`);
		process.exit(1);
	}

	await new Promise<void>((resolve) => {
		const internal = getInternalService(service);

		internal.bind(ServiceRole.Server);

		if (internal.runtime.role !== "server") {
			console.error(`Service "${name}" is not a server.`);
			process.exit(1);
		}

		internal.runtime.transport.once("listen", resolve);
	});

	console.log(`Service "${name}" started as server`);
}
