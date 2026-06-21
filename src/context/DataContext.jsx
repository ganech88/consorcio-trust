import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { fetchClaims, fetchExpenseBreakdown, fetchUserProfile, fetchPayments, fetchConsortium, fetchReservations } from '../services/data.service';
import { useToast } from '../components/Toast';

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const [reclamos, setReclamos] = useState([]);
  const [gastos, setGastos] = useState([]);
  const [payments, setPayments] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [consortium, setConsortium] = useState(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const toast = useToast();

  const loadData = useCallback(async (userId) => {
    setDataLoading(true);
    try {
      // Fase 1: resolver el perfil primero para conocer el consorcio activo.
      let profile = null;
      if (userId) {
        try {
          profile = await fetchUserProfile(userId);
          if (profile) setUserProfile(profile);
        } catch (e) {
          console.error('Error cargando perfil:', e);
          toast.error('No se pudo cargar tu perfil. Intentá nuevamente.');
        }
      }

      const consortiumId = profile?.consortium_id || null;

      // Fase 2: cargar datos acotados al consorcio, en paralelo.
      const [claimsRes, expensesRes, paymentsRes, consortiumRes, reservationsRes] = await Promise.allSettled([
        fetchClaims(consortiumId),
        fetchExpenseBreakdown(consortiumId),
        userId ? fetchPayments(userId) : Promise.resolve([]),
        consortiumId ? fetchConsortium(consortiumId) : Promise.resolve(null),
        userId ? fetchReservations(userId) : Promise.resolve([]),
      ]);

      if (claimsRes.status === 'fulfilled') setReclamos(claimsRes.value || []);
      if (expensesRes.status === 'fulfilled') setGastos(expensesRes.value || []);
      if (paymentsRes.status === 'fulfilled') setPayments(paymentsRes.value || []);
      if (consortiumRes.status === 'fulfilled' && consortiumRes.value) setConsortium(consortiumRes.value);
      if (reservationsRes.status === 'fulfilled') setReservations(reservationsRes.value || []);
    } catch (error) {
      console.error('Error cargando datos:', error);
      toast.error('No se pudieron cargar los datos. Intentá nuevamente.');
    } finally {
      setDataLoading(false);
    }
  }, [toast]);

  const resetData = useCallback(() => {
    setReclamos([]);
    setGastos([]);
    setPayments([]);
    setReservations([]);
    setUserProfile(null);
    setConsortium(null);
    setUnreadChatCount(0);
  }, []);

  const value = useMemo(() => ({
    reclamos, setReclamos,
    gastos,
    payments, setPayments,
    reservations,
    userProfile, setUserProfile,
    consortium, setConsortium,
    dataLoading,
    loadData,
    resetData,
    unreadChatCount, setUnreadChatCount,
  }), [reclamos, gastos, payments, reservations, userProfile, consortium, dataLoading, unreadChatCount, loadData, resetData]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData debe usarse dentro de DataProvider');
  return ctx;
}
