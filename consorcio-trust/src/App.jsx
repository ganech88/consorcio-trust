import React, { useState, useEffect } from 'react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend 
} from 'recharts';
import { 
  Home, AlertCircle, Plus, Menu, Bell, UploadCloud
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

// --- CONFIGURACIÓN SUPABASE ---
// Reemplaza con tus datos reales si quieres conectar de verdad
const SUPABASE_URL = 'https://kldgbgxycmvywvvftuvi.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtsZGdiZ3h5Y212eXd2dmZ0dXZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3MjkzMDYsImV4cCI6MjA4MzMwNTMwNn0.SsoM3rQDwBifZAh1vzsJC1Nu0njJWBEOAWxJxl8IRtA';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#6366F1', '#EC4899'];

export default function App() {
  const [view, setView] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  
  const [reclamos, setReclamos] = useState([]);
  const [gastos, setGastos] = useState([]);
  const [nuevoReclamoTitulo, setNuevoReclamoTitulo] = useState('');

  useEffect(() => {
    fetchDatos();
  }, []);

  async function fetchDatos() {
    try {
      setLoading(true);
      console.log("📡 Conectando a Supabase...");

      // 1. RECLAMOS
      const { data: claimsData, error: claimsError } = await supabase
        .from('claims')
        .select('*')
        .order('created_at', { ascending: false });

      if (claimsError) {
          console.warn("⚠️ No se pudieron cargar reclamos (probablemente tabla vacía o RLS):", claimsError.message);
      } else {
          setReclamos(claimsData || []);
      }

      // 2. GASTOS
      const response = await supabase.from('expense_items').select('category, amount');
      const expensesData = response.data || [];
      
      if (response.error) {
           console.warn("⚠️ No se pudieron cargar gastos:", response.error.message);
      }
      
      const gastosFormateados = expensesData.map(item => ({
        name: item.category,
        value: Number(item.amount)
      }));
      setGastos(gastosFormateados);

    } catch (error) {
      console.error('❌ ERROR GENERAL:', error.message || error);
    } finally {
      setLoading(false);
    }
  }

  async function crearReclamo(e) {
    e.preventDefault();
    if (!nuevoReclamoTitulo) return;

    try {
      const { data, error } = await supabase
        .from('claims')
        .insert([
          { 
            title: nuevoReclamoTitulo, 
            status: 'open',
            priority: 'medium',
            consortium_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', // ID fijo por ahora
            user_id: '00000000-0000-0000-0000-000000000000' // ID dummy
          }
        ])
        .select();

      if (error) throw error;

      // Actualización optimista
      const nuevoItem = data ? data[0] : { title: nuevoReclamoTitulo, status: 'open', id: 'temp' };
      setReclamos([nuevoItem, ...reclamos]);
      setNuevoReclamoTitulo('');
      alert('¡Reclamo guardado en la NUBE!');

    } catch (error) {
      console.error('Error al guardar:', error);
      alert('Error: ' + (error.message || "Ver consola"));
    }
  }

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900">
      
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 hidden md:flex flex-col">
        <div className="p-6 border-b border-slate-100 font-bold text-2xl text-blue-700 flex items-center gap-2">
          <span>🏢</span> ConsorcioTrust
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <button onClick={() => setView('dashboard')} className={`flex items-center w-full px-4 py-3 rounded-lg text-sm font-medium transition ${view === 'dashboard' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}>
            <Home className="mr-3" size={20} /> Dashboard
          </button>
          <button onClick={() => setView('reclamos')} className={`flex items-center w-full px-4 py-3 rounded-lg text-sm font-medium transition ${view === 'reclamos' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}>
            <AlertCircle className="mr-3" size={20} /> Reclamos DB
          </button>
        </nav>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <button className="md:hidden text-slate-500"><Menu /></button>
            <h2 className="text-xl font-bold text-slate-800 capitalize">{view}</h2>
          </div>
          <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold text-xs">U</div>
        </header>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-5xl mx-auto">
            
            {loading && <div className="text-center py-10 text-blue-600 font-bold animate-pulse">📡 Descargando datos de Supabase...</div>}

            {!loading && view === 'dashboard' && (
              <div className="space-y-6 animate-fade-in">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-80 flex flex-col md:flex-row gap-8">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-slate-800 mb-2">Gastos (Datos Reales)</h3>
                    {gastos.length > 0 ? (
                      <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={gastos} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={5} dataKey="value">
                              {gastos.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(val) => `$${val.toLocaleString()}`} />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="h-full flex items-center justify-center text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-300 p-4 text-center">
                        <p>No se encontraron gastos en la base de datos.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {!loading && view === 'reclamos' && (
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                  <h3 className="font-bold text-lg mb-4">Nuevo Reclamo</h3>
                  <form onSubmit={crearReclamo} className="flex gap-4">
                    <input 
                      type="text" 
                      value={nuevoReclamoTitulo}
                      onChange={(e) => setNuevoReclamoTitulo(e.target.value)}
                      placeholder="Escribe algo..." 
                      className="flex-1 p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 flex items-center gap-2">
                      <Plus size={18} /> Guardar
                    </button>
                  </form>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                  <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50 uppercase text-xs font-semibold text-slate-700">
                      <tr>
                        <th className="px-6 py-4">Título</th>
                        <th className="px-6 py-4">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {reclamos.map((rec) => (
                        <tr key={rec.id} className="hover:bg-slate-50">
                          <td className="px-6 py-4 font-medium text-slate-900">{rec.title}</td>
                          <td className="px-6 py-4">{rec.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {reclamos.length === 0 && (
                     <div className="p-8 text-center text-slate-400">
                        No hay reclamos cargados aún.
                     </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
