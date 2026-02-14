# Git Visualizer

A desktop application built with Tauri, React, and D3.js to visualize Git commit history through an interactive graph.

## Overview

This project provides a graphical interface for exploring local Git repositories. It leverages Tauri for a lightweight desktop experience, React for the UI, and D3.js for rendering the complex commit graph structure.

## Features

- **Open Repository**: Browse and select any local Git repository using the native system dialog.
- **Commit Graph**: Visualizes commits and branch relationships using a D3.js-powered directed acyclic graph (DAG).
- **Dark Mode**: Sleek dark interface inspired by modern editors like VS Code.
- **Commit Details**: View author, date, message, and hash of the selected commit in a dedicated sidebar.
- **Infinite Scroll**: Efficiently handles large repositories.

## Prerequisites

Before running the project, ensure you have the following installed:

### System Dependencies

1.  **Node.js**: LTS version recommended. [Download Node.js](https://nodejs.org/)
2.  **Rust**: Stable version. Install via [rustup](https://rustup.rs/).
3.  **Build Tools**:
    - **Windows**: Microsoft Visual Studio C++ Build Tools.
    - **macOS**: Xcode Command Line Tools (`xcode-select --install`).
    - **Linux**: System dependencies (webkit2gtk, etc.). See [Tauri Linux Setup](https://tauri.app/v1/guides/getting-started/prerequisites#linux).

### Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/)
- **Extensions**:
  - [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode)
  - [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
  - [CodeLLDB](https://marketplace.visualstudio.com/items?itemName=vadimcn.vscode-lldb) (Required for debugging)
  - [Tailwind CSS IntelliSense](https://marketplace.visualstudio.com/items?itemName=bradlc.vscode-tailwindcss)
  - [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)
  - [Prettier - Code formatter](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)

## How to Run

1.  **Install Dependencies**:

    ```bash
    npm install
    # Install Rust dependencies automatically during build, or manually:
    cd src-tauri
    cargo build
    cd ..
    ```

2.  **Start Development Server**:
    This command will start the frontend server and the Tauri application window.

    ```bash
    npm run tauri dev
    ```

3.  **Build for Production**:
    Creates an optimized executable in `src-tauri/target/release`.
    ```bash
    npm run tauri build
    ```

## Debugging

This project is configured for seamless debugging in VS Code.

- **Backend (Rust)**: Uses `codelldb` to attach to the running process.
- **Frontend (React)**: Uses standard Chrome debugger.

Use the `Run and Debug` sidebar (Ctrl+Shift+D) and select **"Full Stack Debug"** to launch both.

## Implementation Details

### Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, D3.js v7, Lucide React
- **Backend**: Rust (Tauri), `git2` (libgit2 bindings) for Git operations.

### Architecture

- **Backend (`src-tauri/src/lib.rs`)**:
  - Exposes `get_git_graph` command.
  - Uses `git2` to traverse the commit history topologically and by time.
  - Returns a list of commits with parent relationships.

- **Frontend**:
  - `src/App.tsx`: Main application layout, state management, and interaction logic.
  - `src/components/Graph.tsx`: Renders the commit graph. Uses D3.js to draw nodes (commits) and curved paths (branch/merge edges).
  - `src/utils/graphLayout.ts`: Implements a lane-assignment algorithm to determine the X/Y coordinates of each commit node, ensuring a clear visualization of parallel branches.
