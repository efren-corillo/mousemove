# Release Notes - v1.2.0

## Changes
- **Refactored Idle Monitoring**: Improved state management with a new `_isIdle` flag to prevent redundant logging and notifications.
- **Improved Timing Logic**: Changed `check-interval` from milliseconds to minutes to reduce system overhead and provide more sensible defaults.
- **Documentation**: Added comprehensive JSDoc comments to `Indicator` and `MouseMoveExtension` classes for better maintainability.
- **UX Improvements**: Removed intrusive notifications and cleaned up console logging.
- **Setting Bounds**: Updated schema ranges for `check-interval` to 1-30 minutes.
