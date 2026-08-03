# @bakit/core

## 1.0.0-alpha.13

### Patch Changes

- e0c2815: Added support for user option

## 1.0.0-alpha.12

### Patch Changes

- cd3a631: - Added support for command trees with subcommands and subcommand groups.
  - Added a `parse` lifecycle that runs before command invocation, allowing plugins to observe or handle parsing.
  - Introduced structured command error classes for parsing, validation, and execution, all carrying command metadata and execution context.
  - Added a command error plugin API for centralized error handling.
  - Lifecycle `onError` hooks now treat errors as handled by default. Errors are only rethrown when no `onError` handler is registered or when an error handler throws.

## 1.0.0-alpha.11

### Patch Changes

- b970bc5: Simplified unused interfaces

## 1.0.0-alpha.10

### Patch Changes

- 0ca44a7: Added a typed parameter system for defining and validating command arguments.
  Added message command parsing with CLI-style syntax, including support for positional arguments and named options.
  Added interaction command parsing using Discord application command options.
  Added context.values to provide parsed and validated parameter values directly in command handlers.
  Added InteractionOptions for convenient access to interaction options, including subcommand and subcommand group support.
  Improved command parsing architecture by separating message and interaction parsers from the command registry.

## 1.0.0-alpha.9

### Patch Changes

- 9b59a92: - Added user to BaseInteractionSnapshot
  - Renamed Context to LifecycleContext

## 1.0.0-alpha.8

### Patch Changes

- e75e07c: Fixed missing message content

## 1.0.0-alpha.7

### Patch Changes

- 5dae1cf: Reorganized entity managers, references, and snapshots into domain-based model modules.

  `BaseManager` has been renamed to `BaseEntityManager`. The Discord API `Routes` object is now also exported from `@bakit/core`.

## 1.0.0-alpha.6

### Patch Changes

- 709e8ee: Fixed flag resolving

## 1.0.0-alpha.5

### Patch Changes

- 3537a24: Update tiny-mixin

## 1.0.0-alpha.4

### Patch Changes

- e4a6cf4: Added interactionCreate
  Added base snapshots for Interaction
  Added constants with Intent and MessageFlag

## 1.0.0-alpha.3

### Patch Changes

- e459c36: Removed incorrect 4th arg to resolve correct receivedAt
- bf62817: Updated package.json information

## 1.0.0-alpha.2

### Patch Changes

- a9ad3f5: Added Intent from discord-api-types
- f3eafd9: Moved discord-api-types export to discord-types

## 1.0.0-alpha.1

### Patch Changes

- 7492aa2: Initial version
