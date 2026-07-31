---
"@bakit/command": patch
"bakit": patch
"@bakit/core": patch
---

Added a typed parameter system for defining and validating command arguments.
Added message command parsing with CLI-style syntax, including support for positional arguments and named options.
Added interaction command parsing using Discord application command options.
Added context.values to provide parsed and validated parameter values directly in command handlers.
Added InteractionOptions for convenient access to interaction options, including subcommand and subcommand group support.
Improved command parsing architecture by separating message and interaction parsers from the command registry.
