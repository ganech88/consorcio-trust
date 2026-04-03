import { useState, useEffect } from 'react';
import { Phone, Mail, Clock, MapPin, ExternalLink, Shield, Wrench, Flame, Stethoscope, Loader2 } from 'lucide-react';
import { fetchContacts } from '../services/data.service';

// Contactos de fallback si la tabla aún no tiene datos de administración
const FALLBACK_CONTACTS = [
  {
    name: 'Administración General',
    role: 'Administrador',
    category: 'administracion',
    phone: '01145678900',
    email: 'admin@consorciotrust.com',
    hours: 'Lun a Vie 9:00 - 18:00',
    color: 'blue',
    emergency: false,
  },
  {
    name: 'Encargado del edificio',
    role: 'Encargado',
    category: 'administracion',
    phone: '01112345678',
    hours: 'Lun a Sáb 8:00 - 17:00',
    color: 'slate',
    emergency: false,
  },
];

const FALLBACK_EMERGENCY = [
  { name: 'Bomberos',  role: 'Emergencias de incendio',  category: 'emergencias', phone: '100', color: 'red',     emergency: true },
  { name: 'SAME',     role: 'Emergencias médicas',       category: 'emergencias', phone: '107', color: 'emerald', emergency: true },
  { name: 'Policía',  role: 'Emergencias de seguridad',  category: 'emergencias', phone: '911', color: 'amber',   emergency: true },
];

const ICON_MAP = {
  blue:    Shield,
  slate:   Wrench,
  red:     Flame,
  emerald: Stethoscope,
  amber:   Shield,
};

const COLOR_MAP = {
  blue:    { bg: 'bg-blue-50 dark:bg-blue-900/30',    text: 'text-blue-600 dark:text-blue-400',     border: 'border-blue-100 dark:border-blue-800' },
  slate:   { bg: 'bg-slate-50 dark:bg-slate-700',     text: 'text-slate-600 dark:text-slate-400',   border: 'border-slate-100 dark:border-slate-700' },
  red:     { bg: 'bg-red-50 dark:bg-red-900/30',      text: 'text-red-600 dark:text-red-400',       border: 'border-red-100 dark:border-red-800' },
  emerald: { bg: 'bg-emerald-50 dark:bg-emerald-900/30', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-100 dark:border-emerald-800' },
  amber:   { bg: 'bg-amber-50 dark:bg-amber-900/30',  text: 'text-amber-600 dark:text-amber-400',   border: 'border-amber-100 dark:border-amber-800' },
};

// Convierte número local argentino a formato internacional para tel: links
// Ej: "011 4567-8900" → "tel:+541145678900" | "100" → "tel:100"
function toTelHref(phone) {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  // Números de emergencia cortos (hasta 3 dígitos)
  if (digits.length <= 3) return `tel:${digits}`;
  // Números argentinos que empiezan con 0 (prefijo de discado)
  if (digits.startsWith('0')) return `tel:+54${digits.slice(1)}`;
  // Ya en formato internacional o sin prefijo
  return `tel:+54${digits}`;
}

function ContactCard({ contact }) {
  const colors = COLOR_MAP[contact.color] || COLOR_MAP.blue;
  const Icon = ICON_MAP[contact.color] || Shield;

  return (
    <div className={`bg-white dark:bg-slate-800 p-5 rounded-2xl border shadow-sm hover:shadow-md transition-all ${
      contact.emergency ? `${colors.border} border-2` : 'border-slate-100 dark:border-slate-700'
    }`}>
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-xl ${colors.bg} shrink-0`}>
          <Icon size={22} className={colors.text} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-bold text-slate-800 dark:text-slate-100">{contact.name}</h4>
            {contact.emergency && (
              <span className="bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                Emergencia
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{contact.role}</p>

          <div className="mt-3 space-y-1.5">
            {contact.phone && (
              <a
                href={toTelHref(contact.phone)}
                className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors group"
              >
                <Phone size={14} />
                {contact.phone}
                <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
              </a>
            )}
            {contact.email && (
              <a
                href={`mailto:${contact.email}`}
                className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                <Mail size={14} />
                {contact.email}
              </a>
            )}
            {contact.hours && (
              <p className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
                <Clock size={14} />
                {contact.hours}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ContactsView() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchContacts()
      .then(data => {
        setContacts(data.length > 0 ? data : [...FALLBACK_CONTACTS, ...FALLBACK_EMERGENCY]);
      })
      .catch(() => {
        setContacts([...FALLBACK_CONTACTS, ...FALLBACK_EMERGENCY]);
      })
      .finally(() => setLoading(false));
  }, []);

  const adminContacts = contacts.filter(c => c.category === 'administracion');
  const emergencyContacts = contacts.filter(c => c.category === 'emergencias');

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="bg-gradient-to-r from-slate-700 to-slate-800 p-6 rounded-2xl text-white shadow-lg">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <Phone size={24} />
          Contactos Útiles
        </h3>
        <p className="text-slate-300 mt-1 text-sm">Teléfonos de la administración y servicios de emergencia</p>
      </div>

      <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-4">
        <div className="bg-indigo-50 dark:bg-indigo-900/30 p-3 rounded-xl shrink-0">
          <MapPin size={22} className="text-indigo-500 dark:text-indigo-400" />
        </div>
        <div>
          <h4 className="font-bold text-slate-800 dark:text-slate-100">Dirección del edificio</h4>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Av. Ejemplo 1234, CABA, Buenos Aires</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 size={32} className="animate-spin text-slate-400" />
        </div>
      ) : (
        <>
          {adminContacts.length > 0 && (
            <div>
              <h4 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-1 mb-4">
                Administración
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {adminContacts.map(contact => (
                  <ContactCard key={contact.id ?? contact.name} contact={contact} />
                ))}
              </div>
            </div>
          )}

          {emergencyContacts.length > 0 && (
            <div>
              <h4 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-1 mb-4">
                Emergencias
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {emergencyContacts.map(contact => (
                  <ContactCard key={contact.id ?? contact.name} contact={contact} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
