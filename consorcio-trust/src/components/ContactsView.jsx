import { Phone, Mail, Clock, MapPin, ExternalLink, Shield, Wrench, Flame, Stethoscope } from 'lucide-react';

const CONTACTS = [
  {
    category: 'Administración',
    items: [
      {
        name: 'Administración General',
        role: 'Administrador',
        phone: '011 4567-8900',
        email: 'admin@consorciotrust.com',
        hours: 'Lun a Vie 9:00 - 18:00',
        icon: Shield,
        color: 'blue',
      },
      {
        name: 'Juan Pérez',
        role: 'Encargado del edificio',
        phone: '011 1234-5678',
        hours: 'Lun a Sáb 8:00 - 17:00',
        icon: Wrench,
        color: 'slate',
      },
    ],
  },
  {
    category: 'Emergencias',
    items: [
      {
        name: 'Bomberos',
        role: 'Emergencias de incendio',
        phone: '100',
        icon: Flame,
        color: 'red',
        emergency: true,
      },
      {
        name: 'SAME',
        role: 'Emergencias médicas',
        phone: '107',
        icon: Stethoscope,
        color: 'emerald',
        emergency: true,
      },
      {
        name: 'Policía',
        role: 'Emergencias de seguridad',
        phone: '911',
        icon: Shield,
        color: 'amber',
        emergency: true,
      },
    ],
  },
];

const COLOR_MAP = {
  blue: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100' },
  slate: { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-100' },
  red: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-100' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100' },
};

function ContactCard({ contact }) {
  const Icon = contact.icon;
  const colors = COLOR_MAP[contact.color] || COLOR_MAP.blue;

  return (
    <div className={`bg-white p-5 rounded-2xl border shadow-sm hover:shadow-md transition-all ${
      contact.emergency ? `${colors.border} border-2` : 'border-slate-100'
    }`}>
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-xl ${colors.bg} shrink-0`}>
          <Icon size={22} className={colors.text} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-bold text-slate-800">{contact.name}</h4>
            {contact.emergency && (
              <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                Emergencia
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{contact.role}</p>

          <div className="mt-3 space-y-1.5">
            {contact.phone && (
              <a
                href={`tel:${contact.phone.replace(/\s|-/g, '')}`}
                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors group"
              >
                <Phone size={14} />
                {contact.phone}
                <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
              </a>
            )}
            {contact.email && (
              <a
                href={`mailto:${contact.email}`}
                className="flex items-center gap-2 text-sm text-slate-600 hover:text-blue-600 transition-colors"
              >
                <Mail size={14} />
                {contact.email}
              </a>
            )}
            {contact.hours && (
              <p className="flex items-center gap-2 text-xs text-slate-400">
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
  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-700 to-slate-800 p-6 rounded-2xl text-white shadow-lg">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <Phone size={24} />
          Contactos Útiles
        </h3>
        <p className="text-slate-300 mt-1 text-sm">Teléfonos de la administración y servicios de emergencia</p>
      </div>

      {/* Address */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
        <div className="bg-indigo-50 p-3 rounded-xl shrink-0">
          <MapPin size={22} className="text-indigo-500" />
        </div>
        <div>
          <h4 className="font-bold text-slate-800">Dirección del edificio</h4>
          <p className="text-sm text-slate-500 mt-0.5">Av. Ejemplo 1234, CABA, Buenos Aires</p>
        </div>
      </div>

      {/* Contact Groups */}
      {CONTACTS.map((group) => (
        <div key={group.category}>
          <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider px-1 mb-4">
            {group.category}
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {group.items.map((contact) => (
              <ContactCard key={contact.name} contact={contact} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
