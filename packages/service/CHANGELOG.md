# @bakit/service

## 4.0.0

### Major Changes

- @bakit/service:
  - Refactored concept and code structure

  @bakit/utils:
  - Added `instanceToObject`
  - Re-exported `tiny-glob`

### Patch Changes

- Updated dependencies
  - @bakit/utils@2.2.0

## 3.2.1

### Patch Changes

- Fix: RPC messages being ignored

## 3.2.0

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

## 3.1.0

### Minor Changes

- @bakit/service: Implemented client binding on call.
  bakit: Added new command `bakit start`.

## 3.0.0

### Major Changes

- @bakit/service:
  - Implemented new runtime binding for server and client service.
  - Removed `createServiceServer` and `createrServiceClient`.
  - Added connection events for tranport API.

## 2.0.1

### Patch Changes

- chore(deps): update runtime dependencies
  - Update ws to 8.19.0
  - Update p-queue to 9.1.0

- Updated dependencies
  - @bakit/utils@2.0.0

## 2.0.0

### Patch Changes

- chore: migrate to changeset for versioning
