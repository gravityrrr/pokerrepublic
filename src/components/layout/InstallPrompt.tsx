import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

const InstallPrompt: React.FC = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);

    // Check if already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                         (window.navigator as any).standalone === true;

    // Check if we've shown it recently
    const hasDismissed = localStorage.getItem('pwa-prompt-dismissed');

    if (isIOSDevice && !isStandalone && !hasDismissed) {
      setShowPrompt(true);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem('pwa-prompt-dismissed', 'true');
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      backgroundColor: 'var(--bg-elevated)',
      padding: '1rem',
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow-lg)',
      border: '1px solid var(--border-color)',
      zIndex: 9999,
      width: '90%',
      maxWidth: '400px',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.5rem'
    }} className="animate-slide-up">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
          <Download size={18} className="text-primary" /> Install App
        </h4>
        <button onClick={handleDismiss} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
          <X size={18} />
        </button>
      </div>
      <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
        Install Poker Republic on your {isIOS ? 'iPhone/iPad' : 'device'} for the best experience.
      </p>
      {isIOS && (
        <div style={{ backgroundColor: 'var(--bg-tertiary)', padding: '0.75rem', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', color: 'var(--text-primary)' }}>
          Tap the <strong>Share</strong> icon at the bottom of your screen and select <strong>"Add to Home Screen"</strong>.
        </div>
      )}
    </div>
  );
};

export default InstallPrompt;
