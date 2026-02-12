# @bakit/gateway

## 3.0.2

### Patch Changes

- @bakit/utils:
  - Remove re-exporting packages

  bakit:
  - Implement Client with basic event handling
  - Implement basic API structures

- Updated dependencies
  - @bakit/utils@3.0.0
  - @bakit/rest@3.0.2

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
  - @bakit/rest@3.0.1

## 3.0.0

### Major Changes

- - Refactor factory API to class-based API
  - Reimplement `Shard`
  - Reimplement `worker` -> `Cluster`
  - Reimplement `GatewayManager` -> `ShardingManager`
  - Add `ClusterProcess` as an interface to interact with `Cluster` as child process

## 2.1.9

### Patch Changes

- fix(shard): implement proper zlib decompression with sync flush detection

## 2.1.8

### Patch Changes

- fix(shard): correct zlib-stream compression handling
  - Remove incorrect manual Z_SYNC_FLUSH marker detection
  - Feed WebSocket data directly to zlib inflater with Z_SYNC_FLUSH mode
  - Improve JSON parsing with proper newline splitting
  - Add safety limits for compressed/decompressed payloads
  - Enhance error handling and cleanup

## 2.1.7

### Patch Changes

- @bakit/gateway:
  - Fixed incomplete message being deserialized.

## 2.1.6

### Patch Changes

- @bakit/gateway:
  - Fixed incomplete message being deserialized.

  bakit:
  - Added missing `guild_id` to message.
  - Added missing `helpers` to client.

## 2.1.5

### Patch Changes

- bakit:
  - Added Client API.

  @bakit/gateway:
  - Fixed error message after exiting the process.

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
