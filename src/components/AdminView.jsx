import { useState } from 'react';
import {
  ShieldCheck, AlertCircle, DollarSign, Calendar, Megaphone, FileText,
  Receipt, Users, Wrench, Building2, Gavel, ClipboardList, HelpCircle, Home, Wallet, BarChart3,
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

const TABS = [
  { id: 'usuarios',      label: 'Usuarios',       icon: Users },
  { id: 'unidades',      label: 'Unidades',       icon: Home },
  { id: 'claims',        label: 'Reclamos',       icon: AlertCircle },
  { id: 'expenses',      label: 'Expensas',       icon: DollarSign },
  { id: 'liquidacion',   label: 'Liquidación',    icon: Receipt },
  { id: 'ctacte',        label: 'Cta. Cte.',      icon: Wallet },
  { id: 'rendicion',     label: 'Rendición',      icon: BarChart3 },
  { id: 'multas',        label: 'Multas',         icon: Gavel },
  { id: 'reservations',  label: 'Reservas',       icon: Calendar },
  { id: 'announcements', label: 'Comunicados',    icon: Megaphone },
  { id: 'documents',     label: 'Documentos',     icon: FileText },
  { id: 'maintenance',   label: 'Mantenimiento',  icon: Wrench },
  { id: 'seguros',       label: 'Seguros',        icon: ShieldCheck },
  { id: 'presupuestos',  label: 'Presupuestos',   icon: ClipboardList },
  { id: 'cobranzas',     label: 'Cobranzas',      icon: HelpCircle },
  { id: 'consorcio',     label: 'Consorcio',      icon: Building2 },
];

export default function AdminView({ session, userProfile }) {
  const [activeTab, setActiveTab] = useState('usuarios');

  if (!userProfile || !['admin', 'super_admin'].includes(userProfile.role)) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4 animate-fade-in">
        <div className="bg-red-50 dark:bg-red-400/[0.12] p-5 rounded-2xl">
          <ShieldCheck size={48} className="text-red-400" />
        </div>
        <h3 className="font-bold text-slate-800 dark:text-ink-hi text-lg">Acceso restringido</h3>
        <p className="text-slate-500 dark:text-ink-mid text-sm text-center max-w-xs">
          Esta sección es exclusiva para administradores del consorcio. Tu cuenta no tiene permisos de administrador.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-700 to-slate-800 p-6 rounded-2xl text-white shadow-lg">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <ShieldCheck size={24} />
          Panel de Administrador
        </h3>
        <p className="text-slate-300 mt-1 text-sm">
          Gestioná reclamos, expensas, liquidaciones, reservas, comunicados y documentos
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 dark:bg-surface-panel p-1 rounded-2xl overflow-x-auto">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-white dark:bg-surface-panel2 text-slate-800 dark:text-ink-hi'
                  : 'text-slate-500 dark:text-ink-mid hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Contenido */}
      {activeTab === 'usuarios'      && <UsersTab userProfile={userProfile} />}
      {activeTab === 'unidades'      && <UnitsTab userProfile={userProfile} />}
      {activeTab === 'claims'        && <ClaimsTab session={session} userProfile={userProfile} />}
      {activeTab === 'expenses'      && <ExpensesTab session={session} userProfile={userProfile} />}
      {activeTab === 'liquidacion'   && <LiquidacionTab session={session} userProfile={userProfile} />}
      {activeTab === 'ctacte'        && <LedgerTab userProfile={userProfile} />}
      {activeTab === 'rendicion'     && <RendicionTab userProfile={userProfile} />}
      {activeTab === 'multas'        && <FinesTab session={session} userProfile={userProfile} />}
      {activeTab === 'reservations'  && <ReservationsTab />}
      {activeTab === 'announcements' && <AnnouncementsTab session={session} userProfile={userProfile} />}
      {activeTab === 'documents'     && <DocumentsTab session={session} userProfile={userProfile} />}
      {activeTab === 'maintenance'   && <MaintenanceTab session={session} userProfile={userProfile} />}
      {activeTab === 'seguros'       && <InsuranceTab session={session} userProfile={userProfile} />}
      {activeTab === 'presupuestos'  && <BudgetsTab session={session} userProfile={userProfile} />}
      {activeTab === 'cobranzas'     && <CollectionsTab session={session} userProfile={userProfile} />}
      {activeTab === 'consorcio'     && <ConsorcioTab session={session} userProfile={userProfile} />}
    </div>
  );
}
