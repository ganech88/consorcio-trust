import { useState } from 'react';
import { Building2, Mail, Lock, ArrowRight, UserPlus } from 'lucide-react';
import { signIn, signUp } from '../services/auth.service';
import { useToast } from './Toast';

export default function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoginView, setIsLoginView] = useState(true);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  async function handleAuth(e) {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLoginView) {
        const { session } = await signIn(email, password);
        if (session) onLogin(session);
      } else {
        await signUp(email, password);
        toast.success('Registro exitoso. Ya puedes iniciar sesión.');
        setIsLoginView(true);
      }
    } catch (error) {
      toast.error(error.message, 'Error de autenticación');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4 font-sans">
      {/* Fondo decorativo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative bg-white/95 backdrop-blur-xl p-8 md:p-10 rounded-3xl shadow-2xl w-full max-w-md animate-fade-in-up border border-white/20">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl mb-4 shadow-lg shadow-blue-500/25">
            <Building2 className="text-white" size={32} />
          </div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">ConsorcioTrust</h1>
          <p className="text-slate-500 mt-2">
            {isLoginView ? 'Inicia sesión para gestionar tu hogar' : 'Crea tu cuenta de propietario'}
          </p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
              Email
            </label>
            <div className="relative">
              <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-slate-50/50 hover:bg-white"
                placeholder="tu@email.com"
                required
                autoComplete="email"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1.5">
              Contraseña
            </label>
            <div className="relative">
              <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-slate-50/50 hover:bg-white"
                placeholder="••••••••"
                required
                minLength={6}
                autoComplete={isLoginView ? 'current-password' : 'new-password'}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                {isLoginView ? 'Ingresar' : 'Crear Cuenta'}
                {isLoginView ? <ArrowRight size={18} /> : <UserPlus size={18} />}
              </>
            )}
          </button>
        </form>

        {/* Toggle Login/Registro */}
        <div className="mt-6 text-center">
          <button
            onClick={() => setIsLoginView(!isLoginView)}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
          >
            {isLoginView ? '¿No tienes cuenta? Regístrate gratis' : '¿Ya tienes cuenta? Inicia Sesión'}
          </button>
        </div>
      </div>
    </div>
  );
}
