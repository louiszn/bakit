import { Entry } from "./Entry.js";

export class GroupEntry extends Entry {
	public commands = new Map<string, Entry>();

	public command(name: string) {
		const entry = new Entry(name);
		this.commands.set(name, entry);
		return entry;
	}
}

export function createGroup(name: string): GroupEntry {
	return new GroupEntry(name);
}
