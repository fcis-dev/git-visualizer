import { useState, useEffect } from "react";
import { ProjectSelectionView } from "../components/ProjectSelectionView";
import { SettingsModal } from "../components/SettingsModal";
import { useTranslation } from "react-i18next";
import { useSessionController } from "../controllers/useSessionController";

export function Dashboard() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { t } = useTranslation();
  const controller = useSessionController();

  return (
    <div
      className="flex flex-col h-dvh bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-200 font-sans overflow-hidden"
      onContextMenu={(e) => e.preventDefault()}
    >
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        repoPath={""}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-hidden relative">
        <ProjectSelectionView 
            onSelectRepo={controller.launchProject} 
            onOpenSettings={() => setIsSettingsOpen(true)}
        />
      </div>
    </div>
  );
}
