import { Home, Megaphone, AlertCircle, Calendar, FileText, Phone } from 'lucide-react';
import { VIEWS } from '../lib/constants';

const ICONS = {
  [VIEWS.DASHBOARD]: Home,
  [VIEWS.ANNOUNCEMENTS]: Megaphone,
  [VIEWS.CLAIMS]: AlertCircle,
  [VIEWS.AMENITIES]: Calendar,
  [VIEWS.DOCS]: FileText,
  [VIEWS.CONTACTS]: Phone,
};

const LABELS = {
  [VIEWS.DASHBOARD]: 'Inicio',
  [VIEWS.ANNOUNCEMENTS]: 'Noticias',
  [VIEWS.CLAIMS]: 'Reclamos',
  [VIEWS.AMENITIES]: 'Reservas',
  [VIEWS.DOCS]: 'Docs',
  [VIEWS.CONTACTS]: 'Contactos',
};

const BOTTOM_ITEMS = [VIEWS.DASHBOARD, VIEWS.ANNOUNCEMENTS, VIEWS.CLAIMS, VIEWS.AMENITIES, VIEWS.CONTACTS];

export default function BottomNav({ currentView, onNavigate }) {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 z-40 safe-area-bottom">
      <div className="flex justify-around items-center h-16 px-1">
        {BOTTOM_ITEMS.map((viewId) => {
          const Icon = ICONS[viewId];
          const isActive = currentView === viewId;
          return (
            <button
              key={viewId}
              onClick={() => onNavigate(viewId)}
              className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
                isActive
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-slate-400 dark:text-slate-500'
              }`}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              <span className={`text-[10px] mt-0.5 ${isActive ? 'font-bold' : 'font-medium'}`}>
                {LABELS[viewId]}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
