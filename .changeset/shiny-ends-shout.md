---
"@bakit/command": patch
"bakit": patch
"@bakit/core": patch
---

- Added support for command trees with subcommands and subcommand groups.
- Added a `parse` lifecycle that runs before command invocation, allowing plugins to observe or handle parsing.
- Introduced structured command error classes for parsing, validation, and execution, all carrying command metadata and execution context.
- Added a command error plugin API for centralized error handling.
- Lifecycle `onError` hooks now treat errors as handled by default. Errors are only rethrown when no `onError` handler is registered or when an error handler throws.
