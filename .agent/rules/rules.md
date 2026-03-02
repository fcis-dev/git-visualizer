# Clean Architecture Rules

This project follows Clean Architecture principles to ensure separation of concerns, scalability, and maintainability.

## 1. Frontend Architecture (React)

The frontend code is located in `src/` and is divided into three main layers:

### **1.1. Domain Layer (`src/domain/`)**

- **Purpose**: Contains the core business logic and definitions. It must be independent of any framework (React) or data source (Tauri, API).
- **Contents**:
  - **Entities (Models)**: Business objects and interfaces (e.g., `Commit`, `GitBranch`, `Repository`).
  - **Repository Interfaces**: Abstract definitions of data access (e.g., `IGitRepository`).
  - **Use Cases**: Pure business logic that orchestrates requests via the repository interfaces. Each use case should follow the Single Responsibility Principle (e.g., `GetCommitsUseCase`, `MergeBranchUseCase`).
- **Dependencies**: None (pure TypeScript).

### **1.2. Data Layer (`src/data/`)**

- **Purpose**: Handles data retrieval and implements the repository interfaces defined in the Domain layer.
- **Contents**:
  - **Repositories**: Concrete implementations of interfaces (e.g., `TauriGitRepository`). This maps raw data from Tauri to Domain Entities.
- **Dependencies**: Can depend on external libraries (Tauri API) and the Domain layer.

### **1.3. Presentation Layer (`src/presentation/`)**

- **Purpose**: Responsible for the User Interface and user interaction logic.
- **Contents**:
  - **Pages**: Top-level views comprising multiple components (e.g., `RepositoryWorkspacePage`).
  - **Controllers**: Custom React Hooks acting as the bridge between the UI and Use Cases. They manage local view state (loading, error, data) and inject the correct Use Cases.
  - **Components**: Reusable, presentation-only ("dumb") React components that receive data via props and emit events.
  - **Hooks**: Custom React hooks for generic UI logic or state management that aren't page controllers (`useGit`, `useGitActions`).
  - **Context**: React Contexts for global state (Theme, Dialogs).
  - **Utils**: Helper functions specific to the UI.
- **Dependencies**: React, Domain Layer (Use Cases, Entities), Data Layer (only via dependency injection in top-level containers/hooks).

## 2. Backend Architecture (Rust/Tauri)

The backend code is located in `src-tauri/src/` and is modularized as follows:

### **2.1. API Layer (`commands.rs`)**

- **Purpose**: The entry point for frontend requests.
- **Responsibility**: Validate input, call the Service layer, and format the output.
- **Rule**: Functions here should be thin wrappers. Do not put business logic here.

### **2.2. Service Layer (`services.rs`)**

- **Purpose**: Contains the core business logic.
- **Responsibility**: Orchestrate operations (e.g., `get_git_graph`, logic for commits).
- **Dependencies**: Can use `git2` and other libraries to perform work.

### **2.3. Models (`models.rs`)**

- **Purpose**: Defines data structures (Structs/Enums) shared across the backend application.
- **Rule**: Keep these as pure data containers (DTOs).

### **2.4. Configuration (`config.rs`)**

- **Purpose**: Manages application configuration and persistent state.

### **2.5. Entry Point (`lib.rs`)**

- **Purpose**: Sets up the Tauri application and registers plugins/commands.
- **Rule**: Keep this file minimal. It should only wire things together.
