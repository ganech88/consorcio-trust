import { useState } from 'react';
import { Lock, ArrowRight, Loader2 } from 'lucide-react';
import { updatePassword, signOut } from '../services/auth.service';
import { useToast } from './Toast';
import Logo from './Logo';

export default function ResetPasswordPage({ onDone }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  async function handleSubmit(e) {
    e.preventDefault();
    if (password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (password !== confirm) {
      toast.error('Las contraseñas no coinciden.');
      return;
    }
    setLoading(true);
    try {
      await updatePassword(password);
      toast.success('Contraseña actualizada. Iniciá sesión con la nueva.');
      await signOut();
      onDone?.();
    } catch (err) {
      toast.error(err.message, 'No se pudo actualizar la contraseña');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 p-8">
        <div className="flex justify-center mb-6"><Logo /></div>
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 text-center">Nueva contraseña</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 text-center mt-1 mb-6">
          Ingresá tu nueva contraseña para tu cuenta.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="new-password" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Nueva contraseña</label>
            <div className="relative">
              <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="new-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-slate-100 focus:ring-2 focus:ring-brand-500 outline-none"
                required
              />
            </div>
          </div>
          <div>
            <label htmlFor="confirm-password" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Repetir contraseña</label>
            <div className="relative">
              <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="confirm-password"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-slate-100 focus:ring-2 focus:ring-brand-500 outline-none"
                required
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white py-2.5 rounded-xl font-semibold transition-colors disabled:opacity-60"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <>Guardar contraseña <ArrowRight size={18} /></>}
          </button>
        </form>
      </div>
    </div>
  );
}
