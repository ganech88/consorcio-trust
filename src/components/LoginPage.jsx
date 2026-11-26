import { useState } from 'react';
import { Mail, Lock, ArrowRight, UserPlus, User, Eye, EyeOff } from 'lucide-react';
import { signIn, signUp, requestPasswordReset } from '../services/auth.service';
import { useToast } from './Toast';
import Logo from './Logo';

export default function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  // La landing manda a /?registro=1: quien viene a crear su consorcio cae directo en el alta.
  const [isLoginView, setIsLoginView] = useState(
    () => !new URLSearchParams(window.location.search).has('registro')
  );
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
        if (fullName.trim().length < 3) {
          toast.error('Ingresá tu nombre y apellido para que la administración y tus vecinos te reconozcan.', 'Falta tu nombre');
          return;
        }
        const { session } = await signUp(email, password, fullName);
        if (session) {
          // Sin confirmación de email: la cuenta ya queda activa.
          onLogin(session);
        } else {
          // Con confirmación de email activada: hay que verificar antes de entrar.
          toast.success('Te enviamos un correo para confirmar tu cuenta. Revisá tu casilla (y la carpeta de spam).');
          setIsLoginView(true);
        }
      }
    } catch (error) {
      toast.error(error.message, isLoginView ? 'No pudimos iniciar sesión' : 'No pudimos crear la cuenta');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-brand-950 to-slate-900 flex items-center justify-center p-4 font-sans">
      {/* Background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-brand-700/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-600/5 rounded-full blur-3xl" />
      </div>

      {/* Card — split layout on desktop */}
      <div className="relative w-full max-w-4xl animate-fade-in-up">
        <div className="bg-white/95 dark:bg-surface-panel/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 dark:border-white/[0.07] overflow-hidden flex flex-col md:flex-row">

          {/* Left panel — branding */}
          <div className="hidden md:flex flex-col justify-between bg-gradient-to-br from-brand-600 to-brand-800 p-10 w-[42%] shrink-0">
            <div className="flex items-center gap-3">
              <Logo size={44} />
              <span className="font-bold text-2xl text-white tracking-tight font-display">ConsorcioTrust</span>
            </div>

            <div>
              <h2 className="text-3xl font-bold text-white leading-snug mb-4 font-display">
                Gestión inteligente para tu comunidad
              </h2>
              <ul className="space-y-3 text-brand-100 text-sm">
                {[
                  'Pagá y seguí tus expensas fácilmente',
                  'Reclamos y novedades en tiempo real',
                  'Reservas del SUM y espacios comunes',
                  'Comunicación directa con administración',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-0.5 w-4 h-4 rounded-full bg-brand-400/40 flex items-center justify-center shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-white" />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <p className="text-brand-300 text-xs">© 2026 ConsorcioTrust. Todos los derechos reservados.</p>
            <p className="text-brand-300/80 text-xs mt-1">
              <a href="/landing.html" className="hover:underline">Conocé ConsorcioTrust</a>
              {' · '}
              <a href="/terminos.html" className="hover:underline">Términos</a>
              {' · '}
              <a href="/privacidad.html" className="hover:underline">Privacidad</a>
            </p>
          </div>

          {/* Right panel — form */}
          <div className="flex-1 p-8 md:p-10 flex flex-col justify-center">
            {/* Mobile logo */}
            <div className="flex items-center gap-3 mb-8 md:hidden">
              <Logo size={38} />
              <span className="font-bold text-xl text-slate-800 dark:text-ink-hi font-display">ConsorcioTrust</span>
            </div>

            <div className="mb-8">
              <h1 className="text-2xl font-bold text-slate-800 dark:text-ink-hi tracking-tight font-display">
                {isLoginView ? 'Bienvenido de nuevo' : 'Creá tu cuenta'}
              </h1>
              <p className="text-slate-500 dark:text-ink-mid mt-1.5 text-sm">
                {isLoginView
                  ? 'Ingresá con tu email y contraseña'
                  : 'Después vas a poder crear tu consorcio o sumarte al tuyo con el código que te pasó la administración.'}
              </p>
            </div>

            <form onSubmit={handleAuth} className="space-y-4">
              {!isLoginView && (
                <div>
                  <label htmlFor="fullName" className="block text-sm font-medium text-slate-700 dark:text-ink-mid mb-1.5">
                    Nombre y apellido
                  </label>
                  <div className="relative">
                    <User size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-ink-low" />
                    <input
                      id="fullName"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 border border-slate-200 dark:border-white/[0.09] rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all bg-slate-50/50 dark:bg-surface-panel2 dark:text-ink-hi hover:bg-white dark:hover:bg-white/[0.06]"
                      placeholder="Ej: María González"
                      required
                      maxLength={80}
                      autoComplete="name"
                    />
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-ink-mid mb-1.5">
                  Email
                </label>
                <div className="relative">
                  <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-ink-low" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 border border-slate-200 dark:border-white/[0.09] rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all bg-slate-50/50 dark:bg-surface-panel2 dark:text-ink-hi hover:bg-white dark:hover:bg-white/[0.06]"
                    placeholder="tu@email.com"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-ink-mid mb-1.5">
                  Contraseña
                </label>
                <div className="relative">
                  <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-ink-low" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-11 pr-12 py-3 border border-slate-200 dark:border-white/[0.09] rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all bg-slate-50/50 dark:bg-surface-panel2 dark:text-ink-hi hover:bg-white dark:hover:bg-white/[0.06]"
                    placeholder={isLoginView ? '••••••••' : 'Mínimo 8 caracteres'}
                    required
                    minLength={isLoginView ? 6 : 8}
                    autoComplete={isLoginView ? 'current-password' : 'new-password'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-400 dark:text-ink-low hover:text-slate-600 dark:hover:text-ink-hi rounded-lg"
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-500 hover:bg-brand-400 text-[#04201d] font-bold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    {isLoginView ? 'Ingresar' : 'Crear cuenta'}
                    {isLoginView ? <ArrowRight size={18} /> : <UserPlus size={18} />}
                  </>
                )}
              </button>
            </form>

            {isLoginView && (
              <div className="mt-3 text-center">
                <button
                  type="button"
                  onClick={async () => {
                    if (!email) { toast.error('Ingresá tu email arriba para recuperar la contraseña.'); return; }
                    try {
                      await requestPasswordReset(email);
                      toast.success('Si el email existe, te enviamos un enlace para restablecer la contraseña.');
                    } catch (err) {
                      toast.error(err.message, 'No se pudo enviar el email');
                    }
                  }}
                  className="text-xs text-slate-500 dark:text-ink-mid hover:text-brand-600 dark:hover:text-brand-300 transition-colors"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
            )}

            <div className="mt-6 text-center">
              <button
                onClick={() => setIsLoginView(!isLoginView)}
                className="text-sm text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 font-medium transition-colors"
              >
                {isLoginView ? '¿No tenés cuenta? Registrate' : '¿Ya tenés cuenta? Iniciá sesión'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
