import { useState, useMemo } from 'react';
import { useStore } from '@/store';

interface SearchPanelProps { onNavigate: (panel: any) => void; }

export function SearchPanel({ onNavigate }: SearchPanelProps) {
  const [query, setQuery] = useState('');
  const { messages, contacts, conversations, selectConversation } = useStore();

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const lower = query.toLowerCase();
    const results: Array<{ message: any; conversationId: string; contactName: string }> = [];

    for (const [convId, msgs] of Object.entries(messages)) {
      const conv = conversations.find((c) => c.id === convId);
      if (!conv) continue;
      const contact = contacts.find((c) => c.publicId === conv.contactPublicId);
      const name = contact?.alias || conv.contactPublicId.substring(0, 12) + '...';
      for (const msg of msgs) {
        if (msg.text.toLowerCase().includes(lower)) {
          results.push({ message: msg, conversationId: convId, contactName: name });
        }
      }
    }
    return results.sort((a, b) => b.message.timestamp - a.message.timestamp);
  }, [query, messages, contacts, conversations]);

  const handleSelect = (convId: string) => { selectConversation(convId); onNavigate('conversations'); };

  return (
    <div className="flex-1 flex flex-col" style={{ backgroundColor: 'var(--bg-main)' }}>
      <div className="p-4" style={{ borderBottom: '1px solid var(--border)' }}>
        <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search messages..." className="input text-sm" autoFocus />
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {!query.trim() ? (
          <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
            <div className="text-2xl mb-2">🔍</div>
            <p className="text-sm">Search your conversations</p>
            <p className="text-xs mt-1">Messages are searched locally after decryption</p>
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}><p className="text-sm">No results found</p></div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>{results.length} result{results.length !== 1 ? 's' : ''}</p>
            {results.map((r, i) => (
              <div key={`${r.message.id}_${i}`} onClick={() => handleSelect(r.conversationId)} className="p-3 rounded-xl border cursor-pointer" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium" style={{ color: 'rgb(var(--color-primary))' }}>{r.contactName}</span>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{new Date(r.message.timestamp).toLocaleString()}</span>
                </div>
                <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{r.message.text.substring(0, 200)}{r.message.text.length > 200 ? '...' : ''}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
