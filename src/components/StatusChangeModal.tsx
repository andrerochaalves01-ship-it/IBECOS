import React, { useEffect, useState } from 'react';
import { X, CheckCircle, AlertTriangle, Truck } from 'lucide-react';
import { Driver, RequestStatus, ServiceRequest } from '../types';
import { dataService } from '../services/dataService';
import { STATUS_LABELS } from '../lib/formatters';
import { useAuth } from '../context/AuthContext';

interface StatusChangeModalProps {
  request: ServiceRequest | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const StatusChangeModal: React.FC<StatusChangeModalProps> = ({
  request,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();
  const [selectedStatus, setSelectedStatus] = useState<RequestStatus>('NOVA');
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [confirmFinalize, setConfirmFinalize] = useState<boolean>(false);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (request && isOpen) {
      setSelectedStatus(request.status);
      setSelectedDriverId(request.driver_id || '');
      setReason('');
      setConfirmFinalize(false);
      setErrorMessage(null);

      dataService
        .getDrivers()
        .then((list) => setDrivers(list.filter((d) => d.is_active)))
        .catch(() => {});
    }
  }, [request, isOpen]);

  if (!isOpen || !request) return null;

  const validStatuses: RequestStatus[] = [
    'NOVA',
    'ATRIBUIDA',
    'EM_COLETA',
    'EM_TRANSPORTE',
    'FINALIZADA',
    'CANCELADA',
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (selectedStatus === 'ATRIBUIDA' && !selectedDriverId) {
      setErrorMessage('É obrigatório selecionar um motorista para atribuir a solicitação.');
      return;
    }

    if (selectedStatus === 'FINALIZADA' && !confirmFinalize) {
      setErrorMessage('É obrigatório confirmar a conclusão e entrega do serviço.');
      return;
    }

    if (selectedStatus === 'CANCELADA' && (!reason || reason.trim().length === 0)) {
      setErrorMessage('É obrigatório informar o motivo do cancelamento.');
      return;
    }

    setIsSubmitting(true);
    try {
      await dataService.updateStatus(
        request.id,
        selectedStatus,
        reason || `Status alterado para ${STATUS_LABELS[selectedStatus]}`,
        selectedDriverId || undefined,
        user?.full_name || 'Operador'
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao atualizar status.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in duration-200">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Atualizar Status da OS: {request.order_number}
            </h3>
            <p className="text-xs text-slate-500">
              Cliente: {request.client?.trade_name || request.client?.corporate_name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-sm">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Seleção do Novo Status */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Novo Status da Operação *
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as RequestStatus)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-violet-800"
            >
              {validStatuses.map((st) => (
                <option key={st} value={st}>
                  {STATUS_LABELS[st]}
                </option>
              ))}
            </select>
          </div>

          {/* Se status for ATRIBUIDA, exige seleção de motorista */}
          {selectedStatus === 'ATRIBUIDA' && (
            <div className="p-3.5 bg-violet-50/70 border border-violet-200 rounded-lg space-y-2">
              <label className="block text-xs font-bold text-violet-950 flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-violet-800" />
                Motorista Responsável *
              </label>
              <select
                value={selectedDriverId}
                onChange={(e) => setSelectedDriverId(e.target.value)}
                required
                className="w-full px-3 py-2 bg-white border border-violet-300 rounded-md text-slate-900 text-xs focus:ring-2 focus:ring-violet-800 focus:outline-none"
              >
                <option value="">Selecione o motorista...</option>
                {drivers.map((drv) => (
                  <option key={drv.id} value={drv.id}>
                    {drv.name} - {drv.phone} ({drv.vehicle_type.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Se status for FINALIZADA, exige confirmação */}
          {selectedStatus === 'FINALIZADA' && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg space-y-2">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmFinalize}
                  onChange={(e) => setConfirmFinalize(e.target.checked)}
                  className="mt-1 h-4 w-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                />
                <span className="text-xs text-emerald-950 font-medium">
                  Confirmo que todas as paradas e entregas foram concluídas com sucesso pelo motorista.
                </span>
              </label>
            </div>
          )}

          {/* Se status for CANCELADA, exige justificativa */}
          {selectedStatus === 'CANCELADA' && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg space-y-2">
              <label className="block text-xs font-bold text-rose-950">
                Motivo do Cancelamento (Obrigatório) *
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
                placeholder="Informe detalhadamente por que a solicitação está sendo cancelada..."
                rows={3}
                className="w-full px-3 py-2 bg-white border border-rose-300 rounded-md text-xs text-slate-900 focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
            </div>
          )}

          {/* Observações da Mudança (opcional para outros status) */}
          {selectedStatus !== 'CANCELADA' && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Observação do Registro (Opcional)
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ex: Motorista a caminho da coleta"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-800"
              />
            </div>
          )}

          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-bold text-white bg-violet-800 hover:bg-violet-900 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
            >
              {isSubmitting ? 'Salvando...' : 'Confirmar Atualização'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
