import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus,
  Download,
  Search,
  Filter,
  Eye,
  Edit,
  Copy,
  RefreshCw,
  XCircle,
  Truck,
  CheckCircle2,
  Clock,
  Layers,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
} from 'lucide-react';
import {
  Client,
  Driver,
  FilterState,
  RequestStatus,
  ServiceCategory,
  ServiceRequest,
} from '../types';
import { dataService } from '../services/dataService';
import { StatusBadge } from '../components/StatusBadge';
import { RequestDetailModal } from '../components/RequestDetailModal';
import { StatusChangeModal } from '../components/StatusChangeModal';
import { CancelRequestModal } from '../components/CancelRequestModal';
import { exportRequestsToCSV } from '../lib/csvExport';
import {
  CATEGORY_LABELS,
  formatBRL,
  formatDateTime,
  formatDuration,
  formatKilometers,
} from '../lib/formatters';

export const RequestsList: React.FC = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modais de ação
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isCancelOpen, setIsCancelOpen] = useState(false);

  // Notificação de ação rápida (ex: OS duplicada)
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Filtros
  const [filters, setFilters] = useState<FilterState>({
    period: 'all',
    clientId: '',
    category: '',
    driverId: '',
    status: '',
    searchQuery: '',
  });

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [reqs, cls, drvs] = await Promise.all([
        dataService.getRequests(filters),
        dataService.getClients(),
        dataService.getDrivers(),
      ]);
      setRequests(reqs);
      setClients(cls);
      setDrivers(drvs);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    setCurrentPage(1);
  }, [filters]);

  // Indicadores do período
  const stats = useMemo(() => {
    const total = requests.length;
    const aguardando = requests.filter((r) => r.status === 'NOVA').length;
    const emAtendimento = requests.filter((r) =>
      ['ATRIBUIDA', 'EM_COLETA', 'EM_TRANSPORTE'].includes(r.status)
    ).length;
    const finalizadas = requests.filter((r) => r.status === 'FINALIZADA').length;
    return { total, aguardando, emAtendimento, finalizadas };
  }, [requests]);

  // Paginação
  const totalPages = Math.ceil(requests.length / pageSize) || 1;
  const paginatedRequests = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return requests.slice(start, start + pageSize);
  }, [requests, currentPage, pageSize]);

  // Ações
  const handleView = (req: ServiceRequest) => {
    setSelectedRequest(req);
    setIsDetailOpen(true);
  };

  const handleEdit = (req: ServiceRequest) => {
    navigate(`/solicitacoes/${req.id}/editar`);
  };

  const handleDuplicate = async (req: ServiceRequest) => {
    try {
      const duplicated = await dataService.duplicateRequest(req.id);
      setFeedbackMessage(`Solicitação duplicada com sucesso! Nova OS gerada: ${duplicated.order_number}`);
      setTimeout(() => setFeedbackMessage(null), 6000);
      loadData();
    } catch (err: any) {
      alert(`Falha ao duplicar: ${err.message}`);
    }
  };

  const handleOpenStatus = (req: ServiceRequest) => {
    setSelectedRequest(req);
    setIsStatusOpen(true);
  };

  const handleOpenCancel = (req: ServiceRequest) => {
    setSelectedRequest(req);
    setIsCancelOpen(true);
  };

  const handleResetFilters = () => {
    setFilters({
      period: 'all',
      clientId: '',
      category: '',
      driverId: '',
      status: '',
      searchQuery: '',
    });
  };

  return (
    <div className="space-y-6">
      {/* Notificação Temporária de Sucesso */}
      {feedbackMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg text-sm flex items-center justify-between shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-semibold">{feedbackMessage}</span>
          </div>
          <button
            onClick={() => setFeedbackMessage(null)}
            className="text-emerald-700 hover:text-emerald-900 text-xs font-bold"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Cabeçalho da Página com CTA Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Central de Solicitações
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Gerenciamento e despacho operacional de motoboy, utilitário, passeio e press kit
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => exportRequestsToCSV(requests)}
            disabled={requests.length === 0}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
            title="Exportar dados filtrados para CSV higienizado"
          >
            <Download className="w-4 h-4 text-slate-500" />
            Exportar CSV
          </button>

          <Link
            to="/solicitacoes/nova"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-800 hover:bg-violet-900 text-white text-xs font-bold shadow-sm transition-all focus:ring-2 focus:ring-violet-800 focus:ring-offset-2"
          >
            <Plus className="w-4 h-4 text-amber-400 stroke-[3]" />
            Nova Solicitação
          </Link>
        </div>
      </div>

      {/* 4 Indicadores Operacionais do Período */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Total de Solicitações
            </span>
            <span className="text-2xl font-black text-slate-900 tabular-nums">
              {stats.total}
            </span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-sky-700 uppercase tracking-wider block">
              Aguardando
            </span>
            <span className="text-2xl font-black text-sky-800 tabular-nums">
              {stats.aguardando}
            </span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-sky-50 flex items-center justify-center text-sky-700">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider block">
              Em Atendimento
            </span>
            <span className="text-2xl font-black text-amber-900 tabular-nums">
              {stats.emAtendimento}
            </span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-700">
            <Truck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider block">
              Finalizadas
            </span>
            <span className="text-2xl font-black text-emerald-900 tabular-nums">
              {stats.finalizadas}
            </span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-700">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Barra de Filtros Completa */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-slate-700 pb-2 border-b border-slate-100">
          <span className="flex items-center gap-1.5 uppercase tracking-wider">
            <Filter className="w-4 h-4 text-violet-800" />
            Filtros Operacionais
          </span>
          <button
            onClick={handleResetFilters}
            className="text-violet-800 hover:text-violet-950 font-semibold inline-flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Limpar filtros
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Busca por OS / KURZ */}
          <div className="lg:col-span-2 relative">
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              Buscar OS / KURZ / Cliente
            </label>
            <div className="relative">
              <input
                type="text"
                value={filters.searchQuery}
                onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
                placeholder="Ex: OS-2026-0001 ou KZ-88421"
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-800 text-slate-900"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            </div>
          </div>

          {/* Período */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Período</label>
            <select
              value={filters.period}
              onChange={(e) => setFilters({ ...filters, period: e.target.value as any })}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-800"
            >
              <option value="all">Todo o histórico</option>
              <option value="today">Hoje</option>
              <option value="week">Últimos 7 dias</option>
              <option value="month">Últimos 30 dias</option>
            </select>
          </div>

          {/* Cliente */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Cliente</label>
            <select
              value={filters.clientId}
              onChange={(e) => setFilters({ ...filters, clientId: e.target.value })}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-800"
            >
              <option value="">Todos os clientes</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.trade_name || c.corporate_name}
                </option>
              ))}
            </select>
          </div>

          {/* Categoria */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Categoria</label>
            <select
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-800"
            >
              <option value="">Todas as categorias</option>
              <option value="motoboy">Motoboy</option>
              <option value="utilitario">Utilitário</option>
              <option value="passeio">Passeio</option>
              <option value="press_kit">Press Kit</option>
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-800"
            >
              <option value="">Todos os status</option>
              <option value="NOVA">Nova</option>
              <option value="ATRIBUIDA">Atribuída</option>
              <option value="EM_COLETA">Em coleta</option>
              <option value="EM_TRANSPORTE">Em transporte</option>
              <option value="FINALIZADA">Finalizada</option>
              <option value="CANCELADA">Cancelada</option>
            </select>
          </div>
        </div>
      </div>

      {/* Listagem em Tabela (Desktop) ou Cards (Mobile) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-slate-500 flex flex-col items-center justify-center space-y-2">
            <div className="w-8 h-8 border-3 border-violet-800 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-semibold">Carregando solicitações...</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="py-16 text-center text-slate-500 space-y-3">
            <Layers className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-semibold text-slate-700">Nenhuma solicitação encontrada</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Tente ajustar os filtros acima ou crie uma nova solicitação agora mesmo.
            </p>
            <Link
              to="/solicitacoes/nova"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-violet-800 hover:text-violet-950 bg-violet-50 rounded-md"
            >
              <Plus className="w-3.5 h-3.5" /> Criar primeira solicitação
            </Link>
          </div>
        ) : (
          <>
            {/* Tabela Desktop */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                    <th className="py-3 px-3">OS</th>
                    <th className="py-3 px-3">Data/Hora</th>
                    <th className="py-3 px-3">Cliente</th>
                    <th className="py-3 px-3">Serviço</th>
                    <th className="py-3 px-3">Itinerário</th>
                    <th className="py-3 px-3 text-right">KM</th>
                    <th className="py-3 px-3 text-right">Tempo</th>
                    <th className="py-3 px-3">Motorista</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Valor Cli.</th>
                    <th className="py-3 px-3 text-right">Valor Mot.</th>
                    <th className="py-3 px-3 text-right">Margem</th>
                    <th className="py-3 px-3 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {paginatedRequests.map((req) => {
                    const pickup = req.stops?.find((s) => s.stop_type === 'PICKUP');
                    const deliveries = req.stops?.filter((s) => s.stop_type === 'DELIVERY') || [];
                    const itinerarySummary = `${pickup?.company_name || 'Coleta'} ➔ ${deliveries.length} ${deliveries.length === 1 ? 'entrega' : 'entregas'}`;

                    return (
                      <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3 font-bold text-violet-900 tabular-nums whitespace-nowrap">
                          {req.order_number}
                          {req.kurz_order && (
                            <span className="block text-[10px] font-normal text-slate-400">
                              {req.kurz_order}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 tabular-nums whitespace-nowrap text-slate-500">
                          {formatDateTime(req.delivery_type === 'AGD' ? req.scheduled_at : req.created_at)}
                          {req.delivery_type === 'AGD' && (
                            <span className="block text-[10px] text-amber-700 font-semibold">AGD</span>
                          )}
                        </td>
                        <td className="py-3 px-3 max-w-[140px] truncate" title={req.client?.trade_name || req.client?.corporate_name}>
                          <span className="font-semibold text-slate-900 block truncate">
                            {req.client?.trade_name || req.client?.corporate_name}
                          </span>
                          <span className="text-[10px] text-slate-400 block truncate">
                            {req.requester_name}
                          </span>
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className="font-medium text-slate-800">
                            {CATEGORY_LABELS[req.category]}
                          </span>
                        </td>
                        <td className="py-3 px-3 max-w-[160px] truncate text-slate-600 text-[11px]" title={itinerarySummary}>
                          {itinerarySummary}
                        </td>
                        <td className="py-3 px-3 text-right tabular-nums whitespace-nowrap text-slate-800">
                          {formatKilometers(req.distance_meters)}
                        </td>
                        <td className="py-3 px-3 text-right tabular-nums whitespace-nowrap text-slate-800">
                          {formatDuration(req.duration_seconds)}
                        </td>
                        <td className="py-3 px-3 max-w-[120px] truncate whitespace-nowrap">
                          {req.driver ? (
                            <span className="text-slate-800 font-medium truncate block">
                              {req.driver.name}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Não atribuído</span>
                          )}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <StatusBadge status={req.status} />
                        </td>
                        <td className="py-3 px-3 text-right tabular-nums whitespace-nowrap text-slate-900 font-medium">
                          {formatBRL(req.price_client_cents)}
                        </td>
                        <td className="py-3 px-3 text-right tabular-nums whitespace-nowrap text-slate-600">
                          {formatBRL(req.price_driver_cents)}
                        </td>
                        <td className="py-3 px-3 text-right tabular-nums whitespace-nowrap font-bold text-violet-900">
                          {formatBRL(req.margin_cents)}
                        </td>
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleView(req)}
                              className="p-1 text-slate-500 hover:text-violet-800 hover:bg-violet-50 rounded"
                              title="Visualizar detalhes"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleEdit(req)}
                              className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded"
                              title="Editar solicitação"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDuplicate(req)}
                              className="p-1 text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded"
                              title="Duplicar como nova OS"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleOpenStatus(req)}
                              className="p-1 text-slate-500 hover:text-indigo-700 hover:bg-indigo-50 rounded"
                              title="Atualizar status"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                            {req.status !== 'FINALIZADA' && req.status !== 'CANCELADA' && (
                              <button
                                onClick={() => handleOpenCancel(req)}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                                title="Cancelar com motivo"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Visualização Adaptada em Cards para Mobile */}
            <div className="lg:hidden divide-y divide-slate-100 p-3 space-y-3">
              {paginatedRequests.map((req) => (
                <div key={req.id} className="pt-3 first:pt-0 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-violet-900 text-sm tabular-nums">
                      {req.order_number}
                    </span>
                    <StatusBadge status={req.status} />
                  </div>

                  <div>
                    <strong className="text-slate-900 text-sm block">
                      {req.client?.trade_name || req.client?.corporate_name}
                    </strong>
                    <span className="text-xs text-slate-500">
                      {CATEGORY_LABELS[req.category]} · {formatDateTime(req.created_at)}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-lg text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase">Distância</span>
                      <strong className="tabular-nums text-slate-800">
                        {formatKilometers(req.distance_meters)}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase">Tempo</span>
                      <strong className="tabular-nums text-slate-800">
                        {formatDuration(req.duration_seconds)}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase">Margem</span>
                      <strong className="tabular-nums text-violet-900 font-bold">
                        {formatBRL(req.margin_cents)}
                      </strong>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-slate-600">
                      Motorista: <strong>{req.driver?.name || 'A definir'}</strong>
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleView(req)}
                        className="px-2 py-1 text-xs bg-slate-100 text-slate-700 rounded font-medium"
                      >
                        Ver
                      </button>
                      <button
                        onClick={() => handleOpenStatus(req)}
                        className="px-2 py-1 text-xs bg-violet-100 text-violet-800 rounded font-medium"
                      >
                        Status
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Paginação */}
            <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
              <span>
                Mostrando <strong className="text-slate-800">{(currentPage - 1) * pageSize + 1}</strong> a{' '}
                <strong className="text-slate-800">
                  {Math.min(currentPage * pageSize, requests.length)}
                </strong>{' '}
                de <strong className="text-slate-800">{requests.length}</strong> solicitações
              </span>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-2 font-semibold text-slate-700">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modais Integrados */}
      <RequestDetailModal
        request={selectedRequest}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
      />

      <StatusChangeModal
        request={selectedRequest}
        isOpen={isStatusOpen}
        onClose={() => setIsStatusOpen(false)}
        onSuccess={loadData}
      />

      <CancelRequestModal
        request={selectedRequest}
        isOpen={isCancelOpen}
        onClose={() => setIsCancelOpen(false)}
        onSuccess={loadData}
      />
    </div>
  );
};
