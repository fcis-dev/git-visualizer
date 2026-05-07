# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.14] - 2026-05-06
### Added
- Added standard Open Source License file (LICENSE).
- Added an interactive Log Panel to the interface.
### Fixed
- Polished minor UI details for better consistency.
- Corrected the display name for worktree paths.

## [0.1.13] - 2026-05-03
### Added
- Implemented minor design improvements to the commit graph.
- Added a local branch selector for Git worktrees.
### Fixed
- Resolved various minor errors and stability issues.

## [0.1.12] - 2026-04-26
### Added
- Introduced debugging configurations for development.
### Fixed
- Fixed a bug related to the Git commit command execution.

## [0.1.11] - 2026-04-21
### Added
- Improved the Reflog user interface.
- Added support for Git Large File Storage (LFS).
- Introduced support for managing Git hooks.
- Added drag-and-drop functionality to the commit graph.
- Implemented features to view and manage stash content.
### Fixed
- Fixed an issue with unstaged folders in source control.
- Corrected a bug causing wrong branch names to be displayed.
- Adjusted the width of design buttons in the branch sidebar.

## [0.1.10] - 2026-04-02
### Fixed
- Fixed an opacity bug in the commit graph on macOS.

## [0.1.10-1] - 2026-04-01
### Fixed
- General minor stability improvements.
- Fixed an unspecified bug on macOS.

## [0.1.9] - 2026-03-31
### Fixed
- Fixed graph rendering issues specific to macOS.

## [0.1.8] - 2026-03-30
### Fixed
- Addressed various macOS bugs and introduced general improvements.

## [0.1.7] - 2026-03-29
### Added
- Added an empty project placeholder window.
- Introduced a Project Settings panel.
### Fixed
- Fixed width issues in the project workspace header selector.
- Resolved issues related to graph loading states.
- Improved graph design and contextual menus.

## [0.1.6] - 2026-03-26
### Added
- Enabled sorting branch lists by folder structure.
- Added an option to checkout a branch immediately upon creation.
- Removed background blur from dialogs and made them draggable.
### Fixed
- Fixed theme changing behavior across all open windows.
- Resolved multi-window synchronization issues.
- Fixed display issues in the diff and blame windows.
- Resolved infinite loading state in the rescue sidebar.
- Fixed a visual flash when switching between projects.
- Updated and resolved dependency issues.
- Normalized UI CSS for cross-platform consistency.

## [0.1.5] - 2026-03-24
### Fixed
- Addressed minor user interface visual bugs.

## [0.1.4-1] - 2026-03-23
### Fixed
- Resolved a security issue related to path handling.

## [0.1.4] - 2026-03-22
### Added
- Added support for movable and resizable sidebars.
- Introduced full multi-window support.
- Added project persistence to remember previously opened projects.
### Changed
- Refactored the internal get language functionality.
- Refactored the source control sidebar controller.
### Fixed
- Fixed a security issue related to path traversal.
- Corrected file paths in the source control view.
- Fixed text ellipsis for long path names.
- Resolved console warning messages on the dashboard.
- Corrected the border radius styling in the commit graph.
- Removed the unnecessary success confirmation dialog after certain actions.
- Fixed graph rendering issues for staged files in the source tree.

## [0.1.3-3] - 2026-03-16
### Fixed
- Fixed application compilation errors.

## [0.1.3-2] - 2026-03-16
### Fixed
- Fixed issues when deleting remote branches.
- Corrected GitHub Actions CI/CD workflows.
- Improved and corrected language translations.

## [0.1.3-1] - 2026-03-13
### Fixed
- Released version 0.1.3-1 to address critical hotfixes.

## [0.1.3] - 2026-03-13
### Fixed
- Ensured the UI refreshes properly when a new branch or tag is created.

## [0.1.2] - 2026-03-12
### Added
- Redesigned the settings interface.
- Added a file search functionality.
- Implemented text syntax highlighting.
- Applied general UI redesigns across the application.
### Fixed
- Fixed the counter badge for push/pull actions.
- Addressed various application warnings.

## [0.1.1] - 2026-03-11
### Added
- Added the ability to delete remote tags.
- Introduced an auto-update feature to search for new releases.
### Fixed
- Fixed issues with the Tauri updater system.
- Corrected the layout of the settings modal and fetch buttons.
- Updated the Tauri updater public key.
- Fixed version numbering inconsistencies.
- Corrected the version displayed in settings.
- Fixed rules inside the `.gitignore` file.
- Resolved WebKit-related rendering errors.

## [0.1.0] - 2026-03-07
### Added
- Initial setup for release configurations.
- Added application language translations.
- Improved overall rendering and performance.
- Enhanced theme color contrast for better accessibility.
- Added branch actions and interactive rebase design in the commit tree.
- Implemented support for Git worktrees.
- Added a visual Merge Conflict Editor.
- Added a project statistics graph.
- Implemented a rescue safe option and support for submodules.
- Added file history viewing and file staging functionalities.
- Introduced contextual branch menu actions.
- Redesigned the main interface layout.
- Added a search feature within the commit tree.
- Added a button to quickly scroll to HEAD.
- Redesigned the commit tree visualization.
- Added interactive rebase functionalities.
- Introduced a stash manager panel.
- Introduced a tags manager panel.
- Added support for amending commits.
- Added commit search filters.
- Implemented a commit files tree view.
- Changed overall layout design.
- Added more general functionalities and updated application icons.
- Added a project sidebar with local preferences support.
- Initial public release of Git Visualizer.
### Changed
- Extensive internal refactoring for better maintainability.
- Refactored the architecture of the commit tree design.
- Cleaned up overall application architecture.
### Fixed
- Fixed project compilation errors.
- Disabled remote action buttons when no remote is available.
- Fixed the counter badge on the stash button.
- Corrected checks, typography fonts, and syntax highlighting.
- Fixed pull translations and branch folder structures.
- Resolved issues with the commit tree search function.
- Fixed errors related to loading directories.
- Addressed checkout operational errors.
- Resolved minor bugs.
- Fixed several general application errors.
- Resolved rendering issues in the commit tree.
