import { useState } from 'react';
import { useStore } from '@/store';
import type { AppSettings } from '@/types';

interface SettingsPanelProps {
  onNavigate: (panel: any) => void;
}

export function SettingsPanel({ onNavigate }: SettingsPanelProps) {
  const { identity, settings, updateSettings } = useStore();
  const [passError, setPassError] = useState('');
  const [newPassphrase, setNewPassphrase] = useState('');
  const [showNewPassphrase, setShowNewPassphrase] = useState(false);
  const [copiedNew, setCopiedNew] = useState(false);

  if (!identity) return null;

  const update = (key: keyof AppSettings, value: any) => {
    updateSettings({ [key]: value });
  };

  const handleShufflePassphrase = () => {
    const current = prompt('Enter your current passphrase to confirm:');
    if (!current) return;

    const { generatePassphrase, changePassphrase } = useStore.getState();
    const newPass = generatePassphrase();

    try {
      const file = changePassphrase(current, newPass);
      const blob = new Blob([new Uint8Array(file)], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'identity.chatprofile';
      a.click();
      URL.revokeObjectURL(url);

      setNewPassphrase(newPass);
      setShowNewPassphrase(true);
      setPassError('');
    } catch (e) {
      setPassError('Failed — incorrect current passphrase?');
    }
  };

  const COLOR_OPTIONS = [
    { hex: '#4c6ef5', label: 'Blue' },
    { hex: '#ae3ec9', label: 'Purple' },
    { hex: '#f06595', label: 'Pink' },
    { hex: '#20c997', label: 'Green' },
    { hex: '#f59f00', label: 'Amber' },
    { hex: '#e03131', label: 'Red' },
    { hex: '#7950f2', label: 'Violet' },
    { hex: '#15aabf', label: 'Cyan' },
  ];

  return (
    <div className="flex-1 flex overflow-hidden">
      <div className="w-72 border-r p-4" style={{ backgroundColor: 'var(--bg-sidebar)', borderColor: 'var(--border)' }}>
        <h2 className="text-sm font-semibold uppercase tracking-wide mb-4" style={{ color: 'var(--text-primary)' }}>
          Settings
        </h2>
        <nav className="space-y-1">
          <div className="px-3 py-2 rounded-lg text-sm" style={{ backgroundColor: 'rgb(var(--color-primary) / 0.2)', color: 'rgb(var(--color-primary))' }}>
            Appearance
          </div>
        </nav>
      </div>
      <div className="flex-1 overflow-y-auto p-6" style={{ backgroundColor: 'var(--bg-main)' }}>
        <h3 className="text-lg font-semibold mb-6" style={{ color: 'var(--text-primary)' }}>Appearance</h3>

        <div className="max-w-lg space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Theme</label>
            <div className="flex gap-2">
              {(['dark', 'light'] as const).map((theme) => (
                <button
                  key={theme}
                  onClick={() => update('theme', theme)}
                  className={`px-4 py-2 rounded-lg text-sm capitalize ${
                    settings.theme === theme ? 'btn-primary' : 'btn-secondary'
                  }`}
                >
                  {theme}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Accent Color</label>
            <div className="flex gap-2 flex-wrap">
              {COLOR_OPTIONS.map(({ hex, label }) => (
                <button
                  key={hex}
                  onClick={() => update('accentColor', hex)}
                  className="w-9 h-9 rounded-full border-2 transition-transform hover:scale-110"
                  style={{
                    backgroundColor: hex,
                    borderColor: settings.accentColor === hex ? '#fff' : 'transparent',
                  }}
                  title={label}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Font Size</label>
            <div className="flex gap-2">
              {(['small', 'medium', 'large'] as const).map((size) => (
                <button
                  key={size}
                  onClick={() => update('fontSize', size)}
                  className={`px-4 py-2 rounded-lg text-sm capitalize ${
                    settings.fontSize === size ? 'btn-primary' : 'btn-secondary'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Auto-Lock Timer</label>
            <div className="flex gap-2 flex-wrap">
              {[
                { value: 30, label: '30s' },
                { value: 60, label: '1m' },
                { value: 120, label: '2m' },
                { value: 300, label: '5m' },
                { value: 0, label: 'Never' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => update('lockTimeout', opt.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm ${
                    settings.lockTimeout === opt.value ? 'btn-primary' : 'btn-secondary'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Your Public ID</label>
            <div className="p-3 rounded-lg border mb-2" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
              <div className="font-mono text-xs break-all select-all" style={{ color: 'rgb(var(--color-primary))' }}>
                {identity.publicId}
              </div>
            </div>
            <button
              onClick={() => {
                const text = identity.publicId;
                try {
                  navigator.clipboard.writeText(text).catch(() => {
                    const ta = document.createElement('textarea');
                    ta.value = text; ta.style.cssText = 'position:fixed;opacity:0';
                    document.body.appendChild(ta); ta.select();
                    document.execCommand('copy'); document.body.removeChild(ta);
                  });
                } catch {
                  const ta = document.createElement('textarea');
                  ta.value = text; ta.style.cssText = 'position:fixed;opacity:0';
                  document.body.appendChild(ta); ta.select();
                  document.execCommand('copy'); document.body.removeChild(ta);
                }
              }}
              className="btn-ghost text-xs"
            >
              Copy Public ID
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Passphrase</label>
            <div className="space-y-3">
              {passError && (
                <div className="p-2 rounded-lg text-xs" style={{ backgroundColor: 'rgb(220 38 38 / 0.15)', color: '#fca5a5' }}>
                  {passError}
                </div>
              )}
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Your passphrase is 40 randomly selected words. You can generate a new one.
                Make sure to save it and re-export your profile file.
              </p>
              <button onClick={handleShufflePassphrase} className="btn-primary text-sm">
                Generate New Passphrase
              </button>

              {showNewPassphrase && newPassphrase && (
                <div className="p-4 rounded-xl border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      New Passphrase
                    </span>
                    <button
                      onClick={() => {
                        try {
                          navigator.clipboard.writeText(newPassphrase).catch(() => {
                            const ta = document.createElement('textarea');
                            ta.value = newPassphrase;
                            ta.style.cssText = 'position:fixed;opacity:0';
                            document.body.appendChild(ta);
                            ta.select();
                            document.execCommand('copy');
                            document.body.removeChild(ta);
                          });
                        } catch {
                          const ta = document.createElement('textarea');
                          ta.value = newPassphrase;
                          ta.style.cssText = 'position:fixed;opacity:0';
                          document.body.appendChild(ta);
                          ta.select();
                          document.execCommand('copy');
                          document.body.removeChild(ta);
                        }
                        setCopiedNew(true);
                        setTimeout(() => setCopiedNew(false), 2000);
                      }}
                      className="text-xs px-3 py-1 rounded-lg" style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }}
                    >
                      {copiedNew ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <div className="font-mono text-sm leading-relaxed select-all break-words" style={{ color: 'var(--text-primary)' }}>
                    {newPassphrase}
                  </div>
                  <p className="text-xs mt-3" style={{ color: '#f87171' }}>
                    Save this passphrase now. Then export your profile file to apply the change.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => onNavigate('export')}
              className="btn-secondary text-sm flex-1"
            >
              Export Profile
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
