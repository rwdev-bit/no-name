import { useState, useCallback, useRef, useEffect } from 'react';
import { useStore } from '@/store';

interface ConversationHeaderProps {
  displayName: string;
  publicId: string;
  conversationId: string;
}

export function ConversationHeader({
  displayName,
  publicId,
  conversationId,
}: ConversationHeaderProps) {
  const { pinConversation, archiveConversation, conversations, contacts, setContactAlias } = useStore();
  const conversation = conversations.find((c) => c.id === conversationId);
  const contact = contacts.find((c) => c.publicId === conversation?.contactPublicId);
  const [showMenu, setShowMenu] = useState(false);
  const [editingAlias, setEditingAlias] = useState(false);
  const [aliasValue, setAliasValue] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSaveAlias = () => {
    if (conversation) {
      setContactAlias(conversation.contactPublicId, aliasValue.trim());
    }
    setEditingAlias(false);
  };

  return (
    <div className="h-14 flex items-center px-4 gap-3 flex-shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
      <div
        className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-medium"
        style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-primary)' }}
      >
        {displayName.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        {editingAlias ? (
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={aliasValue}
              onChange={(e) => setAliasValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveAlias();
                if (e.key === 'Escape') setEditingAlias(false);
              }}
              className="text-sm font-semibold px-2 py-0.5 rounded border focus:outline-none"
              style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              autoFocus
            />
            <button onClick={handleSaveAlias} className="text-xs" style={{ color: 'rgb(var(--color-primary))' }}>
              Save
            </button>
          </div>
        ) : (
          <div
            className="text-sm font-semibold truncate cursor-pointer"
            style={{ color: 'var(--text-primary)' }}
            onClick={() => {
              setAliasValue(contact?.alias || '');
              setEditingAlias(true);
            }}
            title="Click to edit alias"
          >
            {displayName}
          </div>
        )}
        <div className="text-xs font-mono truncate" style={{ color: 'var(--text-muted)' }}>
          {publicId.substring(0, 16)}...
        </div>
      </div>
      <div className="relative flex items-center gap-1" ref={menuRef}>
        <button
          onClick={() => {
            setAliasValue(contact?.alias || '');
            setEditingAlias(!editingAlias);
          }}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-sm"
          style={{ color: 'var(--text-muted)' }}
          title="Edit alias"
        >
          ✏️
        </button>
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-sm"
          style={{ color: 'var(--text-muted)' }}
        >
          ⚙️
        </button>
        {showMenu && (
          <div
            className="absolute right-0 top-full mt-1 w-44 rounded-lg shadow-xl z-50 border"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}
          >
            <button
              onClick={() => { pinConversation(conversationId); setShowMenu(false); }}
              className="w-full text-left px-4 py-2 text-sm hover:rounded-t-lg"
              style={{ color: 'var(--text-primary)' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              {conversation?.pinned ? '📌 Unpin' : '📌 Pin'}
            </button>
            <button
              onClick={() => { archiveConversation(conversationId); setShowMenu(false); }}
              className="w-full text-left px-4 py-2 text-sm"
              style={{ color: 'var(--text-primary)' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              {conversation?.archived ? '📂 Unarchive' : '📦 Archive'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
