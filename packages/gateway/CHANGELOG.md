# @bakit/gateway

## 2.1.4

### Patch Changes

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

- Updated dependencies
  - @bakit/rest@2.1.0

## 2.1.3

### Patch Changes

- @bakit/service: Implemented client binding on call.
  bakit: Added new command `bakit start`.
- Updated dependencies
  - @bakit/service@3.1.0
  - @bakit/rest@2.0.3

## 2.1.2

### Patch Changes

- Updated dependencies
  - @bakit/service@3.0.0
  - @bakit/rest@2.0.2

## 2.1.1

### Patch Changes

- chore(deps): update runtime dependencies
  - Update ws to 8.19.0
  - Update p-queue to 9.1.0

- Updated dependencies
  - @bakit/utils@2.0.0
  - @bakit/service@2.0.1
  - @bakit/rest@2.0.1

## 2.1.0

### Minor Changes

- Gateway manager will ask for a REST client instead of REST options

## 2.0.0

### Patch Changes

- chore: migrate to changeset for versioning
- Updated dependencies
  - @bakit/rest@2.0.0
  - @bakit/service@2.0.0
