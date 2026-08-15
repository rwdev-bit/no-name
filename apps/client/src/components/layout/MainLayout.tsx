import { useState, useCallback, useEffect, useRef } from 'react';
import { Sidebar } from './Sidebar';
import { ConversationList } from './ConversationList';
import { ChatArea } from '@/components/chat/ChatArea';
import { ContactsPanel } from '@/components/contacts/ContactsPanel';
import { SettingsPanel } from '@/components/settings/SettingsPanel';
import { ExportPanel } from '@/components/settings/ExportPanel';
import { SearchPanel } from '@/components/chat/SearchPanel';
import { AddContactPanel } from '@/components/contacts/AddContactPanel';
import { LockOverlay } from './LockOverlay';
import { useRelay } from '@/hooks/useRelay';
import { useApplyTheme } from '@/hooks/useApplyTheme';
import { useStore } from '@/store';

type Panel = 'conversations' | 'contacts' | 'settings' | 'export' | 'search' | 'add-contact';

export function MainLayout() {
  const [activePanel, setActivePanel] = useState<Panel>('conversations');
  const [showLockOverlay, setShowLockOverlay] = useState(false);
  const lockTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const { settings, lockIdentity } = useStore();
  useRelay();
  useApplyTheme();

  const resetLockTimer = useCallback(() => {
    if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
    if (settings.lockTimeout > 0) {
      lockTimerRef.current = setTimeout(() => lockIdentity(), settings.lockTimeout * 1000);
    }
  }, [settings.lockTimeout, lockIdentity]);

  useEffect(() => {
    resetLockTimer();
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    for (const ev of events) window.addEventListener(ev, resetLockTimer);
    return () => {
      if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
      for (const ev of events) window.removeEventListener(ev, resetLockTimer);
    };
  }, [resetLockTimer]);

  const handleNavigate = useCallback((panel: Panel) => setActivePanel(panel), []);
  const handleLock = useCallback(() => setShowLockOverlay(true), []);

  const handleKeyboard = useCallback((e: KeyboardEvent) => {
    if (e.ctrlKey && e.key === 'l') { e.preventDefault(); setShowLockOverlay(true); }
    if (e.ctrlKey && e.key === 'k') { e.preventDefault(); setActivePanel('search'); }
    if (e.ctrlKey && e.key === '1') { e.preventDefault(); setActivePanel('conversations'); }
    if (e.ctrlKey && e.key === '2') { e.preventDefault(); setActivePanel('contacts'); }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, [handleKeyboard]);

  const emptyState = (
    <div className="flex-1 flex items-center justify-center" style={{ color: 'var(--text-muted)' }}>
      <span>Select a contact to start a conversation</span>
    </div>
  );

  return (
    <div className="w-full h-full flex" style={{ backgroundColor: 'var(--bg-main)' }}>
      <Sidebar activePanel={activePanel} onNavigate={handleNavigate} onLock={handleLock} />
      <div className="flex flex-1 overflow-hidden">
        {activePanel === 'conversations' && (<><ConversationList onNavigate={handleNavigate} /><ChatArea /></>)}
        {activePanel === 'contacts' && (<><ContactsPanel onNavigate={handleNavigate} />{emptyState}</>)}
        {activePanel === 'add-contact' && (<><AddContactPanel onNavigate={handleNavigate} />{emptyState}</>)}
        {activePanel === 'settings' && <SettingsPanel onNavigate={handleNavigate} />}
        {activePanel === 'export' && <ExportPanel onNavigate={handleNavigate} />}
        {activePanel === 'search' && <SearchPanel onNavigate={handleNavigate} />}
      </div>
      {showLockOverlay && <LockOverlay onCancel={() => setShowLockOverlay(false)} />}
    </div>
  );
}