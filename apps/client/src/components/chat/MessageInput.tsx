import { useState, useCallback, useRef, useEffect } from 'react';
import { useStore } from '@/store';

interface MessageInputProps { conversationId: string; }

export function MessageInput({ conversationId }: MessageInputProps) {
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { sendMessage, updateDraft, conversations } = useStore();
  const conversation = conversations.find((c) => c.id === conversationId);

  useEffect(() => { setText(conversation?.draft || ''); }, [conversationId]);
  useEffect(() => { inputRef.current?.focus(); }, [conversationId]);

  const handleSend = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setText('');
    updateDraft(conversationId, '');
    await sendMessage(conversationId, trimmed);
  }, [text, conversationId, sendMessage, updateDraft]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }, [handleSend]);

  return (
    <div className="px-4 py-3" style={{ borderTop: '1px solid var(--border)' }}>
      <div className="flex items-end gap-2">
        <textarea
          ref={inputRef}
          value={text}
          onChange={(e) => { setText(e.target.value); updateDraft(conversationId, e.target.value); }}
          onKeyDown={handleKeyDown}
          placeholder="Message..."
          rows={1}
          className="flex-1 px-3 py-2 rounded-xl text-sm resize-none focus:outline-none"
          style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)', minHeight: '38px', maxHeight: '128px' }}
        />
        <button
          onClick={handleSend}
          disabled={!text.trim()}
          className="w-10 h-10 flex items-center justify-center rounded-xl transition-colors"
          style={{ backgroundColor: text.trim() ? 'rgb(var(--color-primary))' : 'var(--bg-card)', color: text.trim() ? '#fff' : 'var(--text-muted)', cursor: text.trim() ? 'pointer' : 'default' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </button>
      </div>
      <div className="flex items-center justify-between mt-2 px-1">
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Enter to send · Shift+Enter new line</span>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>🔒 E2E Encrypted</span>
      </div>
    </div>
  );
}
