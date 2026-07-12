import React, { createContext, useContext, useState, type ReactNode } from 'react';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';

interface Toast {
    id: string;
    message: string;
    type: 'success' | 'error' | 'info';
}

interface ToastContextType {
    showToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) throw new Error("useToast must be used within a ToastProvider");
    return context;
};

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = (message: string, type: 'success' | 'error' | 'info') => {
        const id = Math.random().toString(36).substring(2, 9);
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => removeToast(id), 5000); // Auto close after 5 seconds
    };

    const removeToast = (id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div style={{
                position: 'fixed',
                top: '30px',
                left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                zIndex: 999999
            }}>
                {toasts.map(toast => (
                    <div key={toast.id} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '14px',
                        background: 'rgba(20, 24, 34, 0.95)',
                        backdropFilter: 'blur(16px)',
                        border: '1px solid ' + (toast.type === 'error' ? 'rgba(239, 68, 68, 0.4)' : toast.type === 'success' ? 'rgba(34, 197, 94, 0.4)' : 'rgba(59, 130, 246, 0.4)'),
                        borderLeft: '4px solid ' + (toast.type === 'error' ? '#ef4444' : toast.type === 'success' ? '#22c55e' : '#3b82f6'),
                        padding: '16px 20px',
                        borderRadius: '8px',
                        color: '#fff',
                        boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
                        minWidth: '280px',
                        maxWidth: '450px',
                    }}>
                        {toast.type === 'error' && <AlertCircle size={22} color="#ef4444" />}
                        {toast.type === 'success' && <CheckCircle size={22} color="#22c55e" />}
                        {toast.type === 'info' && <Info size={22} color="#3b82f6" />}
                        
                        <span style={{ fontSize: '0.95rem', flex: 1, wordBreak: 'break-word', fontFamily: "'Inter', sans-serif" }}>
                            {toast.message}
                        </span>
                        
                        <button 
                            onClick={() => removeToast(toast.id)} 
                            style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', padding: '4px', display: 'flex' }}
                        >
                            <X size={16} />
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};
