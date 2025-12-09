import { createJiti } from "jiti";
import { relative, sep, resolve } from "path";

const jiti = createJiti(process.cwd());

export async function importModule<T>(modulePath: string, defaultImport = false): Promise<T | null> {
	const path = resolve(modulePath);
	try {
		// For some reasons, default only accepts true in TypeScript
		return await jiti.import<T>(path, { default: defaultImport as never });
	} catch (error) {
		console.error(`[Module] Import failed for ${path}:`, error);
		return null;
	}
}

export function isModuleLoaded(modulePath: string): boolean {
	const path = resolve(modulePath);
	return !!path && !!jiti.cache[path];
}

export function unloadModule(modulePath: string): boolean {
	const path = resolve(modulePath);
	if (!path || !jiti.cache[path]) return false;

	delete jiti.cache[path];
	return true;
}

export function getTopLevelDirectory(path: string, entryDir: string): string | null {
	const rel = relative(entryDir, path);
	const segments = rel.split(sep);
	return segments[0] ?? null;
}
