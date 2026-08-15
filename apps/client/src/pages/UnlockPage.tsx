import { useState, useRef, useCallback } from 'react';
import { useStore } from '@/store';

export function UnlockPage() {
  const { unlockIdentity, createNewIdentity, finishCreateAndUnlock } = useStore();
  const [mode, setMode] = useState<'choose' | 'creating' | 'unlock' | 'download'>('choose');
  const [passphrase, setPassphrase] = useState('');
  const [generatedPassphrase, setGeneratedPassphrase] = useState('');
  const [confirmedSave, setConfirmedSave] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [importedFile, setImportedFile] = useState<{ data: Uint8Array; name: string } | null>(null);
  const [fileData, setFileData] = useState<Uint8Array | null>(null);
  const [fileName, setFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCreate = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const result = await createNewIdentity();
      setGeneratedPassphrase(result.passphrase);
      setFileData(result.file);
      setFileName(result.fileName);
      setMode('download');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create identity');
    } finally { setLoading(false); }
  }, [createNewIdentity]);

  const handleDownload = useCallback(() => {
    if (!fileData) return;
    const blob = new Blob([new Uint8Array(fileData)], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = fileName; a.click();
    URL.revokeObjectURL(url);
    finishCreateAndUnlock();
  }, [fileData, fileName, finishCreateAndUnlock]);

  const handleCopy = useCallback(() => {
    try {
      navigator.clipboard.writeText(generatedPassphrase).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
    } catch {
      const ta = document.createElement('textarea');
      ta.value = generatedPassphrase;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [generatedPassphrase]);

  const handleDownloadPassphrase = useCallback(() => {
    const blob = new Blob([generatedPassphrase], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'passphrase.txt';
    a.click();
    URL.revokeObjectURL(url);
  }, [generatedPassphrase]);

  const handleUnlock = useCallback(async () => {
    if (!importedFile) { setError('Please select your identity file first'); return; }
    if (!passphrase) { setError('Please enter your passphrase'); return; }
    setLoading(true); setError('');
    try {
      await unlockIdentity(importedFile.data, passphrase, importedFile.name);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Incorrect passphrase');
    } finally { setLoading(false); }
  }, [importedFile, passphrase, unlockIdentity]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setImportedFile({ data: new Uint8Array(reader.result as ArrayBuffer), name: file.name });
      setMode('unlock');
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const resetState = useCallback(() => {
    setPassphrase(''); setGeneratedPassphrase(''); setConfirmedSave(false);
    setCopied(false); setError(''); setImportedFile(null); setFileData(null); setFileName('');
  }, []);

  const INPUT = 'w-full px-3 py-2 rounded-lg border text-sm focus:outline-none';
  const inputStyle = { backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' };

  return (
    <>
      <input ref={fileInputRef} type="file" accept=".chatprofile" className="hidden" onChange={handleFileSelect} />
      {mode === 'choose' && (
        <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: 'var(--bg-main)' }}>
          <div className="w-full max-w-md p-8">
            <div className="text-center mb-10">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center" style={{ backgroundColor: 'rgb(var(--color-primary))' }}>
                <span className="text-white font-bold text-2xl">nn</span>
              </div>
              <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>no-name</h1>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Anonymous end-to-end encrypted messenger</p>
            </div>
            <div className="space-y-3">
              <button onClick={() => { resetState(); setMode('creating'); handleCreate(); }} className="w-full p-4 rounded-xl border text-left transition-colors" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                <div className="font-medium" style={{ color: 'var(--text-primary)' }}>Create New Identity</div>
                <div className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Generate keys and create a portable encrypted profile</div>
              </button>
              <button onClick={() => fileInputRef.current?.click()} className="w-full p-4 rounded-xl border text-left transition-colors" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                <div className="font-medium" style={{ color: 'var(--text-primary)' }}>Unlock Existing Profile</div>
                <div className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Open your .chatprofile file and enter your passphrase</div>
              </button>
            </div>
            <p className="text-center text-xs mt-8" style={{ color: 'var(--text-muted)' }}>Your identity lives entirely inside your encrypted profile file.<br />The relay never sees your keys, contacts, or messages.</p>
          </div>
        </div>
      )}

      {mode === 'creating' && (
        <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: 'var(--bg-main)' }}>
          <div className="w-full max-w-md p-8 text-center">
            <h1 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Creating Identity</h1>
            <p className="text-sm mb-8" style={{ color: 'var(--text-secondary)' }}>Generating keys and encrypting your profile...</p>
            <div className="flex flex-col items-center gap-4">
              <div className="w-10 h-10 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: 'rgb(var(--color-primary))' }} />
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>This should only take a moment.</p>
            </div>
          </div>
        </div>
      )}

      {mode === 'download' && (
        <div className="w-full h-full overflow-y-auto" style={{ backgroundColor: 'var(--bg-main)' }}>
          <div className="w-full max-w-2xl mx-auto p-8">
            <div className="text-center mb-6">
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgb(34 197 94 / 0.15)' }}>
                <span className="text-xl">✓</span>
              </div>
              <h1 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Identity Created</h1>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Save your passphrase — it's the only way to unlock your profile.</p>
            </div>

            <div className="mb-6 p-4 rounded-xl border" style={{ backgroundColor: 'rgb(220 38 38 / 0.06)', borderColor: 'rgb(220 38 38 / 0.2)' }}>
              <p className="text-sm font-semibold mb-2" style={{ color: '#fca5a5' }}>⚠️ Save your passphrase now. There is no recovery.</p>
              <p className="text-xs" style={{ color: '#fca5a5', opacity: 0.8 }}>If you lose your passphrase and profile file, your identity and all conversations are permanently lost. Write it down or store it in a password manager.</p>
            </div>

            <div className="mb-6 p-4 rounded-xl border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Your Passphrase</span>
                <div className="flex gap-2">
                  <button onClick={handleCopy} className="text-xs px-3 py-1 rounded-lg" style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                  <button onClick={handleDownloadPassphrase} className="text-xs px-3 py-1 rounded-lg" style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>
                    .txt
                  </button>
                </div>
              </div>
              <div className="font-mono text-sm leading-relaxed select-all break-words" style={{ color: 'var(--text-primary)' }}>
                {generatedPassphrase}
              </div>
            </div>

            {!confirmedSave ? (
              <button onClick={() => setConfirmedSave(true)} className="btn-primary w-full py-3 rounded-lg mb-3">I Have Saved My Passphrase</button>
            ) : (
              <div>
                <div className="mb-4 p-3 rounded-lg text-xs text-center" style={{ backgroundColor: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.3)', color: '#fde047' }}>
                  Confirm: you have stored your passphrase securely and understand there is no recovery.
                </div>
                <button onClick={handleDownload} className="btn-primary w-full py-3 rounded-lg">Download Encrypted Profile</button>
              </div>
            )}
          </div>
        </div>
      )}

      {mode === 'unlock' && (
        <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: 'var(--bg-main)' }}>
          <div className="w-full max-w-md p-8">
            <h1 className="text-xl font-bold mb-2 text-center" style={{ color: 'var(--text-primary)' }}>Unlock Profile</h1>
            <p className="text-sm mb-8 text-center" style={{ color: 'var(--text-secondary)' }}>Enter your passphrase to unlock</p>
            {error && <div className="mb-4 p-3 rounded-lg text-sm" style={{ backgroundColor: 'rgb(220 38 38 / 0.15)', color: '#fca5a5' }}>{error}</div>}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Profile</label>
                {importedFile ? (
                  <div className="flex items-center gap-2 p-2 rounded-lg border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                    <span className="text-sm flex-1 truncate" style={{ color: 'var(--text-primary)' }}>{importedFile.name}</span>
                    <button onClick={() => { fileInputRef.current?.click(); }} className="text-xs" style={{ color: 'var(--text-muted)' }}>Change</button>
                  </div>
                ) : (
                  <button onClick={() => fileInputRef.current?.click()} className="w-full p-3 rounded-lg border-2 border-dashed text-sm" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>Click to select .chatprofile file</button>
                )}
              </div>
              {importedFile && (
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Passphrase</label>
                  <textarea className={INPUT + ' font-mono resize-none h-24'} style={inputStyle} placeholder="Paste your passphrase..." value={passphrase} onChange={(e) => setPassphrase(e.target.value)} />
                </div>
              )}
              <button onClick={handleUnlock} disabled={loading || !importedFile} className="btn-primary w-full py-3 rounded-lg">{loading ? 'Decrypting...' : 'Unlock'}</button>
              <button onClick={() => { resetState(); setMode('choose'); }} className="btn-ghost w-full">Back</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
