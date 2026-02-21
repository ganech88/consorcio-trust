import { useState, useEffect, useCallback } from 'react';
import { Menu, Bell } from 'lucide-react';
import { getSession, onAuthStateChange, signOut } from './services/auth.service';
import { fetchClaims, fetchExpenses } from './services/data.service';
import { VIEWS } from './lib/constants';
import { ToastProvider, useToast } from './components/Toast';
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

// --- Títulos de las vistas ---
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

  // Datos
  const [reclamos, setReclamos] = useState([]);
  const [gastos, setGastos] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);

  const toast = useToast();

  // Cargar datos
  const loadData = useCallback(async () => {
    setDataLoading(true);
    try {
      const [claims, expenses] = await Promise.all([
        fetchClaims(),
        fetchExpenses(),
      ]);
      setReclamos(claims);
      setGastos(expenses);
    } catch (error) {
      console.error('Error cargando datos:', error);
      toast.error('No se pudieron cargar los datos. Intenta nuevamente.');
    } finally {
      setDataLoading(false);
    }
  }, [toast]);

  // Auth session
  useEffect(() => {
    getSession()
      .then((session) => {
        setSession(session);
        if (session) loadData();
      })
      .catch(console.error)
      .finally(() => setAuthLoading(false));

    const subscription = onAuthStateChange((session) => {
      setSession(session);
      if (session) loadData();
    });

    return () => {
      if (subscription && typeof subscription.unsubscribe === 'function') {
        subscription.unsubscribe();
      }
    };
  }, [loadData]);

  // Logout
  async function handleLogout() {
    try {
      await signOut();
      setSession(null);
      setReclamos([]);
      setGastos([]);
      setView(VIEWS.DASHBOARD);
    } catch (error) {
      toast.error(error.message, 'Error al cerrar sesión');
    }
  }

  // Navegación
  function handleNavigate(viewId) {
    setView(viewId);
    setSidebarOpen(false);
  }

  // Auth loading screen
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

  // Login
  if (!session) {
    return <LoginPage onLogin={(s) => { setSession(s); loadData(); }} />;
  }

  // App principal
  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900">
      {/* Payment Modal */}
      {showPayModal && (
        <PaymentModal session={session} onClose={() => setShowPayModal(false)} />
      )}

      {/* Sidebar */}
      <Sidebar
        session={session}
        currentView={view}
        onNavigate={handleNavigate}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onLogout={handleLogout}
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200/80 flex items-center justify-between px-6 shrink-0 shadow-sm">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden text-slate-500 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              aria-label="Abrir menú"
            >
              <Menu size={22} />
            </button>
            <h2 className="text-xl font-bold text-slate-800">{VIEW_TITLES[view]}</h2>
          </div>

          <button
            className="relative text-slate-400 hover:text-blue-600 p-2 rounded-lg hover:bg-blue-50 transition-colors"
            aria-label="Notificaciones"
          >
            <Bell size={20} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
          </button>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="max-w-5xl mx-auto">
            {/* Loading bar */}
            {dataLoading && (
              <div className="mb-4 bg-blue-50 rounded-xl p-3 flex items-center gap-3 border border-blue-100 animate-pulse">
                <div className="w-4 h-4 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
                <span className="text-sm text-blue-700 font-medium">Actualizando datos...</span>
              </div>
            )}

            {view === VIEWS.DASHBOARD && (
              <Dashboard
                reclamos={reclamos}
                gastos={gastos}
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

            {view === VIEWS.PROFILE && <ProfileView session={session} />}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}
