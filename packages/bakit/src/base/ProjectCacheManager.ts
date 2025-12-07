import { mkdirSync, existsSync, rmSync } from "node:fs";
import { writeFile, readFile, mkdir, rm } from "node:fs/promises";
import { join, dirname } from "node:path";
import { createHash } from "node:crypto";

export class ProjectCacheManager {
	private readonly rootDir: string;

	public constructor(root: string = process.cwd()) {
		this.rootDir = join(root, ".bakit");
		this.ensureRoot();
	}

	private ensureRoot() {
		if (!existsSync(this.rootDir)) {
			mkdirSync(this.rootDir, { recursive: true });
		}
	}

	public getHash(data: unknown): string {
		return createHash("sha256").update(JSON.stringify(data)).digest("hex");
	}

	public async write(path: string, data: unknown): Promise<void> {
		const fullPath = join(this.rootDir, path);
		const dir = dirname(fullPath);

		await mkdir(dir, { recursive: true });

		const content = typeof data === "string" ? data : JSON.stringify(data, null, 2);
		await writeFile(fullPath, content, "utf-8");
	}

	public async read<T>(path: string): Promise<T | null> {
		const fullPath = join(this.rootDir, path);

		try {
			const content = await readFile(fullPath, "utf-8");
			return JSON.parse(content) as T;
		} catch {
			return null;
		}
	}

	public async clear(): Promise<void> {
		await rm(this.rootDir, { recursive: true, force: true });
	}

	public clearSync(): void {
		if (existsSync(this.rootDir)) {
			rmSync(this.rootDir, { recursive: true, force: true });
		}
	}
}
