import { Home, AlertCircle, Calendar, FileText, LogOut, X, Megaphone, Phone, User } from 'lucide-react';
import { VIEWS, NAV_ITEMS } from '../lib/constants';

const ICON_MAP = { Home, AlertCircle, Calendar, FileText, Megaphone, Phone };

export default function Sidebar({ session, currentView, onNavigate, isOpen, onClose, onLogout }) {
  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-20 md:hidden animate-fade-in"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 w-72 bg-white border-r border-slate-200/80 transform ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 transition-transform duration-300 ease-out z-30 flex flex-col shadow-xl md:shadow-none`}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <span className="text-white text-lg">🏢</span>
            </div>
            <span className="font-bold text-xl text-slate-800 tracking-tight">TrustApp</span>
          </div>
          <button
            onClick={onClose}
            className="md:hidden text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="Cerrar menú"
          >
            <X size={20} />
          </button>
        </div>

        {/* User Info */}
        <div className="px-4 py-4">
          <button
            onClick={() => onNavigate(VIEWS.PROFILE)}
            className="w-full bg-gradient-to-r from-slate-50 to-blue-50/50 rounded-xl p-3 flex items-center gap-3 border border-slate-100 hover:border-blue-200 hover:from-blue-50/50 hover:to-indigo-50/50 transition-all text-left"
          >
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-md">
              {session.user.email.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-sm font-semibold text-slate-800 truncate">Mi Unidad</p>
              <p className="text-xs text-slate-500 truncate">{session.user.email}</p>
            </div>
            <User size={16} className="text-slate-400 shrink-0" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 space-y-1" role="navigation" aria-label="Menú principal">
          {NAV_ITEMS.map((item) => {
            const Icon = ICON_MAP[item.iconName];
            const isActive = currentView === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`flex items-center w-full px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-100'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon
                  className={`mr-3 transition-colors ${isActive ? 'text-blue-600' : 'text-slate-400'}`}
                  size={20}
                />
                {item.label}
                {item.id === VIEWS.ANNOUNCEMENTS && (
                  <span className="ml-auto bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                    2
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-slate-100">
          <button
            onClick={onLogout}
            className="flex items-center w-full px-4 py-2.5 text-red-500 hover:bg-red-50 rounded-xl text-sm font-medium transition-colors"
          >
            <LogOut className="mr-3" size={18} />
            Cerrar Sesión
          </button>
        </div>
      </aside>
    </>
  );
}
