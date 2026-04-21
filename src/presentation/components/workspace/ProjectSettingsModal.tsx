import { useState, useEffect } from "react";
import { X, Globe, User, Plus, Trash2, Save, AlertCircle, GripHorizontal, Palette, Info, Moon, Sun, Download, Check, Wrench, Edit3, ArrowLeft } from "lucide-react";
import { TauriGitRepository } from "../../../data/repositories/TauriGitRepository";
import { GitHook } from "../../../domain/entities/GitEntities";
import { useTranslation } from "react-i18next";
import Editor from "@monaco-editor/react";
import { motion, useDragControls } from "framer-motion";
import { useDialog } from "../../context/DialogContext";
import { useTheme } from "../../context/ThemeContext";
import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { getVersion } from "@tauri-apps/api/app";
import { invoke } from "@tauri-apps/api/core";

interface ProjectSettingsModalProps {
  repoPath: string | null;
  onClose: () => void;
}

const repository = new TauriGitRepository();

export function ProjectSettingsModal({ repoPath, onClose }: ProjectSettingsModalProps) {
  const { t } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const { showConfirm, showAlert } = useDialog();
  const [activeTab, setActiveTab] = useState<"appearance" | "git" | "remotes" | "hooks" | "about">("appearance");
  const [activeGitTab, setActiveGitTab] = useState<"global" | "local">("global");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Git Config state
  const [localName, setLocalName] = useState("");
  const [localEmail, setLocalEmail] = useState("");
  const [globalName, setGlobalName] = useState("");
  const [globalEmail, setGlobalEmail] = useState("");

  // LFS config state
  const [isLfsSystemInstalled, setIsLfsSystemInstalled] = useState(false);
  const [lfsEnabled, setLfsEnabled] = useState(() => localStorage.getItem("enableGitLfs") === "true");

  // Updates State
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [appVersion, setAppVersion] = useState("...");

  // Remotes state
  const [remotes, setRemotes] = useState<{ name: string; url: string }[]>([]);
  const [newRemoteName, setNewRemoteName] = useState("");
  const [newRemoteUrl, setNewRemoteUrl] = useState("");

  // Hooks state
  const [hooks, setHooks] = useState<GitHook[]>([]);
  const [editingHook, setEditingHook] = useState<string | null>(null);
  const [hookContent, setHookContent] = useState("");

  const dragControls = useDragControls();

  useEffect(() => {
    getVersion().then(v => setAppVersion(`v${v}`)).catch(console.error);
    loadData();
    repository.isLfsInstalled().then(installed => {
      setIsLfsSystemInstalled(installed);
      if (!installed) setLfsEnabled(false);
    });
  }, [repoPath]);

  const loadData = async () => {
    setError(null);
    try {
      const [gName, gEmail] = await repository.getGlobalGitConfigUser();
      setGlobalName(gName);
      setGlobalEmail(gEmail);

      if (repoPath) {
        const [lName, lEmail] = await repository.getGitConfigUser(repoPath);
        setLocalName(lName);
        setLocalEmail(lEmail);

        const remoteLines = await repository.getRemotesList(repoPath);
        const parsedRemotes = parseRemotes(remoteLines);
        setRemotes(parsedRemotes);

        const loadedHooks = await repository.getGitHooks(repoPath);
        setHooks(loadedHooks);
      }
    } catch (err: any) {
      setError(err.toString());
    }
  };

  const handleCheckUpdate = async () => {
    try {
      setCheckingUpdate(true);
      const update = await check();
      setCheckingUpdate(false);

      if (update) {
        showConfirm(
          t('settings.updateAvailableTitle'),
          t('settings.updateAvailableDesc', { version: update.version }),
          async () => {
            try {
              showAlert(t('settings.title'), t('settings.installingUpdate'));
              await update.downloadAndInstall();
              await relaunch();
            } catch (e: any) {
              showAlert(t('settings.errorTitle'), t('settings.updateError') + e.toString());
            }
          }
        );
      } else {
        showAlert(t('settings.upToDateTitle'), t('settings.upToDateDesc'));
      }
    } catch (e: any) {
      setCheckingUpdate(false);
      showAlert(t('settings.errorTitle'), t('settings.updateError') + e.toString());
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
    try {
      await invoke("set_global_git_config_user", { name: globalName, email: globalEmail });
      
      if (repoPath) {
        await repository.setGitConfigUser(repoPath, localName, localEmail);
      }
      
      localStorage.setItem("enableGitLfs", String(lfsEnabled));
      window.dispatchEvent(new Event("lfs-config-changed"));

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 5000);
    } catch (err: any) {
      setError(err.toString());
    } finally {
      setSaving(false);
    }
  };

  const handleAddRemote = async () => {
    if (!newRemoteName || !newRemoteUrl || !repoPath) return;
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
    if (!repoPath) return;
    showConfirm(
      t("settings.remotes.removeTitle"),
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

  const handleToggleHook = async (hookName: string, state: boolean) => {
    if (!repoPath) return;
    try {
      await repository.toggleGitHook(repoPath, hookName, state);
      setHooks(hooks.map(h => h.name === hookName ? { ...h, active: state } : h));
    } catch (err: any) {
      setError(err.toString());
    }
  };

  const handleEditHook = async (hookName: string) => {
    if (!repoPath) return;
    try {
      const content = await repository.readHookContent(repoPath, hookName);
      setHookContent(content);
      setEditingHook(hookName);
    } catch (err: any) {
      setError(err.toString());
    }
  };

  const handleSaveHookContent = async () => {
    if (!repoPath || !editingHook) return;
    setSaving(true);
    try {
      await repository.saveHookContent(repoPath, editingHook, hookContent);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setError(err.toString());
    } finally {
      setSaving(false);
    }
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
        className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col h-[650px] overflow-hidden"
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
                {t("settings.title")}
              </h2>
              {repoPath && (
                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[200px]" title={repoPath}>
                  {repoPath}
                </p>
              )}
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
          <nav className="w-48 shrink-0 border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 flex flex-col py-3 gap-1 px-2 overflow-y-auto">
            <button
              onClick={() => setActiveTab("appearance")}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left w-full ${
                activeTab === "appearance"
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <Palette className="w-4 h-4" />
              <span>{t("settings.appearance")}</span>
            </button>
            <button
              onClick={() => setActiveTab("git")}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left w-full ${
                activeTab === "git"
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <User className="w-4 h-4" />
              <span>{t("settings.tabs.gitConfig")}</span>
            </button>
            {repoPath && (
              <button
                onClick={() => setActiveTab("remotes")}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left w-full ${
                  activeTab === "remotes"
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <Globe className="w-4 h-4" />
                <span>{t("settings.tabs.remotes")}</span>
              </button>
            )}
            {repoPath && (
              <button
                onClick={() => { setActiveTab("hooks"); setEditingHook(null); }}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left w-full ${
                  activeTab === "hooks"
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <Wrench className="w-4 h-4" />
                <span>{t("settings.tabs.hooks")}</span>
              </button>
            )}
            <button
              onClick={() => setActiveTab("about")}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left w-full ${
                activeTab === "about"
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <Info className="w-4 h-4" />
              <span>{t("settings.about")}</span>
            </button>
          </nav>

          {/* Right Content Panel */}
          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg flex items-start space-x-3 text-red-600 dark:text-red-400 text-sm">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Appearance Tab */}
            {activeTab === "appearance" && (
              <div className="space-y-5">
                <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">{t('settings.appearance')}</h3>
                <div className="flex items-center justify-between p-4 rounded-lg bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-full ${theme === 'dark' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-amber-500/20 text-amber-600'}`}>
                      {theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="font-medium text-slate-900 dark:text-slate-200 text-sm">
                        {theme === 'dark' ? t('settings.darkMode') : t('settings.lightMode')}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {t('settings.themeDesc')}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={toggleTheme}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 ${
                      theme === 'dark' ? 'bg-indigo-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        theme === 'dark' ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            )}

            {/* Git Tab */}
            {activeTab === "git" && (
              <div className="space-y-5">
                <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">{t("settings.tabs.gitConfig")}</h3>
                
                {repoPath && (
                  <div className="flex bg-slate-100 dark:bg-slate-800/50 p-1 rounded-lg">
                    <button
                      onClick={() => setActiveGitTab("global")}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${
                        activeGitTab === "global"
                          ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                          : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                      }`}
                    >
                      <Globe className="w-4 h-4" />
                      {t("settings.git.global")}
                    </button>
                    <button
                      onClick={() => setActiveGitTab("local")}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${
                        activeGitTab === "local"
                          ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                          : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                      }`}
                    >
                      <User className="w-4 h-4" />
                      {t("settings.git.local")}
                    </button>
                  </div>
                )}

                {/* Global Config */}
                {activeGitTab === "global" && (
                  <div className="space-y-4 p-4 rounded-lg bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-800 animate-in fade-in duration-200">
                    <p className="text-xs text-slate-500">
                      {t("settings.git.globalDesc")}
                    </p>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                         {t("settings.git.name")}
                      </label>
                      <input
                        type="text"
                        value={globalName}
                        onChange={e => setGlobalName(e.target.value)}
                        placeholder={t("settings.userNamePlaceholder")}
                        className="w-full text-sm px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500/50 outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                         {t("settings.git.email")}
                      </label>
                      <input
                        type="email"
                        value={globalEmail}
                        onChange={e => setGlobalEmail(e.target.value)}
                        placeholder={t("settings.userEmailPlaceholder")}
                        className="w-full text-sm px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500/50 outline-none"
                      />
                    </div>
                  </div>
                )}

                {/* Local Config */}
                {activeGitTab === "local" && repoPath && (
                  <div className="space-y-4 p-4 rounded-lg bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-800 animate-in fade-in duration-200">
                     <p className="text-xs text-slate-500">
                      {t("settings.git.localDesc")}
                     </p>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                         {t("settings.git.name")}
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
                         {t("settings.git.email")}
                      </label>
                      <input
                        type="email"
                        value={localEmail}
                        onChange={e => setLocalEmail(e.target.value)}
                        placeholder={globalEmail ? `${globalEmail}` : t("settings.userEmailPlaceholder")}
                        className="w-full text-sm px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500/50 outline-none"
                      />
                    </div>
                  </div>
                )}
                
                {/* Advanced Features (LFS) */}
                {isLfsSystemInstalled && (
                  <div className="pt-2">
                    <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-800">
                      <div className="flex items-center space-x-3">
                        <div>
                          <div className="font-medium text-slate-900 dark:text-slate-200 text-sm">
                            {t("settings.lfs.enable")}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {t("settings.lfs.desc")}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => setLfsEnabled(!lfsEnabled)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 ${
                          lfsEnabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            lfsEnabled ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                )}

                <div className="pt-1 flex justify-end items-center gap-3">
                  {saveSuccess && (
                     <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1 animate-in fade-in duration-300">
                       <Check className="w-4 h-4" />
                       {t("common.saved")}
                     </span>
                  )}
                  <button
                    onClick={handleSaveConfig}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {saving ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    {t("common.saveChanges")}
                  </button>
                </div>
              </div>
            )}

            {/* Remotes Tab */}
            {activeTab === "remotes" && repoPath && (
              <div className="space-y-5">
                <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">{t("settings.tabs.remotes")}</h3>
                
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
                    <p className="text-xs text-slate-400 italic">{t("settings.remotes.empty")}</p>
                  </div>
                )}

                {/* Add Remote */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/20 border border-slate-200 dark:border-slate-800 rounded-lg space-y-3">
                  <h4 className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    {t("settings.remotes.addNew")}
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

            {/* Hooks Tab */}
            {activeTab === "hooks" && repoPath && (
              <div className="space-y-4 max-h-full flex flex-col h-[calc(100%-1rem)]">
                {editingHook ? (
                  <>
                    <div className="flex items-center justify-between shrink-0 mb-2">
                       <div className="flex items-center gap-2">
                         <button onClick={() => setEditingHook(null)} className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 transition-colors">
                           <ArrowLeft className="w-4 h-4" />
                         </button>
                         <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t("settings.hooks.edit")}: {editingHook}</h3>
                       </div>
                       <button
                          onClick={handleSaveHookContent}
                          disabled={saving}
                          className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-medium transition-colors disabled:opacity-50"
                        >
                          {saveSuccess ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                          {t("common.save")}
                        </button>
                    </div>
                    <div className="flex-1 min-h-[300px] border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden relative">
                      <Editor
                        height="100%"
                        language="shell"
                        theme={theme === 'dark' ? 'vs-dark' : 'light'}
                        value={hookContent}
                        onChange={(value) => setHookContent(value || "")}
                        options={{
                          minimap: { enabled: false },
                          fontSize: 13,
                          scrollBeyondLastLine: false,
                          wordWrap: "on"
                        }}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="mb-2 shrink-0">
                      <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">{t("settings.tabs.hooks")}</h3>
                      <p className="text-xs text-slate-500 mb-2">{t("settings.hooks.desc")}</p>
                    </div>
                    <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-y-auto divide-y divide-slate-200 dark:divide-slate-800 custom-scrollbar flex-1">
                      {hooks.length > 0 ? hooks.map((hook) => (
                        <div key={hook.name} className="flex items-center justify-between p-3 bg-white dark:bg-slate-900">
                           <div className="flex items-center gap-3 w-56">
                             <button
                                onClick={() => handleToggleHook(hook.name, !hook.active)}
                                className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 ${
                                  hook.active ? 'bg-indigo-600' : 'bg-slate-300'
                                }`}
                              >
                                <span
                                  className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                                    hook.active ? 'translate-x-5' : 'translate-x-1'
                                  }`}
                                />
                              </button>
                              <span className="text-xs font-medium text-slate-700 dark:text-slate-300 font-mono">{hook.name}</span>
                           </div>
                           <button onClick={() => handleEditHook(hook.name)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/20 rounded transition-colors" title={t("common.edit")}>
                             <Edit3 className="w-4 h-4" />
                           </button>
                        </div>
                      )) : (
                        <div className="p-6 text-center text-xs text-slate-500">
                          {t("settings.hooks.empty")}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* About Tab */}
            {activeTab === 'about' && (
              <div className="space-y-5">
                <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">{t('settings.about')}</h3>
                <div className="p-6 rounded-lg bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-800 text-center space-y-4">
                  <div className="space-y-2">
                    <div className="w-14 h-14 mx-auto flex items-center justify-center">
                      <img src="/app-icon.png" alt="GitVi" className="w-full h-full object-contain" />
                    </div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-xl">GitVi</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-300 max-w-xs mx-auto">
                      {t('settings.aboutDesc')}
                    </p>
                    <div className="pt-1">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-300 font-mono">
                        {appVersion}
                      </span>
                    </div>
                  </div>
                  <div className="pt-3 border-t border-slate-200 dark:border-slate-700/50">
                    <button
                      onClick={handleCheckUpdate}
                      disabled={checkingUpdate}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 w-full sm:w-auto bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      <Download className="w-4 h-4" />
                      {checkingUpdate ? t('settings.checkingForUpdates') : t('settings.checkForUpdates')}
                    </button>
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
