import { useState } from "react";
import { ProjectSelectionView } from "../components/ProjectSelectionView";
import { RepositoryWorkspace } from "../components/RepositoryWorkspace";
import { SettingsModal } from "../components/SettingsModal";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { useDialog } from "../context/DialogContext";

export function Dashboard() {
  const [repoPath, setRepoPath] = useState<string>("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Dialog context is used by sub-components but we might need it here too
  const {} = useDialog();

  return (
    <div
      className="flex h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-200 font-sans overflow-hidden"
      onContextMenu={(e) => e.preventDefault()}
    >
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        repoPath={repoPath}
      />

      {/* Main Content Switcher */}
      {!repoPath ? (
        <ProjectSelectionView 
            onSelectRepo={setRepoPath} 
            onOpenSettings={() => setIsSettingsOpen(true)}
        />
      ) : (
        <ErrorBoundary>
          <RepositoryWorkspace
            repoPath={repoPath}
            onBack={() => setRepoPath("")}
          />
        </ErrorBoundary>
      )}


    </div>
  );
}
