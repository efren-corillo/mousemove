# Release Notes

## [1.2.20260514061540] - 2026-05-14
### Added
- Comprehensive historical release notes for all previous versions.
- Updated documentation and README consistency.

## [1.2.0] - 2026-05-14
### Added
- **Enable on Startup**: New setting to automatically activate mouse movement when GNOME Shell loads.
- **Monitoring Controls**: Simplified controls to reduce log noise and improve usability.
### Refactored
- **Idle Monitoring**: Improved state management with a new `_isIdle` flag to prevent redundant logging.
### Improved
- **Timing Logic**: Switched `check-interval` from milliseconds to minutes for better resource efficiency.
- **Documentation**: Added full JSDoc coverage to core classes.
### Changed
- **Setting Bounds**: Updated `check-interval` range to 1-30 minutes.

## [1.1.0] - 2026-05-13
### Added
- **Bash Integration**: Synchronized standalone `mousemove.sh` with extension settings.
- **Wayland Support**: Improved cursor movement visibility and logging reliability on Wayland sessions.
- **Modernization**: Full refactor for GNOME 45+ compatibility with native preferences UI.

## [1.0.0] - 2024-09-23
### Added
- Initial release with basic idle detection and mouse cursor movement.
