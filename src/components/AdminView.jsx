import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { VIEWS } from '../lib/constants';
import {
  ShieldCheck, AlertCircle, DollarSign, Calendar, Megaphone, FileText,
  Receipt, Users, Wrench, Building2, Gavel, ClipboardList, HelpCircle, Home, Wallet, BarChart3,
  ArrowLeft,
} from 'lucide-react';

import UsersTab from './admin/UsersTab';
import ClaimsTab from './admin/ClaimsTab';
import ExpensesTab from './admin/ExpensesTab';
import LiquidacionTab from './admin/LiquidacionTab';
import FinesTab from './admin/FinesTab';
import ReservationsTab from './admin/ReservationsTab';
import AnnouncementsTab from './admin/AnnouncementsTab';
import DocumentsTab from './admin/DocumentsTab';
import MaintenanceTab from './admin/MaintenanceTab';
import InsuranceTab from './admin/InsuranceTab';
import BudgetsTab from './admin/BudgetsTab';
import CollectionsTab from './admin/CollectionsTab';
import UnitsTab from './admin/UnitsTab';
import LedgerTab from './admin/LedgerTab';
import RendicionTab from './admin/RendicionTab';
import ConsorcioTab from './admin/ConsorcioTab';
import AdminHome from './admin/AdminHome';
import { fetchAdminPendingCounts } from '../services/data.service';

const SECTIONS = {
  usuarios:      { label: 'Usuarios',      icon: Users },
  unidades:      { label: 'Unidades',      icon: Home },
  claims:        { label: 'Reclamos',      icon: AlertCircle },
  expenses:      { label: 'Expensas',      icon: DollarSign },
  liquidacion:   { label: 'Liquidación',   icon: Receipt },
  ctacte:        { label: 'Cta. Cte.',     icon: Wallet },
  rendicion:     { label: 'Rendición',     icon: BarChart3 },
  multas:        { label: 'Multas',        icon: Gavel },
  reservations:  { label: 'Reservas',      icon: Calendar },
  announcements: { label: 'Comunicados',   icon: Megaphone },
  documents:     { label: 'Documentos',    icon: FileText },
  maintenance:   { label: 'Mantenimiento', icon: Wrench },
  seguros:       { label: 'Seguros',       icon: ShieldCheck },
  presupuestos:  { label: 'Presupuestos',  icon: ClipboardList },
  cobranzas:     { label: 'Cobranzas',     icon: HelpCircle },
  consorcio:     { label: 'Consorcio',     icon: Building2 },
};

const GROUPS = [
  { title: 'Cobranzas y expensas', ids: ['expenses', 'liquidacion', 'ctacte', 'cobranzas', 'rendicion'] },
  { title: 'Comunidad',            ids: ['claims', 'reservations', 'announcements', 'documents'] },
  { title: 'Administración',       ids: ['usuarios', 'unidades', 'multas', 'maintenance', 'seguros', 'presupuestos', 'consorcio'] },
];

function badgeFor(id, counts) {
  if (id === 'reservations') return counts.reservas;
  if (id === 'expenses') return counts.pagos;
  if (id === 'claims') return counts.reclamos;
  return 0;
}

function renderSection(id, session, userProfile) {
  switch (id) {
    case 'usuarios':      return <UsersTab userProfile={userProfile} />;
    case 'unidades':      return <UnitsTab userProfile={userProfile} />;
    case 'claims':        return <ClaimsTab session={session} userProfile={userProfile} />;
    case 'expenses':      return <ExpensesTab session={session} userProfile={userProfile} />;
    case 'liquidacion':   return <LiquidacionTab session={session} userProfile={userProfile} />;
    case 'ctacte':        return <LedgerTab userProfile={userProfile} />;
    case 'rendicion':     return <RendicionTab userProfile={userProfile} />;
    case 'multas':        return <FinesTab session={session} userProfile={userProfile} />;
    case 'reservations':  return <ReservationsTab />;
    case 'announcements': return <AnnouncementsTab session={session} userProfile={userProfile} />;
    case 'documents':     return <DocumentsTab session={session} userProfile={userProfile} />;
    case 'maintenance':   return <MaintenanceTab session={session} userProfile={userProfile} />;
    case 'seguros':       return <InsuranceTab session={session} userProfile={userProfile} />;
    case 'presupuestos':  return <BudgetsTab session={session} userProfile={userProfile} />;
    case 'cobranzas':     return <CollectionsTab session={session} userProfile={userProfile} />;
    case 'consorcio':     return <ConsorcioTab session={session} userProfile={userProfile} />;
    default:              return null;
  }
}

