import { useState } from 'react';
import { UploadCloud, CheckCircle, DollarSign, FileWarning } from 'lucide-react';
import Modal from './Modal';
import { useToast } from './Toast';
import { uploadPaymentProof, savePaymentRecord } from '../services/data.service';
import { ACCEPTED_FILE_TYPES, MAX_FILE_SIZE_MB } from '../lib/constants';

export default function PaymentModal({ session, userProfile, gastos = [], onClose }) {
  const [payFile, setPayFile] = useState(null);
  const [amount, setAmount] = useState('');
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const toast = useToast();

  function handleFileChange(file) {
    if (!file) return;

    // Validar tamaño
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      toast.error(`El archivo no puede superar los ${MAX_FILE_SIZE_MB}MB`);
      return;
    }

    // Validar tipo
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      toast.error('Solo se aceptan imágenes (JPG, PNG, WebP) o PDF');
      return;
    }

    setPayFile(file);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    handleFileChange(file);
  }

  async function handleUpload() {
    if (!payFile) {
      toast.error('Seleccioná un archivo primero');
      return;
    }

    const parsedAmount = parseFloat(amount.replace(/[^0-9.,]/g, '').replace(',', '.'));
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error('Ingresá el monto del pago');
      return;
    }

    setUploading(true);
    try {
      const { publicUrl } = await uploadPaymentProof(payFile);

      await savePaymentRecord({
        amount: parsedAmount,
        proofUrl: publicUrl,
        userId: session.user.id,
        unitId: userProfile?.unit_id,
      });

      toast.success('Pago informado correctamente. El administrador lo revisará.');
      onClose();
    } catch (error) {
      toast.error(error.message, 'Error al subir comprobante');
    } finally {
      setUploading(false);
    }
  }

  const totalExpenses = gastos.reduce((sum, g) => sum + g.value, 0);
  const expenseLabel = totalExpenses > 0 ? `$${totalExpenses.toLocaleString('es-AR')}` : '$—';

  const fileSizeFormatted = payFile
    ? payFile.size > 1024 * 1024
      ? `${(payFile.size / (1024 * 1024)).toFixed(1)} MB`
      : `${(payFile.size / 1024).toFixed(0)} KB`
    : null;

  return (
    <Modal title="Informar Nuevo Pago" onClose={onClose}>
      <div className="space-y-5">
        {/* Info de saldo */}
        <div className="bg-gradient-to-r from-blue-50 dark:from-blue-900/30 to-indigo-50 dark:to-indigo-900/30 p-4 rounded-xl border border-blue-100/50 dark:border-blue-800/50 flex gap-3">
          <div className="bg-blue-100 dark:bg-blue-900/50 p-2 rounded-lg shrink-0">
            <DollarSign className="text-blue-600 dark:text-blue-400" size={20} />
          </div>
          <div>
            <p className="text-sm font-bold text-blue-800 dark:text-blue-200">Saldo Pendiente: {expenseLabel}</p>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">Expensas del mes vigente</p>
          </div>
        </div>

        {/* Monto del pago */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            Monto pagado <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 font-semibold">$</span>
            <input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0,00"
              className="w-full pl-7 pr-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-slate-50/50 dark:bg-slate-700 dark:text-slate-100"
            />
          </div>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer relative ${
            dragOver
              ? 'border-blue-400 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/30'
              : payFile
                ? 'border-emerald-300 dark:border-emerald-600 bg-emerald-50/50 dark:bg-emerald-900/20'
                : 'border-slate-300 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-800 hover:border-slate-400 dark:hover:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700/50'
          }`}
        >
          <input
            type="file"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            onChange={(e) => handleFileChange(e.target.files[0])}
            accept={ACCEPTED_FILE_TYPES}
            aria-label="Seleccionar comprobante de pago"
          />
          {payFile ? (
            <div className="flex flex-col items-center text-emerald-600 dark:text-emerald-400">
              <CheckCircle size={36} className="mb-2" />
              <span className="font-bold text-sm truncate max-w-[250px] dark:text-emerald-300">{payFile.name}</span>
              <span className="text-xs mt-1 text-emerald-500 dark:text-emerald-400">{fileSizeFormatted} - Clic para cambiar</span>
            </div>
          ) : (
            <div className="flex flex-col items-center text-slate-400 dark:text-slate-500">
              <UploadCloud size={36} className="mb-2" />
              <span className="font-semibold text-sm text-slate-600 dark:text-slate-300">Arrastra o toca para subir</span>
              <span className="text-xs mt-1">PDF o Imagen (max {MAX_FILE_SIZE_MB}MB)</span>
            </div>
          )}
        </div>

        {/* Advertencia */}
        <div className="flex gap-2 items-start text-xs text-slate-500 dark:text-slate-400">
          <FileWarning size={14} className="shrink-0 mt-0.5" />
          <span>El comprobante será revisado por la administración. Recibirás una confirmación cuando sea aprobado.</span>
        </div>

        {/* Botón confirmar */}
        <button
          onClick={handleUpload}
          disabled={uploading || !payFile}
          className={`w-full py-3.5 rounded-xl font-bold text-white transition-all shadow-lg ${
            uploading || !payFile
              ? 'bg-slate-300 cursor-not-allowed shadow-none'
              : 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 shadow-emerald-200'
          }`}
        >
          {uploading ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Subiendo...
            </span>
          ) : (
            'Confirmar Informe'
          )}
        </button>
      </div>
    </Modal>
  );
}
