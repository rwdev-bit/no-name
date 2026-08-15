import type { Conversation } from '@/types';

interface ConversationItemProps {
  conversation: Conversation;
  contact: { alias: string | null; displayName: string };
  lastMessage: { text: string; timestamp: number } | null;
  isSelected: boolean;
  onSelect: () => void;
}

export function ConversationItem({
  conversation,
  contact,
  lastMessage,
  isSelected,
  onSelect,
}: ConversationItemProps) {
  const timeAgo = (ts: number) => {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d`;
    return new Date(ts).toLocaleDateString();
  };

  const displayName = contact.alias || contact.displayName;

  return (
    <div
      onClick={onSelect}
      className="group px-2 py-2 rounded-lg cursor-pointer mb-0.5 transition-colors border"
      style={{
        backgroundColor: isSelected ? 'rgb(var(--color-primary) / 0.15)' : 'transparent',
        borderColor: isSelected ? 'rgb(var(--color-primary) / 0.3)' : 'transparent',
      }}
      onMouseEnter={(e) => {
        if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
      }}
      onMouseLeave={(e) => {
        if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
      }}
    >
      <div className="flex items-center gap-2">
        <div
          className="w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center text-sm font-medium"
          style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-primary)' }}
        >
          {displayName.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
              {displayName}
            </span>
            <span className="text-xs flex-shrink-0 ml-1" style={{ color: 'var(--text-muted)' }}>
              {conversation.lastMessageAt ? timeAgo(conversation.lastMessageAt) : ''}
            </span>
          </div>
          <div className="mt-0.5 text-xs truncate" style={{ color: 'var(--text-muted)' }}>
            {lastMessage ? lastMessage.text.substring(0, 60) : 'No messages yet'}
          </div>
        </div>
      </div>
    </div>
  );
}
