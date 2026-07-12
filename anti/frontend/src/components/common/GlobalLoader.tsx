import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

const GlobalLoader: React.FC = () => {
    const [requestCount, setRequestCount] = useState(0);

    useEffect(() => {
        const handleStart = () => setRequestCount(prev => prev + 1);
        const handleEnd = () => setRequestCount(prev => Math.max(0, prev - 1));

        window.addEventListener('api-load-start', handleStart);
        window.addEventListener('api-load-end', handleEnd);

        return () => {
            window.removeEventListener('api-load-start', handleStart);
            window.removeEventListener('api-load-end', handleEnd);
        };
    }, []);

    if (requestCount === 0) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(5, 5, 5, 0.65)',
            backdropFilter: 'blur(6px)',
            zIndex: 99999,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            cursor: 'wait',
            pointerEvents: 'all' /* Explicitly blocks clicks to anything behind it */
        }}>
            <div style={{
                background: 'rgba(255, 107, 53, 0.1)',
                border: '1px solid rgba(255, 107, 53, 0.3)',
                padding: '2rem 3rem',
                borderRadius: '12px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '1rem',
                boxShadow: '0 0 30px rgba(255, 107, 53, 0.15)'
            }}>
                <Loader2 className="animate-spin" size={48} color="var(--color-accent, #FF6B35)" />
                <div style={{ color: 'white', fontWeight: 600, fontSize: '1.2rem', letterSpacing: '1px', fontFamily: "'Orbitron', monospace" }}>
                    SYSTEM PROCESSING
                </div>
                <div style={{ color: '#aaa', fontSize: '0.9rem' }}>
                    Holding interface grid until datastream commits...
                </div>
            </div>
            
            <style>
                {`
                @keyframes spin-loader {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .animate-spin {
                    animation: spin-loader 1.2s infinite linear;
                }
                `}
            </style>
        </div>
    );
};

export default GlobalLoader;
