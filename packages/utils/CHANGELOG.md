# @bakit/utils

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
