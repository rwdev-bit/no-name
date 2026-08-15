import { useState } from 'react';
import { useStore } from '@/store';

interface AddContactPanelProps { onNavigate: (panel: any) => void; }

export function AddContactPanel({ onNavigate }: AddContactPanelProps) {
  const [publicId, setPublicId] = useState('');
  const [alias, setAlias] = useState('');
  const [error, setError] = useState('');
  const { addContact, createConversation, selectConversation } = useStore();

  const handleAdd = () => {
    const trimmed = publicId.trim();
    if (!trimmed) { setError('Please enter a Public ID'); return; }
    if (trimmed.length < 16) { setError('Public ID appears too short'); return; }
    addContact(trimmed, alias.trim() || undefined);
    const convId = createConversation(trimmed);
    if (convId) { selectConversation(convId); onNavigate('conversations'); }
  };

  return (
    <div className="w-72 flex flex-col border-r" style={{ backgroundColor: 'var(--bg-sidebar)', borderColor: 'var(--border)' }}>
      <div className="p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide mb-4" style={{ color: 'var(--text-primary)' }}>Add Contact</h2>
        <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>To message someone, you need their Public ID. They can share it through any trusted channel.</p>
        {error && <div className="mb-3 p-2 rounded-lg text-xs" style={{ backgroundColor: 'rgb(220 38 38 / 0.15)', color: '#fca5a5' }}>{error}</div>}
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Public ID</label>
            <textarea value={publicId} onChange={(e) => { setPublicId(e.target.value); setError(''); }} placeholder="B9KoW4MqP4WKeq5UxGs6FY8Pt8Y..." className="input text-xs font-mono resize-none h-20" autoFocus />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Alias (optional)</label>
            <input type="text" value={alias} onChange={(e) => setAlias(e.target.value)} placeholder="Alice" className="input text-sm" />
          </div>
          <button onClick={handleAdd} className="btn-primary w-full py-2 text-sm">Add & Start Chat</button>
        </div>
        <div className="mt-6 p-3 rounded-lg border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            <strong style={{ color: 'var(--text-primary)' }}>How to get Public IDs:</strong><br />
            • Share your own Public ID from Settings<br />
            • Receive IDs through other channels<br />
            • Public IDs are not searchable or discoverable
          </p>
        </div>
      </div>
    </div>
  );
}
