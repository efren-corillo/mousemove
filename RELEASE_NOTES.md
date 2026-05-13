# Release Notes

## [v1.3.20260514062856] - 2026-05-14
### Added
- **Randomize Movement**: New setting to vary the cursor jump distance (50-150% of base value) for a more natural feel.
- **CI/CD Workflow**: Automated metadata validation and packaging via GitHub Actions.
- **UI Improvements**: New toggle in preferences for movement randomization.

## [v1.2.20260514061540] - 2026-05-14
### Added
- Comprehensive historical release notes for all previous versions.
- Updated documentation and README consistency.

## [v1.2.0] - 2026-05-14
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

## [v1.1.0] - 2026-05-13
### Added
- **Bash Integration**: Synchronized standalone `mousemove.sh` with extension settings.
- **Wayland Support**: Improved cursor movement visibility and logging reliability on Wayland sessions.
- **Modernization**: Full refactor for GNOME 45+ compatibility with native preferences UI.

## [v1.0.0] - 2024-09-23
### Added
- Initial release with basic idle detection and mouse cursor movement.
