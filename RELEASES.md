# HatStart Release Notes

## [Unreleased]
### Added
- Initial MVP implementation
- Cross-platform support (Windows, macOS, Linux)
- Simple manifest-based tool catalog
- Basic tool installation via system package managers
- Job role recommendations
- Category-based tool selection
- Version management UI (connected but not fully functional)

### Changed
- Simplified from 50,000+ lines to under 5,000 lines
- Removed over-engineered dependency resolution system
- Streamlined manifest types to simple JSON structure

### Fixed
- Tool ID mapping for proper installation
- Electron app launch configuration
- TypeScript compilation errors

## [0.1.0] - TBD
### Initial Release
- First working version of HatStart
- Basic tool installation functionality
- Support for Homebrew (macOS), Chocolatey (Windows), APT (Linux)
- Simple UI for tool selection and installation

---

## Release Types
- **Major (X.0.0)**: Breaking changes to manifest format or core functionality
- **Minor (0.X.0)**: New features, new tool categories, enhanced functionality
- **Patch (0.0.X)**: Bug fixes, tool manifest updates, minor improvements

## Version History Format
Each release should document:
- **Added**: New features and functionality
- **Changed**: Changes to existing features
- **Deprecated**: Features that will be removed
- **Removed**: Features that were removed
- **Fixed**: Bug fixes
- **Security**: Security-related changes