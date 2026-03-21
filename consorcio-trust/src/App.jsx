import { useState, useEffect, lazy, Suspense, useCallback } from 'react';
import { Menu, Bell, Sun, Moon } from 'lucide-react';
import { VIEWS } from './lib/constants';
import { ToastProvider, useToast } from './components/Toast';
import { ThemeProvider, useTheme } from './lib/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider, useData } from './context/DataContext';
import { supabase } from './lib/supabase';
import LoginPage from './components/LoginPage';
import Sidebar from './components/Sidebar';
import BottomNav from './components/BottomNav';
import NotificationsPanel from './components/NotificationsPanel';
import { SkeletonCard, SkeletonChart, SkeletonList } from './components/Skeleton';

// Lazy loading de las vistas — cada una carga su bundle solo cuando se necesita
const Dashboard = lazy(() => import('./components/Dashboard'));
const ClaimsView = lazy(() => import('./components/ClaimsView'));
const AmenitiesView = lazy(() => import('./components/AmenitiesView'));
const DocsView = lazy(() => import('./components/DocsView'));
const AnnouncementsView = lazy(() => import('./components/AnnouncementsView'));
const ProfileView = lazy(() => import('./components/ProfileView'));
const ContactsView = lazy(() => import('./components/ContactsView'));
const PaymentModal = lazy(() => import('./components/PaymentModal'));
const AdminView = lazy(() => import('./components/AdminView'));
const ExpensesView = lazy(() => import('./components/ExpensesView'));
const ChatView = lazy(() => import('./components/ChatView'));
const VotingView = lazy(() => import('./components/VotingView'));
const CalendarView = lazy(() => import('./components/CalendarView'));
const AccessView = lazy(() => import('./components/AccessView'));
const FinanceView = lazy(() => import('./components/FinanceView'));

const VIEW_TITLES = {
  [VIEWS.DASHBOARD]:     'Dashboard',
  [VIEWS.CLAIMS]:        'Reclamos',
  [VIEWS.ANNOUNCEMENTS]: 'Novedades',
  [VIEWS.AMENITIES]:     'Reservas',
  [VIEWS.DOCS]:          'Documentos',
  [VIEWS.CONTACTS]:      'Contactos',
  [VIEWS.PROFILE]:       'Mi Perfil',
  [VIEWS.ADMIN]:         'Panel Admin',
  [VIEWS.EXPENSES]:      'Expensas',
  [VIEWS.CHAT]:          'Mensajes',
  [VIEWS.VOTING]:        'Votaciones',
  [VIEWS.CALENDAR]:      'Calendario',
  [VIEWS.ACCESS]:        'Accesos',
  [VIEWS.FINANCE]:       'Finanzas',
};

function ViewSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <SkeletonCard /><SkeletonCard /><SkeletonCard />
      </div>
      <SkeletonChart />
      <SkeletonList />
    </div>
  );
}

// Pide permiso para notificaciones push del navegador
function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

function showPushNotification(title, body) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/favicon.ico' });
  }
}

