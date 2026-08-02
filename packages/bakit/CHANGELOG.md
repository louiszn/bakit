# bakit

## 4.0.0-alpha.13

### Patch Changes

- Updated dependencies [b970bc5]
  - @bakit/core@1.0.0-alpha.11

## 4.0.0-alpha.12

### Patch Changes

- 091478b: Moved internal logic of useListeners to ListenerRegistry
- 0ca44a7: Added a typed parameter system for defining and validating command arguments.
  Added message command parsing with CLI-style syntax, including support for positional arguments and named options.
  Added interaction command parsing using Discord application command options.
  Added context.values to provide parsed and validated parameter values directly in command handlers.
  Added InteractionOptions for convenient access to interaction options, including subcommand and subcommand group support.
  Improved command parsing architecture by separating message and interaction parsers from the command registry.
- Updated dependencies [0ca44a7]
  - @bakit/core@1.0.0-alpha.10

## 4.0.0-alpha.11

### Patch Changes

- 9b59a92: - Added user to BaseInteractionSnapshot
  - Renamed Context to LifecycleContext
- Updated dependencies [9b59a92]
  - @bakit/core@1.0.0-alpha.9

## 4.0.0-alpha.10

### Patch Changes

- 9aa53e3: Add lifecycle framework system

## 4.0.0-alpha.9

### Patch Changes

- Updated dependencies [e75e07c]
  - @bakit/core@1.0.0-alpha.8

## 4.0.0-alpha.8

### Patch Changes

- 5dae1cf: Reorganized entity managers, references, and snapshots into domain-based model modules.

  `BaseManager` has been renamed to `BaseEntityManager`. The Discord API `Routes` object is now also exported from `@bakit/core`.

- Updated dependencies [5dae1cf]
  - @bakit/core@1.0.0-alpha.7

## 4.0.0-alpha.7

### Patch Changes

- Updated dependencies [709e8ee]
  - @bakit/core@1.0.0-alpha.6

## 4.0.0-alpha.6

### Patch Changes

- Updated dependencies [3537a24]
  - @bakit/core@1.0.0-alpha.5

## 4.0.0-alpha.5

### Patch Changes

- Updated dependencies [e4a6cf4]
  - @bakit/core@1.0.0-alpha.4

## 4.0.0-alpha.4

### Patch Changes

- bf62817: Updated package.json information
- Updated dependencies [e459c36]
- Updated dependencies [bf62817]
  - @bakit/core@1.0.0-alpha.3

## 4.0.0-alpha.3

### Patch Changes

- f3eafd9: Moved discord-api-types export to discord-types
- Updated dependencies [a9ad3f5]
- Updated dependencies [f3eafd9]
  - @bakit/core@1.0.0-alpha.2

## 4.0.0-alpha.2

### Patch Changes

- 1f2517f: Resolved correct dependencies

## 4.0.0-alpha.1

### Patch Changes

- 7492aa2: Initial version
- Updated dependencies [7492aa2]
  - @bakit/core@1.0.0-alpha.1
