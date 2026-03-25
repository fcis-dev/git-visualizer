import React, { useEffect, useRef, useState } from 'react';
import { X, Check, GripHorizontal } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { motion, useDragControls } from 'framer-motion';

export type DialogType = 'confirm' | 'input' | 'alert';

interface DialogProps {
    isOpen: boolean;
    title: string;
    message: string;
    type?: DialogType;
    inputPlaceholder?: string;
    defaultValue?: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: (inputValue?: string) => void;
    onClose: () => void;
}

export const Dialog: React.FC<DialogProps> = ({
    isOpen,
    title,
    message,
    type = 'confirm',
    inputPlaceholder,
    defaultValue = '',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    onConfirm,
    onClose,
}) => {
    const { t } = useTranslation();
    const [inputValue, setInputValue] = useState(defaultValue);
    const inputRef = useRef<HTMLInputElement>(null);
    const dragControls = useDragControls();

    useEffect(() => {
        if (isOpen) {
            setInputValue(defaultValue);
            // Focus input slightly after mount to ensure visibility
            setTimeout(() => {
                inputRef.current?.focus();
            }, 50);
        }
    }, [isOpen, defaultValue, message]);

    if (!isOpen) return null;

    const handleConfirm = () => {
        onClose();
        onConfirm(type === 'input' ? inputValue : undefined);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleConfirm();
        } else if (e.key === 'Escape') {
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/40 animate-in fade-in duration-200">
            <motion.div 
                drag
                dragControls={dragControls}
                dragListener={false}
                dragMomentum={false}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-md bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6"
                role="dialog"
                aria-modal="true"
            >
                <div 
                    className="flex justify-between items-start mb-4 cursor-move select-none group/header"
                    onPointerDown={(e) => dragControls.start(e)}
                >
                    <div className="flex items-center gap-2">
                        <GripHorizontal className="w-4 h-4 text-slate-400 opacity-0 group-hover/header:opacity-100 transition-opacity" />
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                            {title}
                        </h3>
                    </div>
                    <button 
                        onClick={onClose}
                        className="text-slate-500 hover:text-slate-500 dark:hover:text-slate-300 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="mb-6">
                    <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
                        {message}
                    </p>
                    
                    {type === 'input' && (
                        <div className="mt-4">
                            <input
                                ref={inputRef}
                                type="text"
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
                                placeholder={inputPlaceholder}
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={handleKeyDown}
                            />
                        </div>
                    )}
                </div>

                <div className="flex justify-end space-x-3">
                    {type !== 'alert' && (
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        >
                            {cancelText === 'Cancel' ? t('dialog.cancel') : cancelText}
                        </button>
                    )}
                    <button
                        onClick={handleConfirm}
                        className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm shadow-indigo-500/30 transition-colors flex items-center space-x-2"
                    >
                        {type === 'confirm' && <Check className="w-4 h-4 mr-1.5" />}
                        <span>{confirmText === 'Confirm' ? t('dialog.confirm') : confirmText}</span>
                    </button>
                </div>
            </motion.div>
        </div>
    );
};
