import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { X, Moon, Sun, User, Mail, Save, Download } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { useDialog } from '../context/DialogContext';
import { useTranslation } from 'react-i18next';
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  repoPath: string | null;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, repoPath }) => {
  const { theme, toggleTheme } = useTheme();
  const { showAlert, showConfirm } = useDialog();
  const { t } = useTranslation();

  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [checkingUpdate, setCheckingUpdate] = useState(false);

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
          // Path is ignored by backend for global config, so we can pass anything or empty string
          invoke<[string, string]>('get_git_config_user', { path: repoPath || "." })
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
          await invoke('set_git_config_user', { path: repoPath || ".", name: userName, email: userEmail });
          showAlert(t('settings.successTitle'), t('settings.saveSuccess'));
      } catch (e: any) {
          console.error(e);
          showAlert(t('settings.errorTitle'), t('settings.saveError') + e.toString());
      }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden transform transition-all animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{t('settings.title')}</h2>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          
          {/* Appearance Section */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">{t('settings.appearance')}</h3>
            
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-full ${theme === 'dark' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-amber-500/20 text-amber-600'}`}>
                  {theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                </div>
                <div>
                  <div className="font-medium text-slate-900 dark:text-slate-200">
                    {theme === 'dark' ? t('settings.darkMode') : t('settings.lightMode')}
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-300">
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
          </section>

          {/* Git Config Section */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">{t('settings.gitConfig')}</h3>
            
            <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-800 space-y-4">
                    <>
                        <div className="space-y-2">
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
                        <div className="space-y-2">
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
                        <div className="pt-2 flex justify-end">
                            <button 
                                onClick={handleSaveConfig}
                                disabled={loadingConfig}
                                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium transition-colors disabled:opacity-50"
                            >
                                <Save className="w-4 h-4" /> {t('settings.saveConfig')}
                            </button>
                        </div>
                    </>
            </div>
          </section>

          {/* About Section */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">{t('settings.about')}</h3>
            
            <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-800 text-center space-y-4">
                <div className="space-y-2">
                    <div className="w-12 h-12 mx-auto bg-transparent flex items-center justify-center">
                         <img src="/app-icon.png" alt="GitVi" className="w-full h-full object-contain" />
                    </div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-lg">GitVi</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                        {t('settings.aboutDesc')}
                    </p>
                    <div className="pt-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-300 font-mono">
                            v0.1.0
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
          </section>

        </div>
        
        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/30 border-t border-slate-200 dark:border-slate-800 text-center">
            <p className="text-xs text-slate-600 dark:text-slate-400">
                {t('settings.footer')}
            </p>
        </div>

      </div>
    </div>
  );
};
