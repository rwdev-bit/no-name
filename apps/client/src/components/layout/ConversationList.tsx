import { useStore } from '@/store';
import { ConversationItem } from './ConversationItem';

interface ConversationListProps { onNavigate: (panel: any) => void; }

export function ConversationList({ onNavigate }: ConversationListProps) {
  const { conversations, contacts, messages, selectedConversationId, selectConversation } = useStore();

  const pinned = conversations.filter((c) => c.pinned && !c.archived);
  const active = conversations.filter((c) => !c.pinned && !c.archived);
  const archived = conversations.filter((c) => c.archived);

  const getContactDisplay = (publicId: string) => {
    const contact = contacts.find((c) => c.publicId === publicId);
    return { alias: contact?.alias ?? null, displayName: contact?.alias || publicId.substring(0, 12) + '...' };
  };

  const getLastMessage = (conversationId: string) => {
    const msgs = messages[conversationId];
    return msgs && msgs.length > 0 ? msgs[msgs.length - 1] : null;
  };

  const sorted = (list: typeof conversations) => [...list].sort((a, b) => b.lastMessageAt - a.lastMessageAt);

  return (
    <div className="w-72 flex flex-col border-r" style={{ backgroundColor: 'var(--bg-sidebar)', borderColor: 'var(--border)' }}>
      <div className="p-4 pb-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-primary)' }}>Messages</h2>
          <button onClick={() => onNavigate('add-contact')} className="w-7 h-7 flex items-center justify-center rounded-lg text-sm" style={{ color: 'var(--text-secondary)' }}>+</button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-2">
        {pinned.length > 0 && (
          <div className="mb-2">
            <div className="px-2 py-1 text-xs font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Pinned</div>
            {sorted(pinned).map((conv) => (
              <ConversationItem key={conv.id} conversation={conv} contact={getContactDisplay(conv.contactPublicId)} lastMessage={getLastMessage(conv.id)} isSelected={selectedConversationId === conv.id} onSelect={() => selectConversation(conv.id)} />
            ))}
          </div>
        )}
        <div className="mb-2">
          {pinned.length > 0 && <div className="px-2 py-1 text-xs font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Recent</div>}
          {sorted(active).map((conv) => (
            <ConversationItem key={conv.id} conversation={conv} contact={getContactDisplay(conv.contactPublicId)} lastMessage={getLastMessage(conv.id)} isSelected={selectedConversationId === conv.id} onSelect={() => selectConversation(conv.id)} />
          ))}
          {active.length === 0 && pinned.length === 0 && (
            <div className="text-center text-sm py-8" style={{ color: 'var(--text-muted)' }}>
              <div className="mb-2 text-2xl">💬</div>
              <p>No conversations yet</p>
              <p className="text-xs mt-1">Add a contact to start messaging</p>
            </div>
          )}
        </div>
      </div>
      {archived.length > 0 && (
        <div className="p-2" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="px-2 py-1 text-xs font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Archived ({archived.length})</div>
          {sorted(archived).slice(0, 3).map((conv) => (
            <ConversationItem key={conv.id} conversation={conv} contact={getContactDisplay(conv.contactPublicId)} lastMessage={getLastMessage(conv.id)} isSelected={selectedConversationId === conv.id} onSelect={() => selectConversation(conv.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
