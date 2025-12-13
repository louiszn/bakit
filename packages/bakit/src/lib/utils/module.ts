import { relative, sep } from "path";

export function getTopLevelDirectory(path: string, entryDir: string): string | null {
	const rel = relative(entryDir, path);
	const segments = rel.split(sep);
	return segments[0] ?? null;
}
