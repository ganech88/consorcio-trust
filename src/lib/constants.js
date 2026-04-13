// --- Vistas de navegación ---
export const VIEWS = {
  DASHBOARD: '/',
  CLAIMS: '/reclamos',
  ANNOUNCEMENTS: '/anuncios',
  AMENITIES: '/amenities',
  DOCS: '/docs',
  CONTACTS: '/contactos',
  PROFILE: '/perfil',
  ADMIN: '/admin',
  EXPENSES: '/expensas',
  CHAT: '/chat',
  VOTING: '/votaciones',
  CALENDAR: '/calendario',
  ACCESS: '/accesos',
  FINANCE: '/finanzas',
  PACKAGES: '/paqueteria',
  BOARD: '/tablon',
  DOCUMENTS: '/documents',
  SUPPLIERS: '/proveedores',
  SUPER_ADMIN: '/superadmin',
};

// --- Estados de reclamos ---
export const CLAIM_STATUS = {
  OPEN: 'open',
  PENDING: 'pending',
  CLOSED: 'closed',
};

// --- Colores para gráficos (light) ---
export const CHART_COLORS = ['#0d9488', '#f59e0b', '#6366f1', '#ec4899', '#10b981', '#f97316', '#8b5cf6'];

// --- Colores para gráficos (dark) ---
export const CHART_COLORS_DARK = ['#2dd4bf', '#fbbf24', '#818cf8', '#f472b6', '#34d399', '#fb923c', '#a78bfa'];

// --- Items de navegación ---
export const NAV_ITEMS = [
  { id: VIEWS.DASHBOARD,     label: 'Dashboard',     iconName: 'Home' },
  { id: VIEWS.EXPENSES,      label: 'Expensas',      iconName: 'Receipt' },
  { id: VIEWS.CALENDAR,      label: 'Calendario',    iconName: 'CalendarDays' },
  { id: VIEWS.PACKAGES,      label: 'Paquetería',    iconName: 'PackageSearch' },
  { id: VIEWS.ANNOUNCEMENTS, label: 'Novedades',     iconName: 'Megaphone' },
  { id: VIEWS.CLAIMS,        label: 'Reclamos',      iconName: 'AlertCircle' },
  { id: VIEWS.CHAT,          label: 'Mensajes',      iconName: 'MessageSquare' },
  { id: VIEWS.VOTING,        label: 'Votaciones',    iconName: 'Vote' },
  { id: VIEWS.BOARD,         label: 'Tablón',        iconName: 'LayoutList' },
  { id: VIEWS.AMENITIES,     label: 'Reservas',      iconName: 'Calendar' },
  { id: VIEWS.ACCESS,        label: 'Accesos',       iconName: 'DoorOpen' },
  { id: VIEWS.FINANCE,       label: 'Finanzas',      iconName: 'TrendingUp' },
  { id: VIEWS.SUPPLIERS,     label: 'Proveedores',   iconName: 'Store' },
  { id: VIEWS.DOCS,          label: 'Documentos',    iconName: 'FileText' },
  { id: VIEWS.DOCUMENTS,    label: 'Mis Documentos', iconName: 'FileText' },
  { id: VIEWS.CONTACTS,      label: 'Contactos',     iconName: 'Phone' },
];

// --- Secciones de navegación agrupadas ---
export const NAV_SECTIONS = [
  { label: 'Tu Hogar',   keys: ['/', '/expensas', '/calendario', '/paqueteria'] },
  { label: 'Comunidad',  keys: ['/anuncios', '/reclamos', '/chat', '/votaciones', '/tablon'] },
  { label: 'Espacios',   keys: ['/amenities', '/accesos'] },
  { label: 'Info',       keys: ['/finanzas', '/proveedores', '/docs', '/documents', '/contactos'] },
];

// --- Amenities disponibles ---
export const AMENITIES_LIST = [
  {
    id: 1,
    name: 'SUM / Parrilla',
    capacity: 30,
    description: 'Salón de usos múltiples con parrilla y cocina equipada',
    icon: '🍖',
    imageUrl: 'https://images.unsplash.com/photo-1555244162-803834f70033?w=600&q=80',
  },
  {
    id: 2,
    name: 'Piscina',
    capacity: 20,
    description: 'Piscina climatizada con sector para niños',
    icon: '🏊',
    imageUrl: 'https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?w=600&q=80',
  },
  {
    id: 3,
    name: 'Coworking',
    capacity: 10,
    description: 'Espacio de trabajo compartido con WiFi y proyector',
    icon: '💻',
    imageUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&q=80',
  },
  {
    id: 4,
    name: 'Gimnasio',
    capacity: 15,
    description: 'Equipamiento completo con zona de cardio y pesas',
    icon: '🏋️',
    imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&q=80',
  },
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
