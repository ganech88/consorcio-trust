import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Menu, Bell, Sun, Moon } from 'lucide-react';
import { VIEWS } from './lib/constants';
import { ToastProvider, useToast } from './components/Toast';
import { ThemeProvider, useTheme } from './lib/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider, useData } from './context/DataContext';
import { supabase } from './lib/supabase';
import LoginPage from './components/LoginPage';
import ResetPasswordPage from './components/ResetPasswordPage';
import ConsortiumOnboarding from './components/ConsortiumOnboarding';
import Sidebar from './components/Sidebar';
import BottomNav from './components/BottomNav';
import NotificationsPanel from './components/NotificationsPanel';
import Logo from './components/Logo';
import { SkeletonCard, SkeletonChart, SkeletonList } from './components/Skeleton';
import ConsortiumSwitcher from './components/ConsortiumSwitcher';
import ErrorBoundary from './components/ErrorBoundary';

// Lazy loading de las vistas — cada una carga su bundle solo cuando se necesita
const Dashboard       = lazy(() => import('./components/Dashboard'));
const ClaimsView      = lazy(() => import('./components/ClaimsView'));
const AmenitiesView   = lazy(() => import('./components/AmenitiesView'));
const DocsView        = lazy(() => import('./components/DocsView'));
const AnnouncementsView = lazy(() => import('./components/AnnouncementsView'));
const ProfileView     = lazy(() => import('./components/ProfileView'));
const ContactsView    = lazy(() => import('./components/ContactsView'));
const AdminView       = lazy(() => import('./components/AdminView'));
const ExpensesView    = lazy(() => import('./components/ExpensesView'));
const ChatView        = lazy(() => import('./components/ChatView'));
const VotingView      = lazy(() => import('./components/VotingView'));
const CalendarView    = lazy(() => import('./components/CalendarView'));
const AccessView      = lazy(() => import('./components/AccessView'));
const FinanceView     = lazy(() => import('./components/FinanceView'));
const PackagesView    = lazy(() => import('./components/PackagesView'));
const BoardView       = lazy(() => import('./components/BoardView'));
const DocumentsView   = lazy(() => import('./components/DocumentsView'));
const SuppliersView   = lazy(() => import('./components/SuppliersView'));
const SuperAdminView  = lazy(() => import('./components/SuperAdminView'));

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
  [VIEWS.PACKAGES]:      'Paquetería',
  [VIEWS.BOARD]:         'Tablón',
  [VIEWS.DOCUMENTS]:     'Mis Documentos',
  [VIEWS.SUPPLIERS]:     'Proveedores',
  [VIEWS.SUPER_ADMIN]:   'Super Admin',
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
  const { session, setSession, authLoading, authError, logout, recoveryMode, exitRecovery } = useAuth();
  const { reclamos, setReclamos, gastos, payments, reservations, userProfile, setUserProfile, dataLoading, loadData, resetData, unreadChatCount } = useData();
  const navigate = useNavigate();
  const location = useLocation();
  const view = location.pathname;
  const adminRedirected = useRef(false);
  useEffect(() => {
    // Al loguearse, el admin/super-admin aterriza en su panel (no en el dashboard de residente).
    if (adminRedirected.current || !userProfile) return;
    adminRedirected.current = true;
    if (location.pathname !== VIEWS.DASHBOARD) return;
    if (userProfile.role === 'admin') navigate(VIEWS.ADMIN, { replace: true });
    else if (userProfile.role === 'super_admin') navigate(VIEWS.SUPER_ADMIN, { replace: true });
  }, [userProfile, location.pathname, navigate]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [realtimeBadge, setRealtimeBadge] = useState(0);
  const { dark, toggle: toggleTheme } = useTheme();
  const toast = useToast();

  useEffect(() => {
    if (session?.user?.id) {
      loadData(session.user.id);
      requestNotificationPermission();
    }
  }, [session?.user?.id, loadData]);

  // Realtime: claim updates
  useEffect(() => {
    if (!session?.user?.id) return;

    const channel = supabase
      .channel(`claims-user-${session.user.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'claims', filter: `user_id=eq.${session.user.id}` },
        (payload) => {
          const updated = payload.new;
          setReclamos(prev => prev.map(r => r.id === updated.id ? { ...r, ...updated } : r));
          if (!showNotifications) setRealtimeBadge(n => n + 1);
          const statusLabel =
            updated.status === 'closed'   ? 'fue resuelto' :
            updated.status === 'pending'  ? 'está en proceso' : 'fue actualizado';
          showPushNotification(
            'ConsorcioTrust',
            `Tu reclamo "${updated.title}" ${statusLabel}${updated.admin_note ? `: ${updated.admin_note}` : ''}`
          );
          toast.info(`Reclamo actualizado: ${updated.title}`, 'Novedad');
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [session?.user?.id, setReclamos, toast]);

  async function handleLogout() {
    await logout();
    resetData();
    navigate(VIEWS.DASHBOARD);
  }

  function handleNavigate(viewId) {
    navigate(viewId);
    setSidebarOpen(false);
  }

  function handleOpenNotifications() {
    setShowNotifications(prev => !prev);
    setRealtimeBadge(0);
  }

  const hasNotifBadge = realtimeBadge > 0 || reclamos.length > 0 || payments.length > 0;

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-brand-950 to-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-5">
          <div className="relative">
            <Logo size={56} className="animate-pulse" />
          </div>
          <p className="text-white/70 text-sm font-medium">Cargando ConsorcioTrust...</p>
        </div>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-brand-950 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur rounded-2xl p-8 max-w-sm w-full text-center">
          <p className="text-white font-bold text-lg mb-2">Error de conexión</p>
          <p className="text-white/70 text-sm mb-6">{authError}</p>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-3 rounded-xl transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (recoveryMode) {
    return <ResetPasswordPage onDone={() => { exitRecovery(); setSession(null); }} />;
  }

  if (!session) {
    return <LoginPage onLogin={(s) => setSession(s)} />;
  }

  if (!dataLoading && userProfile && !userProfile.consortium_id) {
    return (
      <ConsortiumOnboarding
        session={session}
        onComplete={() => loadData(session.user.id)}
      />
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-surface-base font-sans text-slate-900 dark:text-ink-hi transition-colors duration-300">

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
        <header className="h-16 bg-white dark:bg-surface-sidebar border-b border-slate-200/80 dark:border-white/[0.07] flex items-center justify-between px-4 sm:px-6 shrink-0 transition-colors">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden text-slate-500 dark:text-ink-mid hover:text-slate-700 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors"
              aria-label="Abrir menú"
            >
              <Menu size={22} />
            </button>
            <h2 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-ink-hi">{VIEW_TITLES[view] || 'Dashboard'}</h2>
          </div>

          <div className="flex items-center gap-2">
            {['admin','super_admin'].includes(userProfile?.role) && (
              <ConsortiumSwitcher
                userProfile={userProfile}
                onSwitch={(updated) => {
                  setUserProfile(updated);
                  loadData(session.user.id);
                }}
              />
            )}
            <button
              onClick={toggleTheme}
              className="text-slate-400 dark:text-ink-low hover:text-accent-500 dark:hover:text-accent-400 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors"
              aria-label={dark ? 'Modo claro' : 'Modo oscuro'}
            >
              {dark ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            <div className="relative">
              <button
                onClick={handleOpenNotifications}
                className="relative text-slate-400 dark:text-ink-low hover:text-brand-600 dark:hover:text-brand-400 p-2 rounded-lg hover:bg-brand-50 dark:hover:bg-white/[0.06] transition-colors"
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
                reservations={reservations}
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
                <Routes>
                  <Route path={VIEWS.DASHBOARD} element={
                    <Dashboard
                      reclamos={reclamos}
                      gastos={gastos}
                      payments={payments}
                      session={session}
                      userProfile={userProfile}
                      onPaymentClick={() => navigate(VIEWS.EXPENSES)}
                      onNavigate={handleNavigate}
                    />
                  } />
                  <Route path={VIEWS.CLAIMS} element={
                    <ClaimsView reclamos={reclamos} setReclamos={setReclamos} session={session} userProfile={userProfile} />
                  } />
                  <Route path={VIEWS.ANNOUNCEMENTS} element={<AnnouncementsView />} />
                  <Route path={VIEWS.AMENITIES} element={<AmenitiesView session={session} userProfile={userProfile} />} />
                  <Route path={VIEWS.DOCS} element={<DocsView />} />
                  <Route path={VIEWS.CONTACTS} element={<ContactsView />} />
                  <Route path={VIEWS.PROFILE} element={
                    <ProfileView session={session} userProfile={userProfile} onProfileUpdate={setUserProfile} onLogout={handleLogout} />
                  } />
                  <Route path={VIEWS.ADMIN} element={<AdminView session={session} userProfile={userProfile} />} />
                  <Route path={VIEWS.EXPENSES} element={<ExpensesView session={session} userProfile={userProfile} />} />
                  <Route path={VIEWS.CHAT} element={<ChatView session={session} userProfile={userProfile} />} />
                  <Route path={VIEWS.VOTING} element={<VotingView session={session} userProfile={userProfile} />} />
                  <Route path={VIEWS.CALENDAR} element={<CalendarView session={session} userProfile={userProfile} />} />
                  <Route path={VIEWS.ACCESS} element={<AccessView session={session} userProfile={userProfile} />} />
                  <Route path={VIEWS.FINANCE} element={<FinanceView session={session} userProfile={userProfile} />} />
                  <Route path={VIEWS.PACKAGES} element={<PackagesView session={session} userProfile={userProfile} />} />
                  <Route path={VIEWS.BOARD} element={<BoardView session={session} userProfile={userProfile} />} />
                  <Route path={VIEWS.DOCUMENTS} element={<DocumentsView session={session} userProfile={userProfile} />} />
                  <Route path={VIEWS.SUPPLIERS} element={<SuppliersView session={session} userProfile={userProfile} />} />
                  <Route path={VIEWS.SUPER_ADMIN} element={<SuperAdminView session={session} userProfile={userProfile} />} />
                  <Route path="*" element={
                    <Dashboard
                      reclamos={reclamos}
                      gastos={gastos}
                      payments={payments}
                      session={session}
                      userProfile={userProfile}
                      onPaymentClick={() => navigate(VIEWS.EXPENSES)}
                      onNavigate={handleNavigate}
                    />
                  } />
                </Routes>
              </Suspense>
            )}
          </div>
        </div>
      </main>

      <BottomNav
        currentView={view}
        onNavigate={handleNavigate}
        unreadChatCount={unreadChatCount}
        onPaymentClick={() => navigate(VIEWS.EXPENSES)}
      />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <DataProvider>
              <ErrorBoundary>
                <AppContent />
              </ErrorBoundary>
            </DataProvider>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
