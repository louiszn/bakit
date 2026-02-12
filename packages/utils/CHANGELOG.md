# @bakit/utils

## 3.0.0

### Major Changes

- @bakit/utils:
  - Remove re-exporting packages

  bakit:
  - Implement Client with basic event handling
  - Implement basic API structures

## 2.3.0

### Minor Changes

- @bakit/utils:
  - Add `isCommonJS` and `isESM` functions

  @bakit/gateway:
  - Add CommonJS support

  @bakit/service:
  - Add CommonJS support

  @bakit/rest:
  - Add CommonJS support

## 2.2.0

### Minor Changes

- @bakit/service:
  - Refactored concept and code structure

  @bakit/utils:
  - Added `instanceToObject`
  - Re-exported `tiny-glob`

## 2.1.0

### Minor Changes

- @bakit/rest:
  - Migrated interfaces to class based
  - Simplifed REST into REST and RESTProxy
  - Enhanced error and rate limit handling
  - Added more events for REST and RESTProxy

  @bakit/utils:
  - Removed `createQueue` function and export `Queue` class from `p-queue`
  - Removed `createEventBus` function.

## 2.0.0

### Patch Changes

- chore(deps): update runtime dependencies
  - Update ws to 8.19.0
  - Update p-queue to 9.1.0
