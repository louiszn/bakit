# @bakit/rest

## 3.0.4

### Patch Changes

- bakit:
  - Add cache layer
  - Add `DMChannel` and enhance User

  @bakit/rest:
  - Add missing B template for body type

## 3.0.3

### Patch Changes

- Switch to tsdown as roller
- Updated dependencies
  - @bakit/utils@3.0.1

## 3.0.2

### Patch Changes

- @bakit/utils:
  - Remove re-exporting packages

  bakit:
  - Implement Client with basic event handling
  - Implement basic API structures

- Updated dependencies
  - @bakit/utils@3.0.0

## 3.0.1

### Patch Changes

- @bakit/utils:
  - Add `isCommonJS` and `isESM` functions

  @bakit/gateway:
  - Add CommonJS support

  @bakit/service:
  - Add CommonJS support

  @bakit/rest:
  - Add CommonJS support

- Updated dependencies
  - @bakit/utils@2.3.0

## 3.0.0

### Major Changes

- @bakit/rest:
  - Migrated interfaces to class based
  - Simplifed REST into REST and RESTProxy
  - Enhanced error and rate limit handling
  - Added more events for REST and RESTProxy

  @bakit/utils:
  - Removed `createQueue` function and export `Queue` class from `p-queue`
  - Removed `createEventBus` function.

### Patch Changes

- Updated dependencies
  - @bakit/utils@2.1.0

## 2.1.0

### Minor Changes

- @bakit/service:
  - Added lifecycle hooks for `initialize` and `ready`.
  - Added `ready` state checking for transport and driver.

  @bakit/rest:
  - Removed REST transport proxy.
  - @bakit/service is no longer used.

  @bakit/gateway:
  - @bakit/service is no longer used.

  bakit:
  - TSX is no longer required.
  - Added a check for using TSX if possible.

## 2.0.3

### Patch Changes

- @bakit/service: Implemented client binding on call.
  bakit: Added new command `bakit start`.
- Updated dependencies
  - @bakit/service@3.1.0

## 2.0.2

### Patch Changes

- Updated dependencies
  - @bakit/service@3.0.0

## 2.0.1

### Patch Changes

- chore(deps): update runtime dependencies
  - Update ws to 8.19.0
  - Update p-queue to 9.1.0

- Updated dependencies
  - @bakit/utils@2.0.0
  - @bakit/service@2.0.1

## 2.0.0

### Patch Changes

- chore: migrate to changeset for versioning
- Updated dependencies
  - @bakit/service@2.0.0
