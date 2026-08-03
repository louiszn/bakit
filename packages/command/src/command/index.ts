import type { Command } from "./Command";
import type { CommandTree, Subcommand } from "./tree";

export * from "./BaseExecutableCommand";
export * from "./Command";
export * from "./tree";

export type RootCommand = Command | CommandTree;
export type ExecutableCommand = Command | Subcommand;
