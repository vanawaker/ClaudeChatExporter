# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.0] - 2026-05-12

### Added
- Extension icons in 16 / 32 / 48 / 96 / 128 px, referenced from `manifest.json`.
- `author` and `homepage_url` fields in `manifest.json`.
- `README.md`, `LICENSE` (MIT), `CHANGELOG.md`, and `.gitignore`.

### Changed
- Extension ID (`browser_specific_settings.gecko.id`) set to `claude-chat-exporter@vanawaker` for the public release (was a local-only placeholder during private development).
- "No messages found" alert now links to the GitHub issues page.

## [0.3.1] - 2026-05-11

### Fixed
- Assistant messages were split into multiple `ASSISTANT` boxes when a single Claude response contained multiple paragraphs. The selector `[class*="font-claude-response"]` matched both the outer message wrapper and its nested paragraph wrappers; now only top-level matches are kept.

## [0.3.0] - 2026-05-11

### Changed
- Replaced the five-strategy fallback detection with two precise CSS selectors based on the verified Claude.ai DOM contract.
- Reorganized `content.js` into clearly-labeled sections (detection / extraction / formatting / metadata / download / orchestration / UI / debug / init).
- Reduced source size from ~380 lines to ~210 lines.

## [0.2.0] - 2026-05-10

### Added
- `window.cceDebug()` console helper for DOM diagnostics when selectors fail.
- Additional fallback strategies for message detection (now superseded in 0.3.0).

### Fixed
- Assistant messages were not being detected because Claude.ai does not use a `data-testid` attribute for them.

## [0.1.0] - 2026-05-10

### Added
- Initial release. Adds an "export .txt" button to Claude.ai conversation pages that downloads the current conversation as a formatted plain-text file.
