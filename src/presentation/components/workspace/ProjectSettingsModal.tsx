import { useState, useEffect } from "react";
import { X, Globe, User, Plus, Trash2, Save, AlertCircle, GripHorizontal, Check } from "lucide-react";
import { TauriGitRepository } from "../../../data/repositories/TauriGitRepository";
import { useTranslation } from "react-i18next";
import { motion, useDragControls } from "framer-motion";
import { useDialog } from "../../context/DialogContext";

interface ProjectSettingsModalProps {
  repoPath: string;
  onClose: () => void;
}

const repository = new TauriGitRepository();

export function ProjectSettingsModal({ repoPath, onClose }: ProjectSettingsModalProps) {
  const { t } = useTranslation();
  const { showConfirm } = useDialog();
  const [activeTab, setActiveTab] = useState<"git" | "remotes">("git");
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Git Config state
  const [localName, setLocalName] = useState("");
  const [localEmail, setLocalEmail] = useState("");
  const [globalName, setGlobalName] = useState("");
  const [globalEmail, setGlobalEmail] = useState("");

  // Remotes state
  const [remotes, setRemotes] = useState<{ name: string; url: string }[]>([]);
  const [newRemoteName, setNewRemoteName] = useState("");
  const [newRemoteUrl, setNewRemoteUrl] = useState("");

  const dragControls = useDragControls();

  useEffect(() => {
    loadData();
  }, [repoPath]);

  const loadData = async () => {
    setError(null);
    try {
      // getGitConfigUser now returns ONLY local settings in our updated service
      const [lName, lEmail] = await repository.getGitConfigUser(repoPath);
      // getGlobalGitConfigUser returns specifically global settings
      const [gName, gEmail] = await repository.getGlobalGitConfigUser();
      
      setLocalName(lName);
      setLocalEmail(lEmail);
      setGlobalName(gName);
      setGlobalEmail(gEmail);

      const remoteLines = await repository.getRemotesList(repoPath);
      const parsedRemotes = parseRemotes(remoteLines);
      setRemotes(parsedRemotes);
    } catch (err: any) {
      setError(err.toString());
    }
  };

  const parseRemotes = (lines: string[]) => {
    const map = new Map<string, string>();
    lines.forEach(line => {
      const parts = line.split(/\s+/);
      if (parts.length >= 2) {
        const name = parts[0];
        const url = parts[1];
        map.set(name, url);
      }
    });
    return Array.from(map.entries()).map(([name, url]) => ({ name, url }));
  };

  const handleSaveConfig = async () => {
    setSaving(true);
    setError(null);
    setShowSuccess(false);
    try {
      await repository.setGitConfigUser(repoPath, localName, localEmail);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 5000);
    } catch (err: any) {
      setError(err.toString());
    } finally {
      setSaving(false);
    }
  };

  const handleAddRemote = async () => {
    if (!newRemoteName || !newRemoteUrl) return;
    setSaving(true);
    try {
      await repository.addRemote(repoPath, newRemoteName, newRemoteUrl);
      setNewRemoteName("");
      setNewRemoteUrl("");
      const lines = await repository.getRemotesList(repoPath);
      setRemotes(parseRemotes(lines));
    } catch (err: any) {
      setError(err.toString());
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveRemote = async (name: string) => {
    showConfirm(
      t("settings.remotes.removeTitle", "Remove Remote"),
      t("settings.remotes.removeConfirm", { name, defaultValue: `Are you sure you want to remove the remote "${name}"?` }),
      async () => {
        setSaving(true);
        try {
          await repository.removeRemote(repoPath, name);
          const lines = await repository.getRemotesList(repoPath);
          setRemotes(parseRemotes(lines));
        } catch (err: any) {
          setError(err.toString());
        } finally {
          setSaving(false);
        }
      }
    );
  };

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/40 animate-in fade-in duration-200">
      <motion.div 
        drag
        dragControls={dragControls}
        dragListener={false}
        dragMomentum={false}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col h-[480px] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div 
          className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 shrink-0 cursor-move select-none group/header"
          onPointerDown={(e) => dragControls.start(e)}
        >
          <div className="flex items-center gap-3">
            <GripHorizontal className="w-4 h-4 text-slate-400 opacity-0 group-hover/header:opacity-100 transition-opacity" />
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {t("settings.project.title", "Project Settings")}
              </h2>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[200px]" title={repoPath}>
                {repoPath}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body: sidebar + content */}
        <div className="flex flex-1 min-h-0">
          {/* Left Tab Sidebar */}
          <nav className="w-48 shrink-0 border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 flex flex-col py-3 gap-1 px-2">
            <button
              onClick={() => setActiveTab("git")}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left w-full ${
                activeTab === "git"
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <User className="w-4 h-4" />
              <span>{t("settings.tabs.gitConfig", "Git Config")}</span>
            </button>
            <button
              onClick={() => setActiveTab("remotes")}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left w-full ${
                activeTab === "remotes"
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <Globe className="w-4 h-4" />
              <span>{t("settings.tabs.remotes", "Remotes")}</span>
            </button>
          </nav>

          {/* Right Content Panel */}
          <div className="flex-1 overflow-y-auto p-6">
            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg flex items-start space-x-3 text-red-600 dark:text-red-400 text-sm">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {activeTab === "git" ? (
              <div className="space-y-5">
                <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">{t("settings.tabs.gitConfig", "Git Config")}</h3>
                <div className="space-y-4 p-4 rounded-lg bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-800">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                       {t("settings.git.name", "User Name")}
                    </label>
                    <input
                      type="text"
                      value={localName}
                      onChange={e => setLocalName(e.target.value)}
                      placeholder={globalName ? `${globalName}` : t("settings.userNamePlaceholder")}
                      className="w-full text-sm px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500/50 outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                       {t("settings.git.email", "User Email")}
                    </label>
                    <input
                      type="email"
                      value={localEmail}
                      onChange={e => setLocalEmail(e.target.value)}
                      placeholder={globalEmail ? `${globalEmail}` : t("settings.userEmailPlaceholder")}
                      className="w-full text-sm px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500/50 outline-none"
                    />
                  </div>
                  <div className="pt-1 flex items-center justify-end gap-3">
                    {showSuccess && (
                      <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400 text-sm font-medium animate-in fade-in zoom-in-95 duration-300">
                        <Check className="w-4 h-4" />
                        <span>{t("common.saved", "Saved")}</span>
                      </div>
                    )}
                    <button
                      onClick={handleSaveConfig}
                      disabled={saving}
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium transition-all active:scale-[0.98] disabled:opacity-50 shadow-sm"
                    >
                      {saving ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      {t("common.saveChanges", "Save Changes")}
                    </button>
                  </div>
                </div>
                
                <div className="p-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-lg flex items-start gap-3">
                  <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                  <p className="text-[11px] text-amber-700 dark:text-amber-400/80 leading-relaxed">
                    {t("settings.git.infoText", "Editing these values will strictly update the repository's local configuration (.git/config). If left empty, Git will use your system-wide global settings.")}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">{t("settings.tabs.remotes", "Remotes")}</h3>
                
                {/* Remotes List */}
                {remotes.length > 0 ? (
                  <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden divide-y divide-slate-200 dark:divide-slate-800">
                    {remotes.map(remote => (
                      <div key={remote.name} className="flex items-center justify-between p-3 bg-white dark:bg-slate-900">
                        <div className="min-w-0 flex-1 mr-4">
                          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">{remote.name}</h4>
                          <p className="text-[10px] text-slate-500 truncate" title={remote.url}>{remote.url}</p>
                        </div>
                        <button
                          onClick={() => handleRemoveRemote(remote.name)}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-md transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-6 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                    <p className="text-xs text-slate-400 italic">{t("settings.remotes.empty", "No remotes configured")}</p>
                  </div>
                )}

                {/* Add Remote */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/20 border border-slate-200 dark:border-slate-800 rounded-lg space-y-3">
                  <h4 className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    {t("settings.remotes.addNew", "Add New Remote")}
                  </h4>
                  <div className="flex flex-col gap-3">
                    <input
                      type="text"
                      placeholder="Name (e.g. origin)"
                      value={newRemoteName}
                      onChange={e => setNewRemoteName(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <div className="flex gap-2">
                       <input
                        type="text"
                        placeholder="URL (https://github.com/...)"
                        value={newRemoteUrl}
                        onChange={e => setNewRemoteUrl(e.target.value)}
                        className="flex-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                      <button
                        onClick={handleAddRemote}
                        disabled={!newRemoteName || !newRemoteUrl || saving}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-md transition-colors flex items-center justify-center"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

      </motion.div>
    </div>
  );
}
