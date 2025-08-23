import "reflect-metadata";

import { Entry } from "./entry/Entry.js";

export const entry = new Entry("command");

export * from "./entry/GroupEntry.js";
