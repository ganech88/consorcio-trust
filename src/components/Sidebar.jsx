import {
  Home, AlertCircle, Calendar, FileText, LogOut, X, Megaphone, Phone,
  User, ShieldCheck, Receipt, MessageSquare, Vote, CalendarDays, DoorOpen,
  TrendingUp, PackageSearch, LayoutList, Store, Crown,
} from 'lucide-react';
import { VIEWS, NAV_ITEMS, NAV_SECTIONS } from '../lib/constants';
import { useData } from '../context/DataContext';
import Logo from './Logo';

const ICON_MAP = {
  Home, AlertCircle, Calendar, FileText, Megaphone, Phone,
  Receipt, MessageSquare, Vote, CalendarDays, DoorOpen, TrendingUp,
  PackageSearch, LayoutList, Store,
};

export default function Sidebar({ session, userProfile, currentView, onNavigate, isOpen, onClose, onLogout }) {
  const isAdmin = userProfile?.role === 'admin';
  const isSuperAdmin = userProfile?.role === 'super_admin';
  const { unreadChatCount } = useData();

  // Build a map from view id to NAV_ITEM for quick lookup
  const navMap = Object.fromEntries(NAV_ITEMS.map(item => [item.id, item]));

  // Build sections: resolve keys to nav items, filter admin-only
  const sections = NAV_SECTIONS.map(section => ({
    label: section.label,
    items: section.keys
      .map(key => navMap[key])
      .filter(Boolean),
  }));

  function renderNavButton(item) {
    const Icon = ICON_MAP[item.iconName];
    if (!Icon) return null;
    const isActive = currentView === item.id;
    return (
      <button
        key={item.id}
        onClick={() => onNavigate(item.id)}
        className={`flex items-center w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 relative ${
          isActive
            ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 border-l-[3px] border-brand-500 shadow-sm'
            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-slate-100 border-l-[3px] border-transparent'
        }`}
        aria-current={isActive ? 'page' : undefined}
      >
        <Icon
          className={`mr-3 shrink-0 transition-colors ${isActive ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400 dark:text-slate-500'}`}
          size={18}
        />
        <span className="flex-1 text-left">{item.label}</span>
        {item.id === VIEWS.CHAT && unreadChatCount > 0 && (
          <span className="ml-auto bg-brand-600 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
            {unreadChatCount > 9 ? '9+' : unreadChatCount}
          </span>
        )}
      </button>
    );
  }

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-20 md:hidden animate-fade-in"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 w-72 bg-white dark:bg-slate-800 border-r border-slate-200/80 dark:border-slate-700 transform ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 transition-transform duration-300 ease-out z-30 flex flex-col shadow-xl md:shadow-none`}
      >
        {/* Header / branding */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo size={38} />
            <span className="font-bold text-xl text-slate-800 dark:text-slate-100 tracking-tight font-display">ConsorcioTrust</span>
          </div>
          <button
            onClick={onClose}
            className="md:hidden text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            aria-label="Cerrar menú"
          >
            <X size={20} />
          </button>
        </div>

        {/* Profile card */}
        <div className="px-4 py-4">
          <button
            onClick={() => onNavigate(VIEWS.PROFILE)}
            className="w-full bg-gradient-to-r from-slate-50 to-brand-50/50 dark:from-slate-700 dark:to-slate-700/50 rounded-xl p-3 flex items-center gap-3 border border-slate-100 dark:border-slate-600 hover:border-brand-200 dark:hover:border-brand-500 transition-all text-left"
          >
            <div className="w-10 h-10 bg-gradient-to-br from-brand-500 to-brand-700 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-md">
              {session.user.email.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                {userProfile?.full_name || 'Mi Unidad'}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{session.user.email}</p>
            </div>
            <User size={16} className="text-slate-400 dark:text-slate-500 shrink-0" />
          </button>

          <div className="mt-2 flex items-center gap-2">
            {(isAdmin || isSuperAdmin) && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 px-2 py-0.5 rounded-full">
                {isSuperAdmin ? <Crown size={10} /> : <ShieldCheck size={10} />}
                {isSuperAdmin ? 'Super Admin' : 'Administrador'}
              </span>
            )}
            <button
              onClick={onLogout}
              className="ml-auto flex items-center gap-1 text-[11px] font-semibold text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 px-2 py-0.5 rounded-lg transition-colors"
              title="Cerrar sesión"
            >
              <LogOut size={12} />
              Salir
            </button>
          </div>
        </div>

        {/* Grouped navigation */}
        <nav className="flex-1 px-3 overflow-y-auto space-y-4 pb-2" role="navigation" aria-label="Menú principal">
          {sections.map((section) => (
            <div key={section.label}>
              <p className="text-xs font-semibold tracking-widest uppercase text-slate-400 dark:text-slate-500 px-3 mb-1.5">
                {section.label}
              </p>
              <div className="space-y-0.5">
                {section.items.map(renderNavButton)}
              </div>
            </div>
          ))}

          {/* Admin panel — shown only for admins, at bottom of nav */}
          {(isAdmin || isSuperAdmin) && (
            <div>
              <p className="text-xs font-semibold tracking-widest uppercase text-slate-400 dark:text-slate-500 px-3 mb-1.5">
                Admin
              </p>
              {(isAdmin || isSuperAdmin) && (
                <button
                  onClick={() => onNavigate(VIEWS.ADMIN)}
                  className={`flex items-center w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 border-l-[3px] ${
                    currentView === VIEWS.ADMIN
                      ? 'bg-slate-700 dark:bg-slate-600 text-white shadow-sm border-slate-500'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-slate-100 border-transparent'
                  }`}
                >
                  <ShieldCheck
                    className={`mr-3 shrink-0 transition-colors ${currentView === VIEWS.ADMIN ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`}
                    size={18}
                  />
                  Panel Admin
                </button>
              )}
              {isSuperAdmin && (
                <button
                  onClick={() => onNavigate(VIEWS.SUPER_ADMIN)}
                  className={`flex items-center w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 border-l-[3px] mt-0.5 ${
                    currentView === VIEWS.SUPER_ADMIN
                      ? 'bg-brand-700 text-white shadow-sm border-brand-500'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-brand-50 dark:hover:bg-brand-900/20 hover:text-brand-700 dark:hover:text-brand-300 border-transparent'
                  }`}
                >
                  <Crown
                    className={`mr-3 shrink-0 transition-colors ${currentView === VIEWS.SUPER_ADMIN ? 'text-white' : 'text-brand-400 dark:text-brand-500'}`}
                    size={18}
                  />
                  Super Admin
                </button>
              )}
            </div>
          )}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-700">
          <button
            onClick={onLogout}
            className="flex items-center w-full px-4 py-2.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl text-sm font-medium transition-colors"
          >
            <LogOut className="mr-3" size={18} />
            Cerrar Sesión
          </button>
        </div>
      </aside>
    </>
  );
}
