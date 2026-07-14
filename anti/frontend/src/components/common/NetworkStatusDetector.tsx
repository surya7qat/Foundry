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
        <div className="network-overlay">
            <div className="network-card">
                {/* Glowing Radar Offline Icon */}
                <div className="network-icon-wrapper">
                    <WifiOff size={44} color="#ef4444" />
                </div>

                <h2 className="network-title">
                    CONNECTION ERROR
                </h2>

                <p className="network-description">
                    The terminal grid cannot establish connection to the master database. Please check your local network or server availability.
                </p>

                <button 
                    onClick={handleRefresh}
                    className="network-btn"
                >
                    <RefreshCw size={16} /> RECONNECT GRID
                </button>
            </div>

            <style>
                {`
                .network-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(5, 5, 5, 0.92);
                    backdrop-filter: blur(12px);
                    z-index: 999999;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    padding: 20px;
                    box-sizing: border-box;
                }

                .network-card {
                    background: rgba(239, 68, 68, 0.05);
                    border: 1px solid rgba(239, 68, 68, 0.2);
                    border-radius: 16px;
                    padding: 3rem 2rem;
                    max-width: 480px;
                    width: 100%;
                    text-align: center;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 1.5rem;
                    box-shadow: 0 20px 50px rgba(0,0,0,0.5), 0 0 30px rgba(239, 68, 68, 0.1);
                    animation: fade-in-glow 0.5s ease-out;
                    box-sizing: border-box;
                }

                .network-icon-wrapper {
                    width: 90px;
                    height: 90px;
                    border-radius: 50%;
                    background: rgba(239, 68, 68, 0.1);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border: 1px solid rgba(239, 68, 68, 0.3);
                    box-shadow: 0 0 20px rgba(239, 68, 68, 0.2);
                    margin-bottom: 0.5rem;
                    position: relative;
                }

                .network-icon-wrapper svg {
                    animation: pulse-icon 2s infinite;
                }

                .network-title {
                    font-family: 'Orbitron', monospace;
                    font-size: 1.5rem;
                    font-weight: 700;
                    letter-spacing: 1px;
                    margin: 0;
                    background: linear-gradient(135deg, #ef4444, #ff6b35);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                }

                .network-description {
                    color: #ccc;
                    font-size: 0.95rem;
                    line-height: 1.6;
                    margin: 0;
                }

                .network-btn {
                    background: linear-gradient(135deg, #ff6b35, #ff9f43);
                    border: none;
                    color: white;
                    padding: 12px 28px;
                    border-radius: 8px;
                    font-weight: 600;
                    font-family: 'Orbitron', monospace;
                    font-size: 0.9rem;
                    cursor: pointer;
                    box-shadow: 0 4px 15px rgba(255, 107, 53, 0.3);
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    transition: all 0.2s ease;
                    margin-top: 0.5rem;
                }

                .network-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 20px rgba(255, 107, 53, 0.5);
                }

                .network-btn:active {
                    transform: translateY(0);
                }

                @keyframes pulse-icon {
                    0% { transform: scale(1); opacity: 0.9; }
                    50% { transform: scale(1.08); opacity: 1; filter: drop-shadow(0 0 8px rgba(239, 68, 68, 0.6)); }
                    100% { transform: scale(1); opacity: 0.9; }
                }

                @keyframes fade-in-glow {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }

                /* Mobile Viewport Adaptations */
                @media (max-width: 768px) {
                    .network-overlay {
                        padding: 16px;
                    }

                    .network-card {
                        padding: 2rem 1.25rem;
                        gap: 1.25rem;
                        border-radius: 12px;
                        box-shadow: 0 15px 35px rgba(0,0,0,0.5), 0 0 20px rgba(239, 68, 68, 0.1);
                    }

                    .network-icon-wrapper {
                        width: 72px;
                        height: 72px;
                        margin-bottom: 0.25rem;
                    }

                    .network-icon-wrapper svg {
                        width: 32px !important;
                        height: 32px !important;
                    }

                    .network-title {
                        font-size: 1.25rem;
                    }

                    .network-description {
                        font-size: 0.85rem;
                        line-height: 1.5;
                    }

                    .network-btn {
                        padding: 10px 20px;
                        font-size: 0.85rem;
                        width: 100%;
                        justify-content: center;
                    }
                }
                `}
            </style>
        </div>
    );
};

export default NetworkStatusDetector;
