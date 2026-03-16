import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { X, Moon, Sun, User, Mail, Save, Download, Palette, GitBranch, Info } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { useDialog } from '../context/DialogContext';
import { useTranslation } from 'react-i18next';
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { getVersion } from '@tauri-apps/api/app';


interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  repoPath: string | null;
}

type SettingsTab = 'appearance' | 'git' | 'about';

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, repoPath }) => {
  const { theme, toggleTheme } = useTheme();
  const { showAlert, showConfirm } = useDialog();
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState<SettingsTab>('appearance');
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [appVersion, setAppVersion] = useState('...');

  useEffect(() => {
    getVersion()
      .then(v => setAppVersion(`v${v}`))
      .catch((e: any) => {
        console.error(e);
        showAlert(t('settings.errorTitle'), String(e));
      });
  }, [showAlert, t]);

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

  useEffect(() => {
    if (isOpen) {
      setLoadingConfig(true);
      invoke<[string, string]>('get_git_config_user', { path: repoPath || '.' })
        .then(([name, email]) => {
          setUserName(name);
          setUserEmail(email);
        })
        .catch(console.error)
        .finally(() => setLoadingConfig(false));
    }
  }, [isOpen, repoPath]);

  const handleSaveConfig = async () => {
    try {
      await invoke('set_git_config_user', { path: repoPath || '.', name: userName, email: userEmail });
      showAlert(t('settings.successTitle'), t('settings.saveSuccess'));
    } catch (e: any) {
      console.error(e);
      showAlert(t('settings.errorTitle'), t('settings.saveError') + e.toString());
    }
  };

  if (!isOpen) return null;

  const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { id: 'appearance', label: t('settings.appearance'), icon: <Palette className="w-4 h-4" /> },
    { id: 'git', label: t('settings.gitConfig'), icon: <GitBranch className="w-4 h-4" /> },
    { id: 'about', label: t('settings.about'), icon: <Info className="w-4 h-4" /> },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200 p-4">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden transform transition-all animate-in zoom-in-95 duration-200 flex flex-col h-[480px]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 shrink-0">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{t('settings.title')}</h2>
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
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left w-full ${
                  activeTab === tab.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>

          {/* Right Content Panel */}
          <div className="flex-1 overflow-y-auto p-6">

            {/* ── Appearance Tab ── */}
            {activeTab === 'appearance' && (
              <div className="space-y-5">
                <div>
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
              </div>
            )}

            {/* ── Git Config Tab ── */}
            {activeTab === 'git' && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">{t('settings.gitConfig')}</h3>
                  <div className="space-y-4 p-4 rounded-lg bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-800">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                        <User className="w-3.5 h-3.5" /> {t('settings.userName')}
                      </label>
                      <input
                        type="text"
                        value={userName}
                        onChange={(e) => setUserName(e.target.value)}
                        className="w-full text-sm px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                        placeholder={t('settings.userNamePlaceholder')}
                        disabled={loadingConfig}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5" /> {t('settings.userEmail')}
                      </label>
                      <input
                        type="email"
                        value={userEmail}
                        onChange={(e) => setUserEmail(e.target.value)}
                        className="w-full text-sm px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                        placeholder={t('settings.userEmailPlaceholder')}
                        disabled={loadingConfig}
                      />
                    </div>
                    <div className="pt-1 flex justify-end">
                      <button
                        onClick={handleSaveConfig}
                        disabled={loadingConfig}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium transition-colors disabled:opacity-50"
                      >
                        <Save className="w-4 h-4" /> {t('settings.saveConfig')}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── About Tab ── */}
            {activeTab === 'about' && (
              <div className="space-y-5">
                <div>
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
                    <p className="text-xs text-slate-400 dark:text-slate-500 pt-2">{t('settings.footer')}</p>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
};
