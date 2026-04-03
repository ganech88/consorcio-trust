import { useState, useEffect } from 'react';
import {
  Truck, Plus, Loader2, Trash2, X, CheckCircle, Clock,
  ChevronDown, ChevronUp, Building, Phone, Mail, CreditCard,
} from 'lucide-react';
import {
  fetchSuppliers, createSupplier, deleteSupplier,
  fetchPaymentOrders, createPaymentOrder, updatePaymentOrderStatus, deletePaymentOrder,
} from '../services/data.service';
import { useToast } from './Toast';
import ExportButtons from './ExportButtons';

const SUPPLIER_CATEGORIES = [
  'Limpieza', 'Mantenimiento', 'Electricidad', 'Gas', 'Agua',
  'Seguros', 'Administración', 'Jardinería', 'Seguridad', 'Otro',
];

const ORDER_STATUS = {
  pending:   { label: 'Pendiente', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  approved:  { label: 'Aprobada',  color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  paid:      { label: 'Pagada',    color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  cancelled: { label: 'Cancelada', color: 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400' },
};

function formatCurrency(n) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);
}

export default function SuppliersView({ session, userProfile }) {
  const toast = useToast();
  const [suppliers, setSuppliers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('proveedores');
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [expandedSupplierId, setExpandedSupplierId] = useState(null);
  const [saving, setSaving] = useState(false);

  const emptySupplier = { name: '', cuit: '', category: SUPPLIER_CATEGORIES[0], phone: '', email: '', bank_info: '', notes: '' };
  const emptyOrder = { supplier_id: '', description: '', amount: '', invoice_number: '', due_date: '' };
  const [supplierForm, setSupplierForm] = useState(emptySupplier);
  const [orderForm, setOrderForm] = useState(emptyOrder);

  useEffect(() => {
    if (!userProfile?.consortium_id) return;
    Promise.all([
      fetchSuppliers(userProfile.consortium_id),
      fetchPaymentOrders(userProfile.consortium_id),
    ])
      .then(([s, o]) => { setSuppliers(s); setOrders(o); })
      .catch(e => toast.error(e.message))
      .finally(() => setLoading(false));
  }, [userProfile?.consortium_id, toast]);

  async function handleCreateSupplier(e) {
    e.preventDefault();
    if (!supplierForm.name) { toast.error('El nombre es obligatorio'); return; }
    setSaving(true);
    try {
      const s = await createSupplier(userProfile.consortium_id, supplierForm);
      setSuppliers(prev => [...prev, s].sort((a, b) => a.name.localeCompare(b.name)));
      setSupplierForm(emptySupplier);
      setShowSupplierForm(false);
      toast.success('Proveedor creado');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteSupplier(id) {
    try {
      await deleteSupplier(id);
      setSuppliers(prev => prev.filter(s => s.id !== id));
      toast.success('Proveedor eliminado');
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function handleCreateOrder(e) {
    e.preventDefault();
    if (!orderForm.supplier_id || !orderForm.description || !orderForm.amount) {
      toast.error('Completá proveedor, descripción y monto');
      return;
    }
    setSaving(true);
    try {
      const o = await createPaymentOrder(userProfile.consortium_id, session.user.id, {
        supplier_id: orderForm.supplier_id,
        description: orderForm.description,
        amount: Number(orderForm.amount),
        invoice_number: orderForm.invoice_number || null,
        due_date: orderForm.due_date || null,
      });
      setOrders(prev => [o, ...prev]);
      setOrderForm(emptyOrder);
      setShowOrderForm(false);
      toast.success('Orden de pago creada');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleOrderStatus(orderId, status) {
    try {
      const updated = await updatePaymentOrderStatus(orderId, status, session.user.id);
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...updated } : o));
      toast.success(status === 'paid' ? 'Marcada como pagada' : 'Estado actualizado');
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function handleDeleteOrder(orderId) {
    try {
      await deletePaymentOrder(orderId);
      setOrders(prev => prev.filter(o => o.id !== orderId));
      toast.success('Orden eliminada');
    } catch (err) {
      toast.error(err.message);
    }
  }

  const pendingTotal = orders
    .filter(o => o.status === 'pending' || o.status === 'approved')
    .reduce((s, o) => s + Number(o.amount), 0);

  const paidThisMonth = orders
    .filter(o => o.status === 'paid' && o.paid_at?.startsWith(new Date().toISOString().slice(0, 7)))
    .reduce((s, o) => s + Number(o.amount), 0);

  const ordersExportCols = [
    { header: 'Proveedor', key: '_supplierName' },
    { header: 'Descripción', key: 'description' },
    { header: 'Monto', key: 'amount' },
    { header: 'N° Factura', key: 'invoice_number' },
    { header: 'Estado', key: '_statusLabel' },
    { header: 'Vencimiento', key: 'due_date' },
  ];
  const ordersExportData = orders.map(o => ({
    ...o,
    _supplierName: o.suppliers?.name || '',
    _statusLabel: ORDER_STATUS[o.status]?.label || o.status,
  }));

  if (loading) return (
    <div className="flex justify-center py-20">
      <Loader2 size={32} className="animate-spin text-blue-500" />
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 rounded-2xl text-white shadow-lg">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <Truck size={24} />
          Proveedores y Pagos
        </h3>
        <p className="text-blue-100 mt-1 text-sm">Gestión de proveedores y órdenes de pago</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 p-4">
          <p className="text-xs text-slate-400 dark:text-slate-500 mb-1">Pendiente de pago</p>
          <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{formatCurrency(pendingTotal)}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 p-4">
          <p className="text-xs text-slate-400 dark:text-slate-500 mb-1">Pagado este mes</p>
          <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(paidThisMonth)}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 p-4">
          <p className="text-xs text-slate-400 dark:text-slate-500 mb-1">Proveedores activos</p>
          <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{suppliers.length}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
        {[{ id: 'proveedores', label: 'Proveedores' }, { id: 'ordenes', label: 'Órdenes de pago' }].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === t.id
                ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Proveedores ── */}
      {activeTab === 'proveedores' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setShowSupplierForm(v => !v)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
            >
              <Plus size={16} />
              {showSupplierForm ? 'Cancelar' : 'Nuevo proveedor'}
            </button>
          </div>

          {showSupplierForm && (
            <form onSubmit={handleCreateSupplier} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5 space-y-4">
              <h4 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Building size={16} className="text-blue-500" /> Nuevo proveedor
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { label: 'Nombre *', key: 'name', placeholder: 'Ej: Plomería Sánchez', required: true },
                  { label: 'CUIT', key: 'cuit', placeholder: '20-12345678-9' },
                  { label: 'Teléfono', key: 'phone', placeholder: '+54 11 ...' },
                  { label: 'Email', key: 'email', placeholder: 'proveedor@email.com' },
                  { label: 'CBU / Alias', key: 'bank_info', placeholder: 'Alias o CBU para transferencia' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">{f.label}</label>
                    <input
                      type="text"
                      value={supplierForm[f.key]}
                      onChange={e => setSupplierForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      required={f.required}
                      className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-slate-700 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                ))}
                <div>
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">Categoría</label>
                  <select
                    value={supplierForm.category}
                    onChange={e => setSupplierForm(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-slate-700 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    {SUPPLIER_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">Notas</label>
                <textarea
                  value={supplierForm.notes}
                  onChange={e => setSupplierForm(prev => ({ ...prev, notes: e.target.value }))}
                  rows={2}
                  className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-slate-700 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setShowSupplierForm(false)} className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">Cancelar</button>
                <button type="submit" disabled={saving} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-5 py-2 rounded-xl text-sm font-semibold transition-colors">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  Guardar
                </button>
              </div>
            </form>
          )}

          {suppliers.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-12 text-center">
              <Truck size={40} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
              <p className="text-slate-500 dark:text-slate-400 text-sm">No hay proveedores registrados</p>
            </div>
          ) : (
            <div className="space-y-2">
              {suppliers.map(s => {
                const isExpanded = expandedSupplierId === s.id;
                const supplierOrders = orders.filter(o => o.supplier_id === s.id);
                return (
                  <div key={s.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
                    <div className="p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
                        <Building size={18} className="text-blue-500 dark:text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-800 dark:text-slate-100 text-sm">{s.name}</p>
                        <div className="flex items-center gap-2 flex-wrap mt-0.5">
                          <span className="text-[10px] font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-1.5 py-0.5 rounded">{s.category}</span>
                          {s.cuit && <span className="text-xs text-slate-400 dark:text-slate-500">CUIT: {s.cuit}</span>}
                          {s.phone && <span className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500"><Phone size={10} />{s.phone}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {supplierOrders.length > 0 && (
                          <span className="text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full">
                            {supplierOrders.length} órdenes
                          </span>
                        )}
                        <button
                          onClick={() => setExpandedSupplierId(isExpanded ? null : s.id)}
                          className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                        >
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                        <button
                          onClick={() => handleDeleteSupplier(s.id)}
                          className="p-1.5 text-red-400 hover:text-red-600 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="border-t border-slate-100 dark:border-slate-700 px-4 py-3 bg-slate-50 dark:bg-slate-700/30 space-y-1.5">
                        {s.email && <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2"><Mail size={12} />{s.email}</p>}
                        {s.bank_info && <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2"><CreditCard size={12} />{s.bank_info}</p>}
                        {s.notes && <p className="text-xs text-slate-400 dark:text-slate-500 italic">{s.notes}</p>}
                        {supplierOrders.length === 0 && <p className="text-xs text-slate-400 dark:text-slate-500">Sin órdenes de pago</p>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Órdenes de pago ── */}
      {activeTab === 'ordenes' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <ExportButtons
              data={ordersExportData}
              columns={ordersExportCols}
              title="Ordenes de Pago"
            />
            <button
              onClick={() => setShowOrderForm(v => !v)}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
            >
              <Plus size={16} />
              {showOrderForm ? 'Cancelar' : 'Nueva orden'}
            </button>
          </div>

          {showOrderForm && (
            <form onSubmit={handleCreateOrder} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5 space-y-4">
              <h4 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <CreditCard size={16} className="text-emerald-500" /> Nueva orden de pago
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">Proveedor *</label>
                  <select
                    value={orderForm.supplier_id}
                    onChange={e => setOrderForm(prev => ({ ...prev, supplier_id: e.target.value }))}
                    required
                    className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-slate-700 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    <option value="">Seleccionar proveedor...</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">Descripción *</label>
                  <input
                    type="text"
                    value={orderForm.description}
                    onChange={e => setOrderForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Ej: Limpieza mensual abril"
                    required
                    className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-slate-700 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">Monto *</label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    value={orderForm.amount}
                    onChange={e => setOrderForm(prev => ({ ...prev, amount: e.target.value }))}
                    required
                    className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-slate-700 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">N° Factura</label>
                  <input
                    type="text"
                    value={orderForm.invoice_number}
                    onChange={e => setOrderForm(prev => ({ ...prev, invoice_number: e.target.value }))}
                    placeholder="Ej: A-0001-00012345"
                    className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-slate-700 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">Fecha de vencimiento</label>
                  <input
                    type="date"
                    value={orderForm.due_date}
                    onChange={e => setOrderForm(prev => ({ ...prev, due_date: e.target.value }))}
                    className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-slate-700 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setShowOrderForm(false)} className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">Cancelar</button>
                <button type="submit" disabled={saving} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white px-5 py-2 rounded-xl text-sm font-semibold transition-colors">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  Crear orden
                </button>
              </div>
            </form>
          )}

          {orders.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-12 text-center">
              <CreditCard size={40} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
              <p className="text-slate-500 dark:text-slate-400 text-sm">No hay órdenes de pago registradas</p>
            </div>
          ) : (
            <div className="space-y-2">
              {orders.map(o => {
                const st = ORDER_STATUS[o.status] || ORDER_STATUS.pending;
                const isOverdue = o.due_date && o.status === 'pending' && new Date(o.due_date) < new Date();
                return (
                  <div key={o.id} className={`bg-white dark:bg-slate-800 rounded-2xl border shadow-sm p-4 flex items-start gap-3 ${isOverdue ? 'border-red-200 dark:border-red-800' : 'border-slate-100 dark:border-slate-700'}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-slate-800 dark:text-slate-100 text-sm">{o.suppliers?.name}</p>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${st.color}`}>{st.label}</span>
                        {isOverdue && <span className="text-[10px] font-bold text-red-500 dark:text-red-400">VENCIDA</span>}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{o.description}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap text-xs text-slate-400 dark:text-slate-500">
                        {o.invoice_number && <span>Fact. {o.invoice_number}</span>}
                        {o.due_date && <span>Vence: {new Date(o.due_date).toLocaleDateString('es-AR')}</span>}
                        {o.paid_at && <span>Pagada: {new Date(o.paid_at).toLocaleDateString('es-AR')}</span>}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <p className="font-bold text-slate-800 dark:text-slate-100">{formatCurrency(o.amount)}</p>
                      <div className="flex items-center gap-1">
                        {o.status === 'pending' && (
                          <button
                            onClick={() => handleOrderStatus(o.id, 'paid')}
                            title="Marcar como pagada"
                            className="p-1.5 rounded-lg text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
                          >
                            <CheckCircle size={15} />
                          </button>
                        )}
                        {o.status === 'pending' && (
                          <button
                            onClick={() => handleOrderStatus(o.id, 'cancelled')}
                            title="Cancelar"
                            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                          >
                            <X size={15} />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteOrder(o.id)}
                          className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
