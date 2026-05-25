# Skill: Bump Application Version (Subir Versión)

This skill defines the exact procedure that the AI agent or a developer must follow when requested to bump the version of the **GitVi** application.

## Trigger Phrase

This skill is activated when the user says:

- "Sube la versión a X.Y.Z"
- "Bump version to X.Y.Z"
- "Genera una nueva release X.Y.Z"
- "Crea la versión X.Y.Z"

---

## 1. Prerequisites and Synchronization Rule

In this project, the version number is tracked in multiple files. All of them **must** be kept in sync:

1. **Frontend Package**: `package.json`
2. **Tauri Config**: `src-tauri/tauri.conf.json`
3. **Rust Backend Package**: `src-tauri/Cargo.toml`

> [!IMPORTANT]
> The version numbers in these three files must always match exactly. For example, if the target version is `0.1.18`, all three files must reflect `0.1.18`.

---

## 2. Step-by-Step Execution Plan

### Step 2.1: Update Version Identifiers

Modify the version fields in the following files:

- **`package.json`**:
  Update the `"version"` field:

  ```json
  "version": "X.Y.Z"
  ```

- **`src-tauri/Cargo.toml`**:
  Update the `version` field under `[package]`:

  ```toml
  [package]
  name = "gitvi"
  version = "X.Y.Z"
  ```

- **`src-tauri/tauri.conf.json`**:
  Update the `"version"` field:
  ```json
  "version": "X.Y.Z"
  ```

### Step 2.2: Update the Changelog (`CHANGELOG.md`)

Execute the **Update Changelog** skill (refer to `update-changelog.md`) to generate the descriptive release notes for this version. Make sure to use the target version `X.Y.Z` as the context for the new notes.

### Step 2.3: Build Validation

Before committing the version bump, verify that the project compiles successfully:

1. Run `npm run build` to ensure typescript and production frontend build pass.
2. (Optional but recommended) Run `npm run tauri build` to compile the desktop bundle and verify Cargo dependencies are correct.

### Step 2.4: Git Commit and Tagging

Once files are successfully updated and built:

1. Stage the modified files:
   - `package.json`
   - `src-tauri/Cargo.toml`
   - `src-tauri/tauri.conf.json`
   - `CHANGELOG.md`
   - `package-lock.json` / `Cargo.lock` (if updated during the build step)
2. Commit the changes with a standardized message:
   ```bash
   git commit -m "version X.Y.Z"
   ```
3. Create a Git tag corresponding to the version:
   ```bash
   git tag -a vX.Y.Z -m "Release vX.Y.Z"
   ```
4. Push both the commit and the tag to the remote repository:
   ```bash
   git push origin main
   git push origin vX.Y.Z
   ```

---

## 3. Post-Release Verification

Verify that running the application locally displays the updated version in the Settings/About panel or console output to ensure correct injection.
