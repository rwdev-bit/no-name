type Panel = 'conversations' | 'contacts' | 'settings' | 'export' | 'search' | 'add-contact';

interface SidebarProps {
  activePanel: Panel;
  onNavigate: (panel: Panel) => void;
  onLock: () => void;
}

const navItems: { id: Panel; icon: string; label: string }[] = [
  { id: 'conversations', icon: '💬', label: 'Conversations' },
  { id: 'add-contact', icon: '➕', label: 'Add Contact' },
  { id: 'contacts', icon: '👤', label: 'Contacts' },
  { id: 'search', icon: '🔍', label: 'Search' },
  { id: 'settings', icon: '⚙️', label: 'Settings' },
];

export function Sidebar({ activePanel, onNavigate, onLock }: SidebarProps) {
  return (
    <div className="w-16 flex flex-col items-center py-3 gap-1 border-r" style={{ backgroundColor: 'var(--bg-sidebar)', borderColor: 'var(--border)' }}>
      <div className="w-10 h-10 mb-3 rounded-2xl flex items-center justify-center cursor-default" style={{ backgroundColor: 'rgb(var(--color-primary))' }}>
        <span className="text-white font-bold text-sm">nn</span>
      </div>

      <div className="w-8 h-px mb-2" style={{ backgroundColor: 'var(--border)' }} />

      {navItems.map((item) => (
        <button
          key={item.id}
          onClick={() => onNavigate(item.id)}
          className={`sidebar-icon ${activePanel === item.id ? 'sidebar-icon-active' : ''}`}
          title={item.label}
        >
          <span className="text-lg">{item.icon}</span>
        </button>
      ))}

      <div className="mt-auto flex flex-col items-center gap-1">
        <button
          onClick={onLock}
          className="sidebar-icon"
          style={{ color: '#f87171' }}
          title="Lock"
        >
          <span className="text-lg">🔒</span>
        </button>
      </div>
    </div>
  );
}
