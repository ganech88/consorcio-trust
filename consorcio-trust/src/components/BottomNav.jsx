import { useState } from 'react';
import { Home, Megaphone, AlertCircle, Calendar, MessageSquare, Plus } from 'lucide-react';
import { VIEWS } from '../lib/constants';
import QuickActionSheet from './QuickActionSheet';

const ICONS = {
  [VIEWS.DASHBOARD]:     Home,
  [VIEWS.ANNOUNCEMENTS]: Megaphone,
  [VIEWS.CLAIMS]:        AlertCircle,
  [VIEWS.AMENITIES]:     Calendar,
  [VIEWS.CHAT]:          MessageSquare,
};

const LABELS = {
  [VIEWS.DASHBOARD]:     'Inicio',
  [VIEWS.ANNOUNCEMENTS]: 'Noticias',
  [VIEWS.CLAIMS]:        'Reclamos',
  [VIEWS.AMENITIES]:     'Reservas',
  [VIEWS.CHAT]:          'Mensajes',
};

const BOTTOM_ITEMS = [VIEWS.DASHBOARD, VIEWS.ANNOUNCEMENTS, VIEWS.CLAIMS, VIEWS.AMENITIES, VIEWS.CHAT];

export default function BottomNav({ currentView, onNavigate, unreadChatCount = 0, onPaymentClick }) {
  const [sheetOpen, setSheetOpen] = useState(false);

  // Split into 2 + FAB + 2 layout
  const leftItems  = BOTTOM_ITEMS.slice(0, 2);
  const rightItems = BOTTOM_ITEMS.slice(2);

  function renderItem(viewId) {
    const Icon = ICONS[viewId];
    const isActive = currentView === viewId;
    const hasUnread = viewId === VIEWS.CHAT && unreadChatCount > 0;
    return (
      <button
        key={viewId}
        onClick={() => onNavigate(viewId)}
        className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors relative ${
          isActive
            ? 'text-brand-600 dark:text-brand-400'
            : 'text-slate-400 dark:text-slate-500'
        }`}
      >
        <div className="relative">
          <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
          {hasUnread && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
              {unreadChatCount > 9 ? '9+' : unreadChatCount}
            </span>
          )}
        </div>
        <span className={`text-[10px] mt-0.5 ${isActive ? 'font-bold' : 'font-medium'}`}>
          {LABELS[viewId]}
        </span>
      </button>
    );
  }

  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 z-40 safe-area-bottom">
        <div className="flex justify-around items-center h-16 px-1">
          {leftItems.map(renderItem)}

          {/* Center FAB */}
          <button
            onClick={() => setSheetOpen(true)}
            className="relative -top-4 w-14 h-14 bg-gradient-to-br from-brand-500 to-brand-700 rounded-full flex items-center justify-center shadow-lg shadow-brand-500/40 hover:shadow-brand-500/60 active:scale-95 transition-all shrink-0"
            aria-label="Acciones rápidas"
          >
            <Plus size={26} className="text-white" strokeWidth={2.5} />
          </button>

          {rightItems.map(renderItem)}
        </div>
      </nav>

      <QuickActionSheet
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onNavigate={onNavigate}
        onPaymentClick={onPaymentClick}
      />
    </>
  );
}
