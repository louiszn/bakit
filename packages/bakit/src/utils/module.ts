import { createJiti } from "jiti";
import { fileURLToPath } from "url";
import { relative, sep } from "path";

export class Module {
	public static jiti = createJiti(process.cwd());

	public static async import<T>(module: string, defaultImport = false): Promise<T | null> {
		const path = this.resolve(module);

		if (!path) {
			return null;
		}

		try {
			// for some reason default only accepts `true` in typescript
			return await this.jiti.import<T>(path, { default: defaultImport as never });
		} catch (error) {
			console.error(`[Module] Import failed for ${path}:`, error);
			return null;
		}
	}

	public static isLoaded(module: string): boolean {
		const path = this.resolve(module);
		return !!path && !!this.jiti.cache[path];
	}

	public static unload(module: string): boolean {
		const path = this.resolve(module);

		if (!path || !this.jiti.cache[path]) {
			return false;
		}

		delete this.jiti.cache[path];
		return true;
	}

	public static resolve(module: string): string | null {
		try {
			const url = this.jiti.esmResolve(module);
			return fileURLToPath(url);
		} catch {
			return null;
		}
	}

	public static getTopLevel(path: string, entryDir: string): string | null {
		const rel = relative(entryDir, path);
		const segments = rel.split(sep);
		return segments[0] ?? null;
	}
}