export default function AdminView({ session, userProfile }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('inicio');
  const [counts, setCounts] = useState({ reservas: 0, pagos: 0, reclamos: 0 });

  const isAdmin = !!userProfile && ['admin', 'super_admin'].includes(userProfile.role);

  useEffect(() => {
    if (userProfile && !isAdmin) navigate(VIEWS.DASHBOARD, { replace: true });
  }, [userProfile, isAdmin, navigate]);

  useEffect(() => {
    if (!isAdmin || !userProfile?.consortium_id) return;
    fetchAdminPendingCounts(userProfile.consortium_id).then(setCounts).catch(() => {});
  }, [isAdmin, userProfile?.consortium_id, activeTab]);

  if (!isAdmin) return null;

  const section = SECTIONS[activeTab];

  // Vista de una sección (con botón Volver)
  if (activeTab !== 'inicio' && section) {
    const Icon = section.icon;
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab('inicio')}
            className="flex items-center gap-1.5 text-sm font-semibold text-slate-500 dark:text-ink-mid hover:text-slate-800 dark:hover:text-ink-hi bg-white dark:bg-surface-panel border border-slate-200 dark:border-white/[0.07] rounded-xl px-3 py-2 transition-colors shrink-0"
          >
            <ArrowLeft size={16} /> Panel
          </button>
          <h3 className="font-bold text-slate-800 dark:text-ink-hi text-lg flex items-center gap-2 min-w-0">
            <Icon size={20} className="text-brand-500 shrink-0" />
            <span className="truncate">{section.label}</span>
          </h3>
        </div>
        {renderSection(activeTab, session, userProfile)}
      </div>
    );
  }

  // Home / menú de botones
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-gradient-to-r from-slate-700 to-slate-800 p-6 rounded-2xl text-white shadow-lg">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <ShieldCheck size={24} />
          Panel de Administrador
        </h3>
        <p className="text-slate-300 mt-1 text-sm">Todo lo que administrás, en un solo lugar.</p>
      </div>

      <AdminHome counts={counts} onGo={setActiveTab} userProfile={userProfile} />

      {GROUPS.map(g => (
        <div key={g.title}>
          <h4 className="text-xs font-bold text-slate-400 dark:text-ink-low uppercase tracking-wider mb-3 px-1">{g.title}</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {g.ids.map(id => {
              const sec = SECTIONS[id];
              const Icon = sec.icon;
              const badge = badgeFor(id, counts);
              return (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className="relative bg-white dark:bg-surface-panel border border-slate-100 dark:border-white/[0.07] rounded-2xl p-4 flex flex-col items-center gap-2 hover:border-brand-300 dark:hover:border-brand-600 hover:shadow-sm transition-all"
                >
                  {badge > 0 && (
                    <span className="absolute top-2 right-2 min-w-[18px] h-[18px] px-1 inline-flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold">{badge}</span>
                  )}
                  <div className="w-11 h-11 rounded-xl bg-brand-50 dark:bg-brand-400/[0.14] flex items-center justify-center">
                    <Icon size={20} className="text-brand-600 dark:text-brand-400" />
                  </div>
                  <span className="text-xs font-semibold text-slate-700 dark:text-ink-mid text-center leading-tight">{sec.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
