import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend 
} from 'recharts';
import { 
  Home, AlertCircle, Plus, CheckCircle, Menu, Bell, UploadCloud, 
  Calendar, FileText, LogOut, X, User, Image as ImageIcon, DollarSign
} from 'lucide-react';

// --- CONFIGURACIÓN ---
// ⚠️ IMPORTANTE: Reemplaza esto con tus claves reales de Supabase
const SUPABASE_URL = 'PEGAR_AQUI_TU_URL';
const SUPABASE_ANON_KEY = 'PEGAR_AQUI_TU_ANON_KEY';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#6366F1', '#EC4899'];

// --- COMPONENTES UI AUXILIARES ---

const Modal = ({ children, onClose, title }) => (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
      <div className="bg-slate-900 p-4 flex justify-between items-center text-white">
        <h3 className="font-bold">{title}</h3>
        <button onClick={onClose}><X size={20} /></button>
      </div>
      <div className="p-6">{children}</div>
    </div>
  </div>
);

export default function App() {
  const [session, setSession] = useState(null);
  const [view, setView] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Datos
  const [reclamos, setReclamos] = useState([]);
  const [gastos, setGastos] = useState([]);
  
  // Inputs Formularios Auth
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoginView, setIsLoginView] = useState(true); // Toggle Login/Registro
  
  const [nuevoReclamo, setNuevoReclamo] = useState('');
  
  // Estado Pagos
  const [showPayModal, setShowPayModal] = useState(false);
  const [payFile, setPayFile] = useState(null);
  const [uploadingPay, setUploadingPay] = useState(false);

  // --- EFECTO DE SESIÓN ---
  useEffect(() => {
    // 1. Verificar si hay sesión activa al cargar
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchDatos();
    });

    // 2. Escuchar cambios de sesión (Login/Logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchDatos();
    });

    return () => subscription.unsubscribe();
  }, []);

  // --- LÓGICA DE DATOS ---

  async function fetchDatos() {
    setLoading(true);
    try {
      // 1. Reclamos
      const { data: claims } = await supabase
        .from('claims')
        .select('*')
        .order('created_at', { ascending: false });
      setReclamos(claims || []);

      // 2. Gastos
      const { data: expenses } = await supabase
        .from('expense_items')
        .select('category, amount');
      
      if (expenses) {
        const formatted = expenses.map(e => ({ name: e.category, value: Number(e.amount) }));
        setGastos(formatted);
      }
    } catch (error) {
      console.error("Error cargando datos:", error);
    } finally {
      setLoading(false);
    }
  }

  // --- LÓGICA DE AUTH ---

  async function handleAuth(e) {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLoginView) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        alert("¡Registro exitoso! Ya puedes iniciar sesión.");
        setIsLoginView(true);
      }
    } catch (error) {
      alert("Error de autenticación: " + error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setReclamos([]);
    setGastos([]);
  }

  // --- LÓGICA DE PAGOS (SUBIDA DE ARCHIVOS) ---

  async function handleUploadPayment() {
    if (!payFile) return alert("Selecciona un archivo primero");
    setUploadingPay(true);

    try {
      // 1. Subir imagen al Bucket 'comprobantes'
      // IMPORTANTE: Debes haber creado el bucket 'comprobantes' en Supabase Storage
      const fileName = `${Date.now()}_${payFile.name.replace(/\s/g, '_')}`;
      
      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from('comprobantes')
        .upload(fileName, payFile);

      if (uploadError) throw uploadError;

      // 2. Obtener URL pública del archivo
      const { data: { publicUrl } } = supabase.storage
        .from('comprobantes')
        .getPublicUrl(fileName);

      // 3. Guardar registro en base de datos (Tabla payments)
      const { error: dbError } = await supabase.from('payments').insert([
        {
          amount: 0, // En un caso real, pediríamos el monto al usuario
          status: 'pending',
          proof_url: publicUrl,
          user_id: session.user.id,
          // Usamos un ID de unidad fijo por ahora, en el futuro vendría del perfil del usuario
          unit_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' 
        }
      ]);

      if (dbError) throw dbError;

      alert("Pago informado correctamente. El administrador lo revisará.");
      setShowPayModal(false);
      setPayFile(null);

    } catch (error) {
      console.error(error);
      alert("Error subiendo el pago. ¿Creaste el bucket 'comprobantes' en Supabase?: " + error.message);
    } finally {
      setUploadingPay(false);
    }
  }

  async function crearReclamo(e) {
    e.preventDefault();
    if (!nuevoReclamo) return;
    try {
      const { data, error } = await supabase.from('claims').insert([
        { 
          title: nuevoReclamo, 
          status: 'open',
          consortium_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', // ID Demo
          user_id: session?.user?.id 
        }
      ]).select();
      
      if (error) throw error;
      
      setReclamos([data[0], ...reclamos]);
      setNuevoReclamo('');
    } catch (error) {
      alert("Error al crear reclamo: " + error.message);
    }
  }

  // --- VISTA: LOGIN (Si no hay sesión) ---
  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-900 flex items-center justify-center p-4 font-sans">
        <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md animate-fade-in-up">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-slate-800 mb-2">ConsorcioTrust</h1>
            <p className="text-slate-500">{isLoginView ? 'Inicia sesión para gestionar tu hogar' : 'Crea tu cuenta de propietario'}</p>
          </div>
          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input 
                type="email" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="tu@email.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
              <input 
                type="password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="••••••••"
                required
              />
            </div>
            <button disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition shadow-lg">
              {loading ? 'Procesando...' : (isLoginView ? 'Ingresar' : 'Registrarse')}
            </button>
          </form>
          <div className="mt-6 text-center">
            <button 
              onClick={() => setIsLoginView(!isLoginView)}
              className="text-sm text-blue-600 hover:underline font-medium"
            >
              {isLoginView ? '¿No tienes cuenta? Regístrate gratis' : '¿Ya tienes cuenta? Inicia Sesión'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- VISTA: APP PRINCIPAL (Si hay sesión) ---
  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900">
      
      {/* Modal Pagos */}
      {showPayModal && (
        <Modal title="Informar Nuevo Pago" onClose={() => setShowPayModal(false)}>
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 flex gap-3">
              <DollarSign className="text-blue-600 shrink-0" />
              <div>
                <p className="text-sm font-bold text-blue-800">Saldo Pendiente: $85,400</p>
                <p className="text-xs text-blue-600">Vencimiento: 10/01/2026</p>
              </div>
            </div>
            
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:bg-slate-50 transition cursor-pointer relative bg-slate-50/50">
              <input 
                type="file" 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={(e) => setPayFile(e.target.files[0])}
                accept="image/*,.pdf"
              />
              {payFile ? (
                <div className="flex flex-col items-center text-green-600">
                  <CheckCircle size={32} className="mb-2" />
                  <span className="font-bold text-sm truncate max-w-[200px]">{payFile.name}</span>
                  <span className="text-xs mt-1">Clic para cambiar</span>
                </div>
              ) : (
                <div className="flex flex-col items-center text-slate-400">
                  <UploadCloud size={32} className="mb-2" />
                  <span className="font-bold text-sm">Toca para subir comprobante</span>
                  <span className="text-xs">PDF o Imagen</span>
                </div>
              )}
            </div>

            <button 
              onClick={handleUploadPayment}
              disabled={uploadingPay || !payFile}
              className={`w-full py-3 rounded-xl font-bold text-white transition shadow-lg ${uploadingPay || !payFile ? 'bg-slate-400 cursor-not-allowed shadow-none' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'}`}
            >
              {uploadingPay ? 'Subiendo a la nube...' : 'Confirmar Informe'}
            </button>
          </div>
        </Modal>
      )}

      {/* Sidebar Mobile Overlay */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-20 md:hidden" onClick={() => setSidebarOpen(false)}></div>}

      {/* Sidebar */}
      <aside className={`fixed md:static inset-y-0 left-0 w-64 bg-white border-r border-slate-200 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform duration-200 z-30 flex flex-col`}>
        <div className="p-6 border-b border-slate-100 font-bold text-2xl text-blue-800 flex items-center gap-2">
          <span>🏢</span> TrustApp
        </div>
        
        <div className="p-4">
          <div className="bg-slate-100 rounded-lg p-3 flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold shrink-0">
              {session.user.email.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold truncate">Mi Unidad</p>
              <p className="text-xs text-slate-500 truncate">{session.user.email}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: Home },
            { id: 'reclamos', label: 'Reclamos', icon: AlertCircle },
            { id: 'amenities', label: 'Reservas', icon: Calendar },
            { id: 'docs', label: 'Documentos', icon: FileText },
          ].map((item) => (
            <button 
              key={item.id}
              onClick={() => { setView(item.id); setSidebarOpen(false); }}
              className={`flex items-center w-full px-4 py-3 rounded-lg text-sm font-medium transition ${view === item.id ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <item.icon className={`mr-3 ${view === item.id ? 'text-blue-600' : 'text-slate-400'}`} size={20} /> 
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <button onClick={handleLogout} className="flex items-center w-full px-4 py-2 text-red-500 hover:bg-red-50 rounded-lg text-sm font-medium transition">
            <LogOut className="mr-3" size={18} /> Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="md:hidden text-slate-500"><Menu /></button>
          <h2 className="text-xl font-bold text-slate-800 capitalize">{view}</h2>
          <Bell className="text-slate-400 hover:text-blue-600 cursor-pointer" />
        </header>

        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          <div className="max-w-5xl mx-auto">
            
            {loading && view !== 'dashboard' && <div className="text-center py-4 text-blue-600">Cargando datos...</div>}

            {/* VISTA: DASHBOARD */}
            {view === 'dashboard' && (
              <div className="space-y-6 animate-fade-in">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Card Deuda */}
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden group">
                    <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition">
                      <DollarSign size={80} />
                    </div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Expensas Enero</p>
                    <h3 className="text-3xl font-bold text-slate-800 mt-1">$ 85,400</h3>
                    <p className="text-xs text-red-500 mt-1 font-medium">Vence en 3 días</p>
                    <button 
                      onClick={() => setShowPayModal(true)}
                      className="mt-4 w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-100"
                    >
                      <UploadCloud size={16} /> Informar Pago
                    </button>
                  </div>

                  {/* Card Reclamos */}
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Mis Reclamos</p>
                        <h3 className="text-3xl font-bold text-slate-800 mt-1">
                          {reclamos.filter(r => r.user_id === session.user.id).length}
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">Activos actualmente</p>
                      </div>
                      <div className="bg-orange-50 p-3 rounded-xl text-orange-500">
                        <AlertCircle />
                      </div>
                    </div>
                  </div>

                   {/* Card Amenities */}
                   <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Próx. Reserva</p>
                        <h3 className="text-xl font-bold text-slate-800 mt-1">SUM - Sáb 20hs</h3>
                        <p className="text-xs text-slate-500 mt-1">Confirmada</p>
                      </div>
                      <div className="bg-blue-50 p-3 rounded-xl text-blue-500">
                        <Calendar />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Gráfico */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-80 flex flex-col md:flex-row gap-8">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-slate-800 mb-2">Destino de tus Fondos</h3>
                    {gastos.length > 0 ? (
                      <div className="h-60">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={gastos} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                              {gastos.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                            </Pie>
                            <Tooltip formatter={(val) => `$${val.toLocaleString()}`} />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="h-full flex items-center justify-center text-slate-400">Sin datos de gastos cargados</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* VISTA: RECLAMOS */}
            {view === 'reclamos' && (
              <div className="space-y-6 animate-fade-in">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                  <h3 className="font-bold text-lg mb-4">Nuevo Reclamo</h3>
                  <form onSubmit={crearReclamo} className="flex gap-4">
                    <input 
                      type="text" 
                      value={nuevoReclamo}
                      onChange={(e) => setNuevoReclamo(e.target.value)}
                      placeholder="Ej: Luz pasillo PB quemada..." 
                      className="flex-1 p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition"
                    />
                    <button className="bg-blue-600 text-white px-6 rounded-xl font-bold hover:bg-blue-700 flex items-center gap-2 shadow-lg shadow-blue-100">
                      <Plus size={18} /> Crear
                    </button>
                  </form>
                </div>
                <div className="space-y-3">
                  {reclamos.length === 0 ? (
                    <div className="text-center text-slate-400 py-10">No hay reclamos registrados.</div>
                  ) : (
                    reclamos.map((rec) => (
                      <div key={rec.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex justify-between items-center hover:shadow-md transition">
                        <div>
                          <h4 className="font-bold text-slate-800">{rec.title}</h4>
                          <p className="text-xs text-slate-500">{new Date(rec.created_at).toLocaleDateString()}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${rec.status === 'open' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                          {rec.status === 'open' ? 'Pendiente' : 'Resuelto'}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* VISTA: AMENITIES */}
            {view === 'amenities' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                {['SUM / Parrilla', 'Piscina', 'Coworking'].map((am, i) => (
                  <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:border-blue-300 transition group cursor-pointer">
                    <div className="bg-slate-100 h-32 rounded-xl mb-4 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition">
                      <ImageIcon size={48} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800">{am}</h3>
                    <p className="text-sm text-slate-500 mt-1">Capacidad: 20 personas</p>
                    <button className="mt-4 w-full border border-blue-600 text-blue-600 font-bold py-2 rounded-lg hover:bg-blue-50 transition">Reservar Turno</button>
                  </div>
                ))}
              </div>
            )}

            {/* VISTA: DOCUMENTOS */}
            {view === 'docs' && (
               <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden animate-fade-in">
                 {[1,2,3].map(i => (
                   <div key={i} className="p-4 border-b border-slate-100 flex items-center gap-4 hover:bg-slate-50 cursor-pointer transition">
                     <div className="bg-red-50 p-3 rounded-lg text-red-500"><FileText /></div>
                     <div className="flex-1">
                       <p className="font-bold text-slate-800">Reglamento de Copropiedad_v{i}.pdf</p>
                       <p className="text-xs text-slate-500">Subido el 12/03/2023</p>
                     </div>
                   </div>
                 ))}
               </div>
            )}

          </div>
        </div>
      </main>
    </div>
  );
}