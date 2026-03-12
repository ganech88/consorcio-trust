import { useState, useEffect, useCallback } from 'react';
import { Menu, Bell, Sun, Moon } from 'lucide-react';
import { getSession, onAuthStateChange, signOut } from './services/auth.service';
import { fetchClaims, fetchExpenses, fetchUserProfile, fetchPayments } from './services/data.service';
import { VIEWS } from './lib/constants';
import { ToastProvider, useToast } from './components/Toast';
import { ThemeProvider, useTheme } from './lib/ThemeContext';
import LoginPage from './components/LoginPage';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import ClaimsView from './components/ClaimsView';
import AmenitiesView from './components/AmenitiesView';
import DocsView from './components/DocsView';
import AnnouncementsView from './components/AnnouncementsView';
import ProfileView from './components/ProfileView';
import ContactsView from './components/ContactsView';
import PaymentModal from './components/PaymentModal';
import BottomNav from './components/BottomNav';
import NotificationsPanel from './components/NotificationsPanel';
import { SkeletonCard, SkeletonChart, SkeletonList } from './components/Skeleton';

const VIEW_TITLES = {
  [VIEWS.DASHBOARD]: 'Dashboard',
  [VIEWS.CLAIMS]: 'Reclamos',
  [VIEWS.ANNOUNCEMENTS]: 'Novedades',
  [VIEWS.AMENITIES]: 'Reservas',
  [VIEWS.DOCS]: 'Documentos',
  [VIEWS.CONTACTS]: 'Contactos',
  [VIEWS.PROFILE]: 'Mi Perfil',
};

function AppContent() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [view, setView] = useState(VIEWS.DASHBOARD);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const [reclamos, setReclamos] = useState([]);
  const [gastos, setGastos] = useState([]);
  const [payments, setPayments] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [dataLoading, setDataLoading] = useState(false);

  const toast = useToast();
  const { dark, toggle: toggleTheme } = useTheme();

  const loadData = useCallback(async (userId) => {
    setDataLoading(true);
    try {
      const [claims, expenses, profile, userPayments] = await Promise.all([
        fetchClaims(),
        fetchExpenses(),
        userId ? fetchUserProfile(userId) : Promise.resolve(null),
        userId ? fetchPayments(userId) : Promise.resolve([]),
      ]);
      setReclamos(claims);
      setGastos(expenses);
      if (profile) setUserProfile(profile);
      setPayments(userPayments);
    } catch (error) {
      console.error('Error cargando datos:', error);
      toast.error('No se pudieron cargar los datos. Intenta nuevamente.');
    } finally {
      setDataLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    getSession()
      .then((session) => {
        setSession(session);
        if (session) loadData(session.user.id);
      })
      .catch(console.error)
      .finally(() => setAuthLoading(false));

    const subscription = onAuthStateChange((session) => {
      setSession(session);
      if (session) loadData(session.user.id);
    });

    return () => {
      if (subscription && typeof subscription.unsubscribe === 'function') {
        subscription.unsubscribe();
      }
    };
  }, [loadData]);

  async function handleLogout() {
    try {
      await signOut();
      setSession(null);
      setReclamos([]);
      setGastos([]);
      setPayments([]);
      setView(VIEWS.DASHBOARD);
    } catch (error) {
      toast.error(error.message, 'Error al cerrar sesión');
    }
  }

  function handleNavigate(viewId) {
    setView(viewId);
    setSidebarOpen(false);
  }

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

  if (!session) {
    return <LoginPage onLogin={(s) => { setSession(s); loadData(s.user.id); }} />;
  }

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-100 transition-colors duration-300">
      {showPayModal && (
        <PaymentModal session={session} userProfile={userProfile} onClose={() => setShowPayModal(false)} />
      )}

      <Sidebar
        session={session}
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
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors"
                aria-label="Notificaciones"
              >
                <Bell size={20} />
                {(reclamos.length > 0 || payments.length > 0) && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
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
              <div className="space-y-6 animate-fade-in">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  <SkeletonCard />
                  <SkeletonCard />
                  <SkeletonCard />
                </div>
                <SkeletonChart />
                <SkeletonList />
              </div>
            ) : (
              <>
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
                  />
                )}

                {view === VIEWS.ANNOUNCEMENTS && <AnnouncementsView />}
                {view === VIEWS.AMENITIES && <AmenitiesView />}
                {view === VIEWS.DOCS && <DocsView />}
                {view === VIEWS.CONTACTS && <ContactsView />}
                {view === VIEWS.PROFILE && (
                  <ProfileView session={session} userProfile={userProfile} onProfileUpdate={setUserProfile} />
                )}
              </>
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
        <AppContent />
      </ToastProvider>
    </ThemeProvider>
  );
}
