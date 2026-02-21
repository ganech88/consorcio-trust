// --- Vistas de navegación ---
export const VIEWS = {
  DASHBOARD: 'dashboard',
  CLAIMS: 'reclamos',
  ANNOUNCEMENTS: 'anuncios',
  AMENITIES: 'amenities',
  DOCS: 'docs',
  CONTACTS: 'contactos',
  PROFILE: 'perfil',
};

// --- Estados de reclamos ---
export const CLAIM_STATUS = {
  OPEN: 'open',
  PENDING: 'pending',
  CLOSED: 'closed',
};

// --- Colores para gráficos ---
export const CHART_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#6366F1', '#EC4899', '#14B8A6', '#F97316'];

// --- Items de navegación ---
export const NAV_ITEMS = [
  { id: VIEWS.DASHBOARD, label: 'Dashboard', iconName: 'Home' },
  { id: VIEWS.ANNOUNCEMENTS, label: 'Novedades', iconName: 'Megaphone' },
  { id: VIEWS.CLAIMS, label: 'Reclamos', iconName: 'AlertCircle' },
  { id: VIEWS.AMENITIES, label: 'Reservas', iconName: 'Calendar' },
  { id: VIEWS.DOCS, label: 'Documentos', iconName: 'FileText' },
  { id: VIEWS.CONTACTS, label: 'Contactos', iconName: 'Phone' },
];

// --- Amenities disponibles ---
export const AMENITIES_LIST = [
  { id: 1, name: 'SUM / Parrilla', capacity: 30, description: 'Salón de usos múltiples con parrilla y cocina equipada', icon: '🍖' },
  { id: 2, name: 'Piscina', capacity: 20, description: 'Piscina climatizada con sector para niños', icon: '🏊' },
  { id: 3, name: 'Coworking', capacity: 10, description: 'Espacio de trabajo compartido con WiFi y proyector', icon: '💻' },
  { id: 4, name: 'Gimnasio', capacity: 15, description: 'Equipamiento completo con zona de cardio y pesas', icon: '🏋️' },
];

// --- Documentos de ejemplo ---
export const DOCUMENTS_LIST = [
  { id: 1, name: 'Reglamento de Copropiedad', date: '12/03/2023', type: 'pdf' },
  { id: 2, name: 'Acta Asamblea Ordinaria 2025', date: '15/11/2025', type: 'pdf' },
  { id: 3, name: 'Liquidación Expensas Enero 2026', date: '05/01/2026', type: 'pdf' },
  { id: 4, name: 'Póliza de Seguro Edilicio', date: '01/06/2025', type: 'pdf' },
];

// --- Tipos de archivo aceptados para comprobantes ---
export const ACCEPTED_FILE_TYPES = 'image/*,.pdf';
export const MAX_FILE_SIZE_MB = 10;
