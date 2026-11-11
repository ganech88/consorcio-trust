import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { getSession, onAuthStateChange, signOut } from '../services/auth.service';
import { useToast } from '../components/Toast';
import { clearUserDataCaches } from '../lib/sw-cache';

const AUTH_TIMEOUT_MS = 8000;

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('La conexión tardó demasiado. Verificá tu red e intentá de nuevo.')), ms)
    ),
  ]);
}

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const toast = useToast();

  useEffect(() => {
    let subscribed = true;

    withTimeout(getSession(), AUTH_TIMEOUT_MS)
      .then((s) => { if (subscribed) setSession(s); })
      .catch((err) => { if (subscribed) setAuthError(err.message); })
      .finally(() => { if (subscribed) setAuthLoading(false); });

    const subscription = onAuthStateChange((event, s) => {
      if (!subscribed) return;
      setSession(s);
      if (event === 'PASSWORD_RECOVERY') setRecoveryMode(true);
    });

    return () => {
      subscribed = false;
      if (subscription && typeof subscription.unsubscribe === 'function') {
        subscription.unsubscribe();
      }
    };
  }, []);

  const logout = useCallback(async () => {
    try {
      await signOut();
      await clearUserDataCaches();
      setSession(null);
    } catch (error) {
      toast.error(error.message, 'Error al cerrar sesión');
    }
  }, [toast]);

  const exitRecovery = useCallback(() => setRecoveryMode(false), []);
  const value = useMemo(
    () => ({ session, setSession, authLoading, authError, logout, recoveryMode, exitRecovery }),
    [session, authLoading, authError, logout, recoveryMode, exitRecovery]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
