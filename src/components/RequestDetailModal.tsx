import React, { useEffect, useState } from 'react';
import {
  X,
  MapPin,
  Calendar,
  Clock,
  User,
  Truck,
  Building,
  DollarSign,
  History,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import { RequestStatusHistory, ServiceRequest } from '../types';
import { StatusBadge } from './StatusBadge';
import {
  CATEGORY_LABELS,
  formatBRL,
  formatDateTime,
  formatDuration,
  formatKilometers,
  STATUS_LABELS,
  VEHICLE_LABELS,
} from '../lib/formatters';
import { dataService } from '../services/dataService';

interface RequestDetailModalProps {
  request: ServiceRequest | null;
  isOpen: boolean;
  onClose: () => void;
}

export const RequestDetailModal: React.FC<RequestDetailModalProps> = ({
  request,
  isOpen,
  onClose,
}) => {
  const [history, setHistory] = useState<RequestStatusHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (request && isOpen) {
      setLoadingHistory(true);
      dataService
        .getStatusHistory(request.id)
        .then((res) => setHistory(res))
        .catch(() => setHistory([]))
        .finally(() => setLoadingHistory(false));
    }
  }, [request, isOpen]);

  if (!isOpen || !request) return null;

  const pickupStop = request.stops?.find((s) => s.stop_type === 'PICKUP');
  const deliveryStops = request.stops?.filter((s) => s.stop_type === 'DELIVERY') || [];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in duration-200">
        {/* Cabeçalho do Modal */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold text-violet-900 tabular-nums">
              {request.order_number}
            </span>
            <StatusBadge status={request.status} />
            {request.delivery_type === 'AGD' ? (
              <span className="text-xs bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded border border-amber-200">
                Agendado
              </span>
            ) : (
              <span className="text-xs bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded border border-emerald-200">
                Imediato
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo com rolagem */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-700">
          {/* Alerta de Cancelamento se houver */}
          {request.status === 'CANCELADA' && (
            <div className="bg-rose-50 border border-rose-200 rounded-lg p-3.5 text-rose-900 flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold block">Solicitação Cancelada</strong>
                <p className="text-xs mt-0.5">
                  Motivo registrado: <span className="italic font-medium">{request.cancel_reason || 'Não informado'}</span>
                </p>
              </div>
            </div>
          )}

          {/* Bloco 1: Informações Gerais do Serviço */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Cliente
              </span>
              <p className="font-bold text-slate-900 mt-0.5">
                {request.client?.trade_name || request.client?.corporate_name || 'N/A'}
              </p>
              {request.client?.document && (
                <p className="text-xs text-slate-500 tabular-nums">CNPJ/CPF: {request.client.document}</p>
              )}
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Solicitante e Contato
              </span>
              <p className="font-semibold text-slate-900 mt-0.5">{request.requester_name}</p>
              <p className="text-xs text-slate-500 tabular-nums">{request.requester_phone}</p>
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Categoria do Serviço
              </span>
              <p className="font-semibold text-slate-900 mt-0.5">
                {CATEGORY_LABELS[request.category] || request.category}
              </p>
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Data e Horário
              </span>
              <p className="font-semibold text-slate-900 mt-0.5 tabular-nums">
                {request.delivery_type === 'AGD' && request.scheduled_at
                  ? `Agendado para: ${formatDateTime(request.scheduled_at)}`
                  : `Criada em: ${formatDateTime(request.created_at)}`}
              </p>
            </div>

            {request.kurz_order && (
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  Nosso Pedido / KURZ
                </span>
                <p className="font-semibold text-slate-900 mt-0.5">{request.kurz_order}</p>
              </div>
            )}
            {request.cost_center && (
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  Centro de Custo
                </span>
                <p className="font-semibold text-slate-900 mt-0.5">{request.cost_center}</p>
              </div>
            )}
          </div>

          {/* Detalhes de Press Kit se aplicável */}
          {request.category === 'press_kit' && request.press_kit_info && (
            <div className="bg-amber-50/70 border border-amber-200 rounded-lg p-4 space-y-2">
              <span className="text-xs font-bold text-amber-900 uppercase tracking-wider block">
                Especificações do Press Kit
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                <div>
                  <span className="text-amber-800 font-medium">Veículo para rota:</span>{' '}
                  <strong className="text-amber-950">
                    {VEHICLE_LABELS[request.press_kit_info.vehicle_type] || request.press_kit_info.vehicle_type}
                  </strong>
                </div>
                <div>
                  <span className="text-amber-800 font-medium">Quantidade de kits:</span>{' '}
                  <strong className="text-amber-950">{request.press_kit_info.kit_quantity} un</strong>
                </div>
                <div>
                  <span className="text-amber-800 font-medium">Campanha:</span>{' '}
                  <strong className="text-amber-950">{request.press_kit_info.campaign_name}</strong>
                </div>
              </div>
              {request.press_kit_info.special_care && (
                <p className="text-xs text-amber-900 mt-1">
                  <strong>Cuidados especiais:</strong> {request.press_kit_info.special_care}
                </p>
              )}
            </div>
          )}

          {/* Descrição e Observações */}
          <div className="space-y-2">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Descrição do Serviço
              </span>
              <p className="mt-1 text-slate-800 bg-white p-3 rounded border border-slate-200">
                {request.description}
              </p>
            </div>
            {request.notes && (
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  Observações Gerais
                </span>
                <p className="mt-1 text-slate-700 bg-slate-50 p-3 rounded border border-slate-200 text-xs">
                  {request.notes}
                </p>
              </div>
            )}
          </div>

          {/* Bloco 2: Paradas (Coleta e Entregas) */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-900 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-violet-800" />
              Paradas do Itinerário
            </h4>

            {pickupStop && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-amber-400 text-slate-900 font-bold flex items-center justify-center text-xs shrink-0">
                  C
                </span>
                <div className="flex-1 text-xs">
                  <div className="flex items-center justify-between">
                    <strong className="text-slate-900 uppercase">Coleta: {pickupStop.company_name}</strong>
                    <span className="text-slate-500">Atendimento: {pickupStop.service_time_minutes} min</span>
                  </div>
                  <p className="text-slate-700 mt-0.5">
                    {pickupStop.address_full}, {pickupStop.number}{' '}
                    {pickupStop.complement ? `(${pickupStop.complement})` : ''}
                  </p>
                  <p className="text-slate-500 mt-0.5">
                    Contato: {pickupStop.contact_name} - {pickupStop.contact_phone}
                  </p>
                  {pickupStop.access_notes && (
                    <p className="text-slate-500 italic mt-0.5">Obs: {pickupStop.access_notes}</p>
                  )}
                </div>
              </div>
            )}

            {deliveryStops.map((stop, i) => (
              <div key={i} className="p-3 bg-white border border-slate-200 rounded-lg flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-violet-600 text-white font-bold flex items-center justify-center text-xs shrink-0">
                  {i + 1}
                </span>
                <div className="flex-1 text-xs">
                  <div className="flex items-center justify-between">
                    <strong className="text-slate-900 uppercase">
                      Entrega #{i + 1}: {stop.company_name || 'Destino'}
                    </strong>
                    <span className="text-slate-500">Atendimento: {stop.service_time_minutes} min</span>
                  </div>
                  <p className="text-slate-700 mt-0.5">
                    {stop.address_full}, {stop.number} {stop.complement ? `(${stop.complement})` : ''}
                  </p>
                  <p className="text-slate-500 mt-0.5">
                    Contato: {stop.contact_name} - {stop.contact_phone}
                  </p>
                  {stop.access_notes && (
                    <p className="text-slate-500 italic mt-0.5">Obs: {stop.access_notes}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Bloco 3: Rota, Motorista e Valores Financeiros */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Rota e Motorista */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
              <h5 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-violet-800" />
                Motorista e Deslocamento
              </h5>
              <div className="text-xs space-y-1">
                <p>
                  <span className="text-slate-500">Motorista Atribuído:</span>{' '}
                  <strong className="text-slate-900">
                    {request.driver ? `${request.driver.name} (${request.driver.phone})` : 'Não atribuído'}
                  </strong>
                </p>
                <p>
                  <span className="text-slate-500">Distância Estimada:</span>{' '}
                  <strong className="text-slate-900 tabular-nums">
                    {formatKilometers(request.distance_meters)}
                  </strong>
                </p>
                <p>
                  <span className="text-slate-500">Tempo de Deslocamento:</span>{' '}
                  <strong className="text-slate-900 tabular-nums">
                    {formatDuration(request.duration_seconds)}
                  </strong>
                </p>
                <p>
                  <span className="text-slate-500">Tempo Total Operacional:</span>{' '}
                  <strong className="text-slate-900 tabular-nums">
                    {formatDuration(request.operational_duration_seconds || request.duration_seconds)}
                  </strong>
                </p>
              </div>
            </div>

            {/* Valores Financeiros */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
              <h5 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-emerald-700" />
                Valores Financeiros
              </h5>
              <div className="text-xs space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Valor Cobrado Cliente:</span>
                  <strong className="text-slate-900 font-bold tabular-nums">
                    {formatBRL(request.price_client_cents)}
                  </strong>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Valor Repasse Motorista:</span>
                  <strong className="text-slate-900 font-bold tabular-nums">
                    {formatBRL(request.price_driver_cents)}
                  </strong>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-sm">
                  <span className="font-bold text-violet-900">Margem / Diferença:</span>
                  <strong className="font-extrabold text-violet-900 tabular-nums">
                    {formatBRL(request.margin_cents)}
                  </strong>
                </div>
              </div>
            </div>
          </div>

          {/* Bloco 4: Histórico de Mudanças de Status */}
          <div className="space-y-3 pt-2">
            <h4 className="font-bold text-slate-900 flex items-center gap-2">
              <History className="w-4 h-4 text-violet-800" />
              Histórico de Status e Auditoria
            </h4>

            {loadingHistory ? (
              <p className="text-xs text-slate-500">Carregando histórico...</p>
            ) : history.length === 0 ? (
              <p className="text-xs text-slate-400 italic">Nenhum evento registrado até o momento.</p>
            ) : (
              <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 bg-slate-50">
                {history.map((item) => (
                  <div key={item.id} className="p-3 text-xs flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={item.to_status} size="sm" />
                        <span className="text-slate-700 font-medium">{item.reason}</span>
                      </div>
                      {item.author_name && (
                        <span className="text-[11px] text-slate-500 mt-0.5 block">
                          Por: {item.author_name}
                        </span>
                      )}
                    </div>
                    <span className="text-slate-400 tabular-nums text-[11px] shrink-0">
                      {formatDateTime(item.created_at)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Rodapé do Modal */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold rounded-lg text-xs transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
