import { useState, useCallback, useEffect } from 'react';
import { useStore } from '@/store';

interface LockOverlayProps { onCancel: () => void; }

export function LockOverlay({ onCancel }: LockOverlayProps) {
  const { lockIdentity } = useStore();
  const [countdown, setCountdown] = useState(3);

  const handleLock = useCallback(() => lockIdentity(), [lockIdentity]);

  useEffect(() => {
    if (countdown <= 0) { handleLock(); return; }
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, handleLock]);

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgb(0 0 0 / 0.8)', backdropFilter: 'blur(4px)' }}>
      <div className="rounded-2xl p-8 max-w-sm w-full text-center border" style={{ backgroundColor: 'var(--bg-sidebar)', borderColor: 'var(--border)' }}>
        <div className="w-12 h-12 mx-auto mb-4 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgb(220 38 38 / 0.15)' }}>
          <span className="text-xl">🔒</span>
        </div>
        <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Lock Session</h2>
        <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>This will immediately remove decrypted keys and conversations from memory. Only your encrypted profile file will remain.</p>
        <p className="text-xs mb-6" style={{ color: 'var(--text-muted)' }}>Auto-locking in {countdown}s...</p>
        <div className="flex gap-3">
          <button onClick={handleLock} className="btn-danger flex-1">Lock Now</button>
          <button onClick={onCancel} className="btn-secondary flex-1">Cancel</button>
        </div>
      </div>
    </div>
  );
}
