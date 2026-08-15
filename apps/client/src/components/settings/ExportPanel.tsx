import { useState } from 'react';
import { useStore } from '@/store';
import { exportIdentityFile } from '@/crypto/identity';

interface ExportPanelProps { onNavigate: (panel: any) => void; }

export function ExportPanel({ onNavigate }: ExportPanelProps) {
  const { identity } = useStore();
  const [exporting, setExporting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const handleExport = async () => {
    if (!identity) return;
    const passphrase = prompt('Enter your passphrase to export:');
    if (!passphrase) return;

    setExporting(true);
    setError('');

    try {
      const fileData = exportIdentityFile(identity, passphrase);

      const blob = new Blob([new Uint8Array(fileData)], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'identity.chatprofile';
      a.click();
      URL.revokeObjectURL(url);
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Incorrect passphrase');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex-1 p-6 overflow-y-auto" style={{ backgroundColor: 'var(--bg-main)' }}>
      <div className="max-w-lg">
        <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Export Account</h2>
        <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
          Your entire identity lives in the encrypted profile file. Export it to back up your account — the relay stores nothing about you.
        </p>

        <div className="space-y-4">
          <div className="p-4 rounded-xl border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Encrypted Profile Backup</h3>
            <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
              This file contains your encrypted keys, contacts, aliases, settings, and conversations.
              Without it, your identity is lost — the relay has no copy.
            </p>

            {error && (
              <div className="mb-3 p-2 rounded-lg text-xs" style={{ backgroundColor: 'rgb(220 38 38 / 0.15)', color: '#fca5a5' }}>
                {error}
              </div>
            )}
            {done && (
              <div className="mb-3 p-2 rounded-lg text-xs" style={{ backgroundColor: 'rgb(34 197 94 / 0.15)', color: '#86efac' }}>
                Profile exported. Store this file somewhere safe along with your passphrase.
              </div>
            )}

            <button onClick={handleExport} disabled={exporting} className="btn-primary text-sm">
              {exporting ? 'Exporting...' : 'Export Encrypted Profile'}
            </button>
          </div>

          <div className="p-4 rounded-xl border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>How Recovery Works</h3>
            <div className="space-y-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
              <p>1. <strong style={{ color: 'var(--text-primary)' }}>Export</strong> your encrypted profile file.</p>
              <p>2. <strong style={{ color: 'var(--text-primary)' }}>Save</strong> your passphrase separately.</p>
              <p>3. On any device, <strong style={{ color: 'var(--text-primary)' }}>Import</strong> the .chatprofile file.</p>
              <p>4. <strong style={{ color: 'var(--text-primary)' }}>Enter your passphrase</strong> to unlock your full identity — contacts, aliases, settings, and conversations are all restored.</p>
            </div>
            <div className="mt-3 p-2 rounded-lg text-xs" style={{ backgroundColor: 'rgb(76 110 245 / 0.1)', color: 'rgb(76 110 245)' }}>
              Nothing about you exists on the relay. Your .chatprofile file IS your account.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
