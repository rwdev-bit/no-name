import { useState } from 'react';
import { useStore } from '@/store';

interface ContactsPanelProps {
  onNavigate: (panel: any) => void;
}

export function ContactsPanel({ onNavigate }: ContactsPanelProps) {
  const { contacts, removeContact, setContactAlias, createConversation, selectConversation } = useStore();
  const [editingPubId, setEditingPubId] = useState<string | null>(null);
  const [aliasText, setAliasText] = useState('');

  const handleStartAliasEdit = (publicId: string, currentAlias: string | null) => {
    setEditingPubId(publicId);
    setAliasText(currentAlias || '');
  };

  const handleSaveAlias = (publicId: string) => {
    setContactAlias(publicId, aliasText.trim());
    setEditingPubId(null);
  };

  return (
    <div className="w-72 flex flex-col" style={{ backgroundColor: 'var(--bg-sidebar)', borderRight: '1px solid var(--border)' }}>
      <div className="p-4 pb-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-primary)' }}>
            Contacts
          </h2>
          <button
            onClick={() => onNavigate('add-contact')}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[var(--bg-hover)] text-sm"
            style={{ color: 'var(--text-secondary)' }}
          >
            +
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-2">
        {contacts.length === 0 ? (
          <div className="text-center text-sm py-8" style={{ color: 'var(--text-muted)' }}>
            <div className="mb-2 text-2xl">👤</div>
            <p>No contacts</p>
            <p className="text-xs mt-1">Add contacts by Public ID</p>
          </div>
        ) : (
          contacts.map((contact) => {
            const displayName = contact.alias || contact.publicId.substring(0, 12) + '...';
            const isEditing = editingPubId === contact.publicId;

            return (
              <div
                key={contact.publicId}
                className="group px-2 py-2 rounded-lg mb-0.5"
                style={{ color: 'var(--text-primary)' }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center text-sm font-medium"
                    style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-primary)' }}
                  >
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    {isEditing ? (
                      <div className="flex gap-1">
                        <input
                          type="text"
                          value={aliasText}
                          onChange={(e) => setAliasText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveAlias(contact.publicId);
                            if (e.key === 'Escape') setEditingPubId(null);
                          }}
                          className="flex-1 px-2 py-0.5 rounded text-xs border focus:outline-none"
                          style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                          autoFocus
                          placeholder="Set alias..."
                        />
                        <button onClick={() => handleSaveAlias(contact.publicId)} className="text-xs" style={{ color: 'rgb(var(--color-primary))' }}>
                          Save
                        </button>
                      </div>
                    ) : (
                      <div
                        className="text-sm font-medium truncate cursor-pointer"
                        onClick={() => handleStartAliasEdit(contact.publicId, contact.alias)}
                        title="Click to edit alias"
                      >
                        {displayName}
                      </div>
                    )}
                    <div className="text-xs font-mono truncate" style={{ color: 'var(--text-muted)' }}>
                      {contact.publicId.substring(0, 20)}...
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => {
                        const convId = createConversation(contact.publicId);
                        if (convId) { selectConversation(convId); onNavigate('conversations'); }
                      }}
                      className="w-6 h-6 flex items-center justify-center rounded text-sm"
                      style={{ color: 'var(--text-muted)' }}
                      title="Message"
                    >
                      💬
                    </button>
                    <button
                      onClick={() => handleStartAliasEdit(contact.publicId, contact.alias)}
                      className="w-6 h-6 flex items-center justify-center rounded text-sm"
                      style={{ color: 'var(--text-muted)' }}
                      title="Edit alias"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => removeContact(contact.publicId)}
                      className="w-6 h-6 flex items-center justify-center rounded text-sm"
                      style={{ color: '#f87171' }}
                      title="Remove"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
