import { Loader } from "@/lib/loader/index.js";
import { resolve } from "node:path";

export abstract class HotReloadable {
	public constructor(public entryDirectory: string) {
		entryDirectory = resolve(entryDirectory);
	}

	public abstract unload(path: string): Promise<unknown>;
	public abstract load(path: string): Promise<unknown>;
	public abstract reload(path: string): Promise<unknown>;

	protected unloadFile(path: string) {
		return Loader.unload(path);
	}
}
