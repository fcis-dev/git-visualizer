# Skill: Update Changelog (Actualizar Changelog)

This skill defines the exact procedure that the AI agent or developer must follow to update the `CHANGELOG.md` file with new release notes.

## Trigger Phrase

This skill is activated when the user says:
- "Actualiza el changelog"
- "Update the changelog"
- "Añade los cambios al changelog"
- "Genera las notas de la versión"
- "Escribe el changelog"

---

## Step-by-Step Execution Plan

### Step 1: Identify and Analyze Changes

Do not rely solely on the commit titles or messages, as they can be too brief or purely technical. Instead:
1. Identify the previous version tag (e.g., `vX.Y.Z`).
2. Inspect the actual changes since that version by running a command such as `git log vX.Y.Z..HEAD -p` or viewing specific commit diffs.
3. Analyze the code diffs to fully understand the real impact and purpose of each change.

### Step 2: Write Descriptive Release Notes

Translate the technical changes into clear, user-facing descriptions:
- Explain **what** was added or modified and **why** it matters.
- For bug fixes, describe the issue that was resolved and its effect on the application.
- **Rule**: NEVER copy and paste the raw commit messages directly into the changelog.

### Step 3: Insert into `CHANGELOG.md`

Update the file adhering to the [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) format:

1. Open `CHANGELOG.md`.
2. Locate the header of the **current/previous version** (e.g., `## [X.Y.Z] - YYYY-MM-DD`).
3. Insert the new version block **directly above** it. 
   *(Note: Do NOT move elements from the `## [Unreleased]` section, as it is usually maintained empty).*
   
   ```markdown
   ## [New.Version.Number] - YYYY-MM-DD
   ```

4. Categorize the descriptive notes under the new version header using the following sub-headers as needed:
   - `### Added` for new features.
   - `### Changed` for changes in existing functionality or refactors.
   - `### Deprecated` for soon-to-be-removed features.
   - `### Removed` for now-removed features.
   - `### Fixed` for any bug fixes.
   - `### Security` in case of vulnerabilities.
