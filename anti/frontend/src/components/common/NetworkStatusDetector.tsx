import React, { useState, useEffect } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';

const NetworkStatusDetector: React.FC = () => {
    const [isOffline, setIsOffline] = useState(!navigator.onLine);

    useEffect(() => {
        const handleOnline = () => setIsOffline(false);
        const handleOffline = () => setIsOffline(true);
        const handleApiError = () => setIsOffline(true);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        window.addEventListener('api-network-error', handleApiError);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('api-network-error', handleApiError);
        };
    }, []);

    const handleRefresh = () => {
        window.location.reload();
    };

    if (!isOffline) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(5, 5, 5, 0.92)',
            backdropFilter: 'blur(12px)',
            zIndex: 999999,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '20px'
        }}>
            <div style={{
                background: 'rgba(239, 68, 68, 0.05)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: '16px',
                padding: '3rem 2rem',
                maxWidth: '480px',
                width: '100%',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '1.5rem',
                boxShadow: '0 20px 50px rgba(0,0,0,0.5), 0 0 30px rgba(239, 68, 68, 0.1)',
                animation: 'fade-in-glow 0.5s ease-out'
            }}>
                {/* Glowing Radar Offline Icon */}
                <div style={{
                    width: '90px',
                    height: '90px',
                    borderRadius: '50%',
                    background: 'rgba(239, 68, 68, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    boxShadow: '0 0 20px rgba(239, 68, 68, 0.2)',
                    marginBottom: '0.5rem',
                    position: 'relative'
                }}>
                    <WifiOff size={44} color="#ef4444" style={{ animation: 'pulse-icon 2s infinite' }} />
                </div>

                <h2 style={{
                    fontFamily: "'Orbitron', monospace",
                    fontSize: '1.5rem',
                    fontWeight: 700,
                    letterSpacing: '1px',
                    margin: 0,
                    background: 'linear-gradient(135deg, #ef4444, #ff6b35)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text'
                }}>
                    CONNECTION ERROR
                </h2>

                <p style={{
                    color: '#ccc',
                    fontSize: '0.95rem',
                    lineHeight: '1.6',
                    margin: 0
                }}>
                    The terminal grid cannot establish connection to the master database. Please check your local network or server availability.
                </p>

                <button 
                    onClick={handleRefresh}
                    style={{
                        background: 'linear-gradient(135deg, #ff6b35, #ff9f43)',
                        border: 'none',
                        color: 'white',
                        padding: '12px 28px',
                        borderRadius: '8px',
                        fontWeight: 600,
                        fontFamily: "'Orbitron', monospace",
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                        boxShadow: '0 4px 15px rgba(255, 107, 53, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'all 0.2s ease',
                        marginTop: '0.5rem'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 6px 20px rgba(255, 107, 53, 0.5)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 4px 15px rgba(255, 107, 53, 0.3)';
                    }}
                >
                    <RefreshCw size={16} /> RECONNECT GRID
                </button>
            </div>

            <style>
                {`
                @keyframes pulse-icon {
                    0% { transform: scale(1); opacity: 0.9; }
                    50% { transform: scale(1.08); opacity: 1; filter: drop-shadow(0 0 8px rgba(239, 68, 68, 0.6)); }
                    100% { transform: scale(1); opacity: 0.9; }
                }
                @keyframes fade-in-glow {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                `}
            </style>
        </div>
    );
};

export default NetworkStatusDetector;
