# @bakit/command

## 1.0.0-alpha.7

### Patch Changes

- bc6f322: - Added a CLI entrypoint for command utilities.

  - Added `defineConfig()` and `loadConfig()` helpers for shared configuration.
  - Added reusable command loading utilities.

  - Moved `CommandRegistry` under the command runtime.
  - Moved parsers under the command module.
  - Updated exports to match the new project structure.

- cd3a631: - Added support for command trees with subcommands and subcommand groups.
  - Added a `parse` lifecycle that runs before command invocation, allowing plugins to observe or handle parsing.
  - Introduced structured command error classes for parsing, validation, and execution, all carrying command metadata and execution context.
  - Added a command error plugin API for centralized error handling.
  - Lifecycle `onError` hooks now treat errors as handled by default. Errors are only rethrown when no `onError` handler is registered or when an error handler throws.
- Updated dependencies [cd3a631]
  - bakit@4.0.0-alpha.14

## 1.0.0-alpha.6

### Patch Changes

- e3316da: Simplified parameters design
  - bakit@4.0.0-alpha.13

## 1.0.0-alpha.5

### Patch Changes

- 0ca44a7: Added a typed parameter system for defining and validating command arguments.
  Added message command parsing with CLI-style syntax, including support for positional arguments and named options.
  Added interaction command parsing using Discord application command options.
  Added context.values to provide parsed and validated parameter values directly in command handlers.
  Added InteractionOptions for convenient access to interaction options, including subcommand and subcommand group support.
  Improved command parsing architecture by separating message and interaction parsers from the command registry.
- Updated dependencies [091478b]
- Updated dependencies [0ca44a7]
  - bakit@4.0.0-alpha.12

## 1.0.0-alpha.4

### Patch Changes

- fc3bd23: - Passes prefixes to CommandRegistry
  - Fixed prefixes type in options

## 1.0.0-alpha.3

### Patch Changes

- 9062190: Correct prefixes type and add useCommand

## 1.0.0-alpha.2

### Patch Changes

- b10a3ac: Renamed useListeners to useCommands

## 1.0.0-alpha.1

### Patch Changes

- 9b59a92: - Added user to BaseInteractionSnapshot
  - Renamed Context to LifecycleContext
- Updated dependencies [9b59a92]
  - bakit@4.0.0-alpha.11
