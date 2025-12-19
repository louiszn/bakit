import { getConfig } from "@/config.js";
import { relative, resolve, sep } from "path";

export function getTopLevelDirectory(path: string, entryDir: string): string | null {
	const rel = relative(entryDir, path);
	const segments = rel.split(sep);
	return segments[0] ?? null;
}

export function getEntryDirectory() {
	return resolve(getConfig().entryDirectory);
}

export function getEntryFile() {
	return process.env["BAKIT_ENTRY_FILE"]!;
}
