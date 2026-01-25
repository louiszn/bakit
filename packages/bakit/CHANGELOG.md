# bakit

## 2.2.2

### Patch Changes

- @bakit/gateway:
  - Fixed incomplete message being deserialized.
- Updated dependencies
  - @bakit/gateway@2.1.7

## 2.2.1

### Patch Changes

- @bakit/gateway:
  - Fixed incomplete message being deserialized.

  bakit:
  - Added missing `guild_id` to message.
  - Added missing `helpers` to client.

- Updated dependencies
  - @bakit/gateway@2.1.6

## 2.2.0

### Minor Changes

- bakit:
  - Added Client API.

  @bakit/gateway:
  - Fixed error message after exiting the process.

### Patch Changes

- Updated dependencies
  - @bakit/gateway@2.1.5

## 2.1.2

### Patch Changes

- Fix: RPC messages being ignored
- Updated dependencies
  - @bakit/service@3.2.1

## 2.1.1

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
  - @bakit/service@3.2.0
  - @bakit/gateway@2.1.4
  - @bakit/rest@2.1.0

## 2.1.0

### Minor Changes

- @bakit/service: Implemented client binding on call.
  bakit: Added new command `bakit start`.

### Patch Changes

- Updated dependencies
  - @bakit/service@3.1.0
  - @bakit/gateway@2.1.3
  - @bakit/rest@2.0.3

## 2.0.2

### Patch Changes

- @bakit/service:
  - Implemented new runtime binding for server and client service.
  - Removed `createServiceServer` and `createrServiceClient`.
  - Added connection events for tranport API.
- Updated dependencies
  - @bakit/service@3.0.0
  - @bakit/gateway@2.1.2
  - @bakit/rest@2.0.2

## 2.0.1

### Patch Changes

- chore(deps): update runtime dependencies
  - Update ws to 8.19.0
  - Update p-queue to 9.1.0

- Updated dependencies
  - @bakit/utils@2.0.0
  - @bakit/service@2.0.1
  - @bakit/gateway@2.1.1
  - @bakit/rest@2.0.1

## 2.0.0

### Patch Changes

- Re-exported high-level API from sub-packages