function AppContent() {
  const { session, setSession, authLoading, authError, logout } = useAuth();
  const { reclamos, setReclamos, gastos, payments, userProfile, setUserProfile, dataLoading, loadData, resetData } = useData();
  const [view, setView] = useState(VIEWS.DASHBOARD);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  // Badge de notificaciones en tiempo real (se suma con cada update de realtime)
  const [realtimeBadge, setRealtimeBadge] = useState(0);
  const { dark, toggle: toggleTheme } = useTheme();
  const toast = useToast();

  useEffect(() => {
    if (session?.user?.id) {
      loadData(session.user.id);
      requestNotificationPermission();
    }
  }, [session?.user?.id, loadData]);

  // ── Realtime: escuchar cambios en reclamos del usuario actual ──────────────
  useEffect(() => {
    if (!session?.user?.id) return;

    const channel = supabase
      .channel(`claims-user-${session.user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'claims',
          filter: `user_id=eq.${session.user.id}`,
        },
        (payload) => {
          const updated = payload.new;
          // Actualizar el estado local sin reload
          setReclamos(prev =>
            prev.map(r => r.id === updated.id ? { ...r, ...updated } : r)
          );
          // Incrementar badge si el panel de notificaciones está cerrado
          if (!showNotifications) {
            setRealtimeBadge(n => n + 1);
          }
          // Notificación push del navegador
          const statusLabel =
            updated.status === 'closed' ? 'fue resuelto' :
            updated.status === 'pending' ? 'está en proceso' : 'fue actualizado';
          showPushNotification(
            'ConsorcioTrust',
            `Tu reclamo "${updated.title}" ${statusLabel}${updated.admin_note ? `: ${updated.admin_note}` : ''}`
          );
          toast.info(`Reclamo actualizado: ${updated.title}`, 'Novedad');
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.user?.id, setReclamos, toast]); // showNotifications excluído para no re-suscribir

  async function handleLogout() {
    await logout();
    resetData();
    setView(VIEWS.DASHBOARD);
  }

  function handleNavigate(viewId) {
    setView(viewId);
    setSidebarOpen(false);
  }

  function handleOpenNotifications() {
    setShowNotifications(prev => !prev);
    setRealtimeBadge(0);
  }

  const hasNotifBadge = realtimeBadge > 0 || reclamos.length > 0 || payments.length > 0;

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-3 border-white/20 border-t-white rounded-full animate-spin" />
          <p className="text-white/70 text-sm font-medium">Cargando ConsorcioTrust...</p>
        </div>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur rounded-2xl p-8 max-w-sm w-full text-center">
          <p className="text-white font-bold text-lg mb-2">Error de conexión</p>
          <p className="text-white/70 text-sm mb-6">{authError}</p>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (!session) {
    return <LoginPage onLogin={(s) => setSession(s)} />;
  }

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-100 transition-colors duration-300">
      <Suspense fallback={null}>
        {showPayModal && (
          <PaymentModal
            session={session}
            userProfile={userProfile}
            gastos={gastos}
            onClose={() => setShowPayModal(false)}
          />
        )}
      </Suspense>

      <Sidebar
        session={session}
        userProfile={userProfile}
        currentView={view}
        onNavigate={handleNavigate}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onLogout={handleLogout}
      />

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 bg-white dark:bg-slate-800 border-b border-slate-200/80 dark:border-slate-700 flex items-center justify-between px-4 sm:px-6 shrink-0 shadow-sm transition-colors">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              aria-label="Abrir menú"
            >
              <Menu size={22} />
            </button>
            <h2 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-slate-100">{VIEW_TITLES[view]}</h2>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={toggleTheme}
              className="text-slate-400 dark:text-slate-500 hover:text-amber-500 dark:hover:text-amber-400 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              aria-label={dark ? 'Modo claro' : 'Modo oscuro'}
            >
              {dark ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            <div className="relative">
              <button
                onClick={handleOpenNotifications}
                className="relative text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors"
                aria-label="Notificaciones"
              >
                <Bell size={20} />
                {hasNotifBadge && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full">
                    {realtimeBadge > 0 && (
                      <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-75" />
                    )}
                  </span>
                )}
              </button>
              <NotificationsPanel
                isOpen={showNotifications}
                onClose={() => setShowNotifications(false)}
                reclamos={reclamos}
                payments={payments}
              />
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6">
          <div className="max-w-5xl mx-auto">
            {dataLoading && view === VIEWS.DASHBOARD ? (
              <ViewSkeleton />
            ) : (
              <Suspense fallback={<ViewSkeleton />}>
                {view === VIEWS.DASHBOARD && (
                  <Dashboard
                    reclamos={reclamos}
                    gastos={gastos}
                    payments={payments}
                    session={session}
                    onPaymentClick={() => setShowPayModal(true)}
                  />
                )}
                {view === VIEWS.CLAIMS && (
                  <ClaimsView
                    reclamos={reclamos}
                    setReclamos={setReclamos}
                    session={session}
                    userProfile={userProfile}
                  />
                )}
                {view === VIEWS.ANNOUNCEMENTS && <AnnouncementsView />}
                {view === VIEWS.AMENITIES && <AmenitiesView session={session} userProfile={userProfile} />}
                {view === VIEWS.DOCS && <DocsView />}
                {view === VIEWS.CONTACTS && <ContactsView />}
                {view === VIEWS.PROFILE && (
                  <ProfileView session={session} userProfile={userProfile} onProfileUpdate={setUserProfile} />
                )}
                {view === VIEWS.ADMIN && (
                  <AdminView session={session} userProfile={userProfile} />
                )}
                {view === VIEWS.EXPENSES && (
                  <ExpensesView session={session} userProfile={userProfile} />
                )}
                {view === VIEWS.CHAT && (
                  <ChatView session={session} userProfile={userProfile} />
                )}
                {view === VIEWS.VOTING && (
                  <VotingView session={session} userProfile={userProfile} />
                )}
                {view === VIEWS.CALENDAR && (
                  <CalendarView session={session} userProfile={userProfile} />
                )}
                {view === VIEWS.ACCESS && (
                  <AccessView session={session} userProfile={userProfile} />
                )}
                {view === VIEWS.FINANCE && (
                  <FinanceView session={session} userProfile={userProfile} />
                )}
              </Suspense>
            )}
          </div>
        </div>
      </main>

      <BottomNav currentView={view} onNavigate={handleNavigate} />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <DataProvider>
            <AppContent />
          </DataProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
