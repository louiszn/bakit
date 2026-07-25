import tinyGlob from "tiny-glob";

export interface GlobOptions {
	cwd?: string;
	dot?: boolean;
	absolute?: boolean;
	filesOnly?: boolean;
	flush?: boolean;
}

function normalizePatterns(pattern?: string | readonly string[]): readonly string[] {
	if (!pattern) {
		return [];
	}

	return Array.isArray(pattern) ? pattern : [pattern as string];
}

export async function glob(pattern: string | readonly string[], options: GlobOptions) {
	const patterns = normalizePatterns(pattern);

	options.absolute ??= true;
	options.cwd ??= process.cwd();

	const matches = await Promise.all(patterns.map((p) => tinyGlob(p, options)));
	const files = [...new Set(matches.flat())];

	return files;
}
