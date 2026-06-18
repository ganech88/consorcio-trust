import { useState, useEffect, useCallback } from 'react';
import ComprobanteLink from '../ComprobanteLink';
import { Gavel, Plus, Loader2, CheckCircle, X, Trash2, Paperclip } from 'lucide-react';
import {
  fetchFines, createFine, updateFineStatus, deleteFine,
  fetchConsortiumMembers,
} from '../../services/data.service';
import FileUploadInline from '../FileUpload';
import { useToast } from '../Toast';
import { FINE_STATUS_LABELS, LoadingSpinner, EmptyState } from './shared';
import Pagination from './Pagination';

export default function FinesTab({ session, userProfile }) {
  const toast = useToast();
  const [fines, setFines] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [, setPage] = useState(0);
  const [pagination, setPagination] = useState(null);
  const currentPeriod = new Date().toISOString().slice(0, 7);

  const [form, setForm] = useState({
    unit_id: '',
    user_id: '',
    amount: '',
    reason: '',
    period: currentPeriod,
    notes: '',
    attachment_url: '',
  });

  const loadPage = useCallback((p) => {
    setLoading(true);
    Promise.all([
      fetchFines(userProfile?.consortium_id, { page: p }),
      fetchConsortiumMembers(userProfile?.consortium_id),
    ])
      .then(([result, m]) => {
        setFines(result.data);
        setPagination(result);
        setPage(p);
        setMembers(m);
      })
      .catch(e => toast.error(e.message))
      .finally(() => setLoading(false));
  }, [userProfile?.consortium_id, toast]);

  useEffect(() => { loadPage(0); }, [loadPage]);

  function handleMemberSelect(userId) {
    const member = members.find(m => m.id === userId);
    setForm(prev => ({ ...prev, user_id: userId, unit_id: member?.unit_id || '' }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.unit_id || !form.amount || !form.reason) {
      toast.error('Completá unidad, monto y motivo');
      return;
    }
    if (Number(form.amount) <= 0) {
      toast.error('El monto de la multa debe ser mayor a cero');
      return;
    }
    setSaving(true);
    try {
      const fine = await createFine({
        consortiumId: userProfile.consortium_id,
        unitId: form.unit_id,
        userId: form.user_id || null,
        amount: form.amount,
        reason: form.reason,
        period: form.period || null,
        notes: form.notes || null,
        appliedBy: session.user.id,
        attachmentUrl: form.attachment_url || null,
      });
      setFines(prev => [fine, ...prev]);
      setForm({ unit_id: '', user_id: '', amount: '', reason: '', period: currentPeriod, notes: '', attachment_url: '' });
      setShowForm(false);
      toast.success('Multa aplicada');
    } catch (err) {
      toast.error(err.message, 'Error al crear multa');
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(fineId, status) {
    try {
      const updated = await updateFineStatus(fineId, status);
      setFines(prev => prev.map(f => f.id === fineId ? { ...f, ...updated } : f));
      toast.success('Estado actualizado');
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function handleDelete(fineId) {
    try {
      await deleteFine(fineId);
      setFines(prev => prev.filter(f => f.id !== fineId));
      toast.success('Multa eliminada');
    } catch (err) {
      toast.error(err.message);
    }
  }

  const totalActive = fines
    .filter(f => f.status === 'active')
    .reduce((s, f) => s + Number(f.amount), 0);

  const formatCurrency = (n) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-white dark:bg-surface-panel rounded-xl border border-slate-100 dark:border-white/[0.07] p-4">
          <p className="text-xs text-slate-400 dark:text-ink-low mb-1">Total multas activas</p>
          <p className="text-xl font-bold text-red-600 dark:text-red-400">{formatCurrency(totalActive)}</p>
        </div>
        <div className="bg-white dark:bg-surface-panel rounded-xl border border-slate-100 dark:border-white/[0.07] p-4">
          <p className="text-xs text-slate-400 dark:text-ink-low mb-1">Multas activas</p>
          <p className="text-xl font-bold text-slate-800 dark:text-ink-hi">
            {fines.filter(f => f.status === 'active').length}
          </p>
        </div>
        <div className="bg-white dark:bg-surface-panel rounded-xl border border-slate-100 dark:border-white/[0.07] p-4">
          <p className="text-xs text-slate-400 dark:text-ink-low mb-1">Total registradas</p>
          <p className="text-xl font-bold text-slate-800 dark:text-ink-hi">{fines.length}</p>
        </div>
      </div>

      {/* Botón nueva multa */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
        >
          <Plus size={16} />
          {showForm ? 'Cancelar' : 'Nueva multa'}
        </button>
      </div>

      {/* Formulario nueva multa */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-surface-panel rounded-2xl border border-slate-100 dark:border-white/[0.07] p-5 space-y-4"
        >
          <h4 className="font-bold text-slate-800 dark:text-ink-hi flex items-center gap-2">
            <Gavel size={16} className="text-red-500" /> Aplicar multa
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Residente */}
            <div>
              <label className="text-xs font-semibold text-slate-500 dark:text-ink-mid mb-1.5 block">
                Residente / Unidad *
              </label>
              <select
                value={form.user_id}
                onChange={e => handleMemberSelect(e.target.value)}
                className="w-full border border-slate-200 dark:border-white/[0.09] rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-surface-panel2 dark:text-ink-hi focus:ring-2 focus:ring-red-500 outline-none"
              >
                <option value="">Seleccionar residente...</option>
                {members.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.full_name || 'Sin nombre'}{m.unit_id ? ` — Unidad ${m.unit_id}` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Unidad (se llena auto) */}
            <div>
              <label className="text-xs font-semibold text-slate-500 dark:text-ink-mid mb-1.5 block">
                Unidad *
              </label>
              <input
                type="text"
                value={form.unit_id}
                onChange={e => setForm(prev => ({ ...prev, unit_id: e.target.value }))}
                placeholder="Ej: 3B"
                className="w-full border border-slate-200 dark:border-white/[0.09] rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-surface-panel2 dark:text-ink-hi focus:ring-2 focus:ring-red-500 outline-none"
                required
              />
            </div>

            {/* Monto */}
            <div>
              <label className="text-xs font-semibold text-slate-500 dark:text-ink-mid mb-1.5 block">
                Monto ($) *
              </label>
              <input
                type="number"
                min="1"
                step="0.01"
                value={form.amount}
                onChange={e => setForm(prev => ({ ...prev, amount: e.target.value }))}
                placeholder="0.00"
                className="w-full border border-slate-200 dark:border-white/[0.09] rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-surface-panel2 dark:text-ink-hi focus:ring-2 focus:ring-red-500 outline-none"
                required
              />
            </div>

            {/* Período */}
            <div>
              <label className="text-xs font-semibold text-slate-500 dark:text-ink-mid mb-1.5 block">
                Período (se suma a expensa)
              </label>
              <input
                type="month"
                value={form.period}
                onChange={e => setForm(prev => ({ ...prev, period: e.target.value }))}
                className="w-full border border-slate-200 dark:border-white/[0.09] rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-surface-panel2 dark:text-ink-hi focus:ring-2 focus:ring-red-500 outline-none"
              />
            </div>
          </div>

          {/* Motivo */}
          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-ink-mid mb-1.5 block">
              Motivo *
            </label>
            <input
              type="text"
              value={form.reason}
              onChange={e => setForm(prev => ({ ...prev, reason: e.target.value }))}
              placeholder="Ej: Ruidos molestos en horario de silencio"
              className="w-full border border-slate-200 dark:border-white/[0.09] rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-surface-panel2 dark:text-ink-hi focus:ring-2 focus:ring-red-500 outline-none"
              required
            />
          </div>

          {/* Notas */}
          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-ink-mid mb-1.5 block">
              Notas internas (opcional)
            </label>
            <textarea
              value={form.notes}
              onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
              rows={2}
              placeholder="Detalles adicionales para el expediente..."
              className="w-full border border-slate-200 dark:border-white/[0.09] rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-surface-panel2 dark:text-ink-hi focus:ring-2 focus:ring-red-500 outline-none resize-none"
            />
          </div>

          {/* Adjunto */}
          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-ink-mid mb-1.5 block">
              Adjunto (imagen de infracción o documento)
            </label>
            <FileUploadInline
              value={form.attachment_url}
              onChange={url => setForm(prev => ({ ...prev, attachment_url: url || '' }))}
              folder="fines"
            />
          </div>

          <div className="flex gap-3 justify-end pt-1">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white px-5 py-2 rounded-xl text-sm font-semibold transition-colors"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Gavel size={14} />}
              Aplicar multa
            </button>
          </div>
        </form>
      )}

      {/* Lista de multas */}
      {fines.length === 0 ? (
        <EmptyState icon={Gavel} text="No hay multas registradas" />
      ) : (
        <div className="bg-white dark:bg-surface-panel rounded-2xl border border-slate-100 dark:border-white/[0.07] overflow-hidden">
          <div className="hidden sm:grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 px-4 py-2.5 bg-slate-50 dark:bg-surface-inset border-b border-slate-100 dark:border-white/[0.07] text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-ink-low">
            <span>Unidad</span>
            <span>Motivo</span>
            <span>Período</span>
            <span>Monto</span>
            <span>Estado</span>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-white/[0.06]">
            {fines.map(fine => {
              const stCfg = FINE_STATUS_LABELS[fine.status] || FINE_STATUS_LABELS.active;
              return (
                <div key={fine.id} className="flex flex-col sm:grid sm:grid-cols-[auto_1fr_auto_auto_auto] sm:items-center gap-2 sm:gap-4 px-4 py-3 hover:bg-slate-50 dark:hover:bg-white/[0.05] transition-colors">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-400/[0.12] flex items-center justify-center shrink-0">
                      <Gavel size={14} className="text-red-500 dark:text-red-400" />
                    </div>
                    <span className="text-sm font-bold text-slate-700 dark:text-ink-hi">
                      U. {fine.unit_id}
                    </span>
                  </div>

                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 dark:text-ink-hi truncate">{fine.reason}</p>
                    {fine.profiles?.full_name && (
                      <p className="text-xs text-slate-400 dark:text-ink-low truncate">{fine.profiles.full_name}</p>
                    )}
                    {fine.notes && (
                      <p className="text-xs text-slate-400 dark:text-ink-low truncate italic">{fine.notes}</p>
                    )}
                    {fine.attachment_url && (
                      <ComprobanteLink
                        path={fine.attachment_url}
                        className="text-[11px] text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-0.5 mt-0.5"
                      >
                        <Paperclip size={10} /> Ver adjunto
                      </ComprobanteLink>
                    )}
                  </div>

                  <span className="text-xs text-slate-400 dark:text-ink-low shrink-0">
                    {fine.period || new Date(fine.fine_date).toLocaleDateString('es-AR')}
                  </span>

                  <span className="font-bold text-slate-800 dark:text-ink-hi shrink-0">
                    {formatCurrency(fine.amount)}
                  </span>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${stCfg.color}`}>
                      {stCfg.label}
                    </span>
                    {fine.status === 'active' && (
                      <>
                        <button
                          onClick={() => handleStatusChange(fine.id, 'paid')}
                          title="Marcar pagada"
                          className="p-1 rounded-lg text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
                        >
                          <CheckCircle size={15} />
                        </button>
                        <button
                          onClick={() => handleStatusChange(fine.id, 'cancelled')}
                          title="Anular multa"
                          className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors"
                        >
                          <X size={15} />
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => handleDelete(fine.id)}
                      title="Eliminar"
                      className="p-1 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {pagination && (
        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          pageSize={pagination.pageSize}
          onPageChange={loadPage}
        />
      )}
    </div>
  );
}
