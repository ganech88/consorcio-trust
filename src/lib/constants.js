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
export const CHART_COLORS = ['#2dd4bf', '#14b8a6', '#0d9488', '#0f766e', '#3a4452'];

// --- Colores para gráficos (dark) ---
export const CHART_COLORS_DARK = ['#2dd4bf', '#14b8a6', '#0d9488', '#0f766e', '#3a4452'];

// --- Items de navegación ---
export const NAV_ITEMS = [
  { id: VIEWS.DASHBOARD,     label: 'Inicio',        iconName: 'Home' },
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
  { id: VIEWS.DOCS,          label: 'Documentos del edificio', iconName: 'FileText' },
  { id: VIEWS.DOCUMENTS,    label: 'Mis trámites',  iconName: 'FileText' },
  { id: VIEWS.CONTACTS,      label: 'Contactos',     iconName: 'Phone' },
];

// --- Secciones de navegación agrupadas ---
export const NAV_SECTIONS = [
  { label: 'Tu Hogar',   keys: ['/', '/expensas', '/calendario', '/paqueteria'] },
  { label: 'Comunidad',  keys: ['/anuncios', '/reclamos', '/chat', '/votaciones', '/tablon'] },
  { label: 'Espacios',   keys: ['/amenities', '/accesos'] },
  { label: 'Info',       keys: ['/finanzas', '/proveedores', '/docs', '/documents', '/contactos'] },
];

// --- Módulos que el administrador puede ocultar del menú de los vecinos ---
// (Inicio, Expensas, Novedades, Reclamos y Mensajes son el núcleo y no se ocultan.)
export const OPTIONAL_MODULES = [
  { id: VIEWS.AMENITIES, label: 'Reservas',                description: 'Turnos del SUM, parrilla y otros espacios comunes' },
  { id: VIEWS.CALENDAR,  label: 'Calendario',              description: 'Eventos y fechas del edificio' },
  { id: VIEWS.VOTING,    label: 'Votaciones',              description: 'Consultas y votaciones entre vecinos' },
  { id: VIEWS.BOARD,     label: 'Tablón',                  description: 'Avisos y clasificados entre vecinos' },
  { id: VIEWS.PACKAGES,  label: 'Paquetería',              description: 'Aviso de paquetes recibidos en portería' },
  { id: VIEWS.ACCESS,    label: 'Accesos',                 description: 'Visitas autorizadas' },
  { id: VIEWS.FINANCE,   label: 'Finanzas',                description: 'Egresos del consorcio a la vista de los vecinos' },
  { id: VIEWS.SUPPLIERS, label: 'Proveedores',             description: 'Proveedores del edificio' },
  { id: VIEWS.DOCS,      label: 'Documentos del edificio', description: 'Reglamento, actas y otros documentos' },
  { id: VIEWS.DOCUMENTS, label: 'Mis trámites',            description: 'Documentación que el vecino presenta a la administración' },
  { id: VIEWS.CONTACTS,  label: 'Contactos',               description: 'Teléfonos útiles y de emergencia' },
];

/** Vistas visibles en el menú según lo que ocultó la administración. */
export function isModuleHidden(viewId, hiddenModules) {
  return Array.isArray(hiddenModules) && hiddenModules.includes(viewId);
}

// --- Tipos de archivo aceptados para comprobantes ---
export const ACCEPTED_FILE_TYPES = 'image/*,.pdf';
export const MAX_FILE_SIZE_MB = 10;
