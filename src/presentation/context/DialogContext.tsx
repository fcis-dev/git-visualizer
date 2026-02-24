import { createContext, useContext, useState, ReactNode } from 'react';
import { Dialog, DialogType } from '../components/Dialog';

interface DialogContextType {
    showConfirm: (title: string, message: string, onConfirm: () => void) => void;
    showInput: (title: string, message: string, onConfirm: (val?: string) => void, defaultValue?: string) => void;
    showAlert: (title: string, message: string) => void;
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

export function DialogProvider({ children }: { children: ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);
    const [config, setConfig] = useState<{
        title: string;
        message: string;
        type: DialogType;
        defaultValue?: string;
        onConfirm: (val?: string) => void;
    }>({ title: '', message: '', type: 'alert', onConfirm: () => {} });

    const showConfirm = (title: string, message: string, onConfirm: () => void) => {
        setConfig({
            title,
            message,
            type: 'confirm',
            onConfirm: () => onConfirm(),
        });
        setIsOpen(true);
    };

    const showInput = (title: string, message: string, onConfirm: (val?: string) => void, defaultValue?: string) => {
        setConfig({
            title,
            message,
            defaultValue,
            type: 'input',
            onConfirm: (val) => onConfirm(val),
        });
        setIsOpen(true);
    };

    const showAlert = (title: string, message: string) => {
        setConfig({
            title,
            message,
            type: 'alert',
            onConfirm: () => {},
        });
        setIsOpen(true);
    };

    return (
        <DialogContext.Provider value={{ showConfirm, showInput, showAlert }}>
            {children}
            <Dialog 
                isOpen={isOpen}
                title={config.title}
                message={config.message}
                type={config.type}
                defaultValue={config.defaultValue}
                onConfirm={config.onConfirm}
                onClose={() => setIsOpen(false)}
            />
        </DialogContext.Provider>
    );
}

export function useDialog() {
    const context = useContext(DialogContext);
    if (!context) {
        throw new Error('useDialog must be used within a DialogProvider');
    }
    return context;
}
