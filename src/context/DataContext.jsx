import { createContext, useContext, useState, useCallback } from 'react';
import { fetchClaims, fetchExpenseItems, fetchUserProfile, fetchPayments, fetchConsortium } from '../services/data.service';
import { useToast } from '../components/Toast';

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const [reclamos, setReclamos] = useState([]);
  const [gastos, setGastos] = useState([]);
  const [payments, setPayments] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [consortium, setConsortium] = useState(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const toast = useToast();

  const loadData = useCallback(async (userId) => {
    setDataLoading(true);
    try {
      const [claimsRes, expensesRes, profileRes, paymentsRes] = await Promise.allSettled([
        fetchClaims(),
        fetchExpenseItems(),
        userId ? fetchUserProfile(userId) : Promise.resolve(null),
        userId ? fetchPayments(userId) : Promise.resolve([]),
      ]);

      if (claimsRes.status === 'fulfilled') setReclamos(claimsRes.value || []);
      if (expensesRes.status === 'fulfilled') setGastos(expensesRes.value || []);
      if (paymentsRes.status === 'fulfilled') setPayments(paymentsRes.value || []);

      const profile = profileRes.status === 'fulfilled' ? profileRes.value : null;
      if (profile) {
        setUserProfile(profile);
        if (profile.consortium_id) {
          try {
            const c = await fetchConsortium(profile.consortium_id);
            if (c) setConsortium(c);
          } catch (e) {
            console.warn('Error cargando consorcio:', e.message);
          }
        }
      } else if (profileRes.status === 'rejected') {
        console.error('Error cargando perfil:', profileRes.reason);
        toast.error('No se pudo cargar tu perfil. Intentá nuevamente.');
      }
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
    setUserProfile(null);
    setConsortium(null);
    setUnreadChatCount(0);
  }, []);

  return (
    <DataContext.Provider value={{
      reclamos, setReclamos,
      gastos,
      payments, setPayments,
      userProfile, setUserProfile,
      consortium, setConsortium,
      dataLoading,
      loadData,
      resetData,
      unreadChatCount, setUnreadChatCount,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData debe usarse dentro de DataProvider');
  return ctx;
}
