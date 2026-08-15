import { useMemo, useRef, useEffect } from 'react';
import { useStore } from '@/store';
import { MessageInput } from './MessageInput';
import { ConversationHeader } from './ConversationHeader';

export function ChatArea() {
  const { selectedConversationId, conversations, contacts, messages, identity } = useStore();
  const bottomRef = useRef<HTMLDivElement>(null);

  const conversation = useMemo(
    () => conversations.find((c) => c.id === selectedConversationId),
    [conversations, selectedConversationId],
  );

  const contact = useMemo(
    () => (conversation ? contacts.find((c) => c.publicId === conversation.contactPublicId) : null),
    [conversation, contacts],
  );

  const convMessages = useMemo(
    () => (selectedConversationId ? messages[selectedConversationId] || [] : []),
    [messages, selectedConversationId],
  );

  useEffect(() => {
    if (convMessages.length > 0) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [convMessages.length]);

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ backgroundColor: 'var(--bg-main)' }}>
        <div className="text-center" style={{ color: 'var(--text-muted)' }}>
          <div className="text-4xl mb-4">💬</div>
          <p className="text-lg font-medium">Select a conversation</p>
          <p className="text-sm mt-1">Choose a contact or start a new conversation</p>
          <div className="mt-6 text-xs max-w-sm">
            <p>All messages are end-to-end encrypted. The relay cannot read your conversations.</p>
          </div>
        </div>
      </div>
    );
  }

  const displayName = contact?.alias || conversation.contactPublicId.substring(0, 12) + '...';
  const contactPublicId = conversation.contactPublicId;

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    const isToday = d.toDateString() === new Date().toDateString();
    return isToday
      ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex-1 flex flex-col" style={{ backgroundColor: 'var(--bg-main)' }}>
      <ConversationHeader displayName={displayName} publicId={contactPublicId} conversationId={conversation.id} />

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {convMessages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center" style={{ color: 'var(--text-muted)' }}>
              <div className="w-16 h-16 mx-auto mb-3 rounded-2xl flex items-center justify-center" style={{ backgroundColor: 'var(--bg-card)' }}>
                <span className="text-2xl">🔒</span>
              </div>
              <p className="text-sm font-medium">End-to-end encrypted conversation</p>
              <p className="text-xs mt-1 max-w-sm">Messages are encrypted with the Double Ratchet protocol. Only you and {displayName} can read them.</p>
              <p className="text-xs mt-3 font-mono" style={{ color: 'var(--text-muted)' }}>{contactPublicId.substring(0, 16)}...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            {convMessages.map((msg, i) => {
              const prev = i > 0 ? convMessages[i - 1] : null;
              const showHeader = !prev || prev.senderPublicId !== msg.senderPublicId || msg.timestamp - prev.timestamp > 300000;

              return (
                <div key={msg.id}>
                  {showHeader && (
                    <div className={`flex items-center gap-2 mt-4 mb-1 ${msg.sent ? 'justify-end' : ''}`}>
                      {!msg.sent && <span className="text-xs font-medium" style={{ color: 'rgb(var(--color-primary))' }}>{displayName}</span>}
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatTime(msg.timestamp)}</span>
                    </div>
                  )}
                  <div className={`flex ${msg.sent ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className="max-w-[70%] px-4 py-2 rounded-2xl text-sm leading-relaxed"
                      style={msg.sent
                        ? { backgroundColor: 'rgb(var(--color-primary))', color: '#fff', borderBottomRightRadius: '0.375rem' }
                        : { backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', borderBottomLeftRadius: '0.375rem' }
                      }
                    >
                      <div className="whitespace-pre-wrap break-words">{msg.text}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <MessageInput conversationId={conversation.id} />
    </div>
  );
}
