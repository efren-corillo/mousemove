# Release Notes

## [1.2.20260514055636] - 2026-05-14
### Added
- Historical release notes for previous versions (v1.1.0 and v1.0.0).

## [1.2.0] - 2026-05-14
### Refactored
- **Idle Monitoring**: Improved state management with a new `_isIdle` flag to prevent redundant logging and notifications.
### Improved
- **Timing Logic**: Changed `check-interval` from milliseconds to minutes to reduce system overhead and provide more sensible defaults.
- **UX Improvements**: Removed intrusive notifications and cleaned up console logging.
### Documentation
- Added comprehensive JSDoc comments to `Indicator` and `MouseMoveExtension` classes for better maintainability.
### Changed
- **Setting Bounds**: Updated schema ranges for `check-interval` to 1-30 minutes.

## [1.1.0] - 2026-05-13
### Added
- Synchronize bash script with extension settings.
- Wayland compatibility improvements and movement visibility.
- Modernized extension for GNOME 45+ with native preferences.
### Fixed
- Logging reliability on Wayland.

## [1.0.0] - 2024-09-23
- Initial implementation of Mouse Move GNOME extension.
