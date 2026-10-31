import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  Calendar,
  Clock,
  DollarSign,
  FileText,
  MapPin,
  Plus,
  RefreshCw,
  Trash2,
  Truck,
  User,
  AlertTriangle,
  Info,
  Sparkles,
  Save,
} from 'lucide-react';
import {
  Client,
  ComputeRouteResponse,
  DeliveryType,
  Driver,
  PressKitDetails,
  RequestStop,
  ServiceCategory,
  ServiceRequest,
  VehicleType,
} from '../types';
import { dataService } from '../services/dataService';
import { calculateRoute } from '../services/routeService';
import { RouteMapVisualizer } from '../components/RouteMapVisualizer';
import { QuickClientModal } from '../components/QuickClientModal';
import {
  centsToInputValue,
  formatBRL,
  parseBRLInputToCents,
  VEHICLE_LABELS,
} from '../lib/formatters';
import { useAuth } from '../context/AuthContext';

export const RequestForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);
  const navigate = useNavigate();
  const { user } = useAuth();

  // Estados de catálogo
  const [clients, setClients] = useState<Client[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [isQuickClientOpen, setIsQuickClientOpen] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(isEditing);

  // Bloco 1: Dados do Serviço
  const [clientId, setClientId] = useState('');
  const [requesterName, setRequesterName] = useState('');
  const [requesterPhone, setRequesterPhone] = useState('');
  const [category, setCategory] = useState<ServiceCategory>('motoboy');
  const [deliveryType, setDeliveryType] = useState<DeliveryType>('IMEDIATO');
  const [scheduledAt, setScheduledAt] = useState('');
  const [kurzOrder, setKurzOrder] = useState('');
  const [costCenter, setCostCenter] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');

  // Detalhes Press Kit
  const [pressKitVehicle, setPressKitVehicle] = useState<VehicleType>('utilitario');
  const [kitQuantity, setKitQuantity] = useState(1);
  const [campaignName, setCampaignName] = useState('');
  const [specialCare, setSpecialCare] = useState('');

  // Bloco 2: Paradas
  const [pickupStop, setPickupStop] = useState<RequestStop>({
    stop_type: 'PICKUP',
    sequence_order: 1,
    company_name: '',
    address_full: '',
    number: '',
    complement: '',
    contact_name: '',
    contact_phone: '',
    access_notes: '',
    service_time_minutes: 5,
  });

  const [deliveryStops, setDeliveryStops] = useState<RequestStop[]>([
    {
      stop_type: 'DELIVERY',
      sequence_order: 2,
      company_name: '',
      address_full: '',
      number: '',
      complement: '',
      contact_name: '',
      contact_phone: '',
      access_notes: '',
      service_time_minutes: 5,
    },
  ]);

  // Rota calculada
  const [routeData, setRouteData] = useState<ComputeRouteResponse | null>(null);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  const [routeStale, setRouteStale] = useState(false);
  const [routeErrorMessage, setRouteErrorMessage] = useState<string | null>(null);

  // Bloco 3: Responsável e Valores
  const [driverId, setDriverId] = useState('');
  const [priceClientInput, setPriceClientInput] = useState('');
  const [priceDriverInput, setPriceDriverInput] = useState('');

  // Submissão
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Carrega catálogos e dados existentes se for edição
  useEffect(() => {
    async function init() {
      try {
        const [cls, drvs] = await Promise.all([
          dataService.getClients(),
          dataService.getDrivers(),
        ]);
        setClients(cls);
        setDrivers(drvs);

        if (isEditing && id) {
          const existing = await dataService.getRequestById(id);
          if (existing) {
            setClientId(existing.client_id);
            setRequesterName(existing.requester_name);
            setRequesterPhone(existing.requester_phone);
            setCategory(existing.category);
            setDeliveryType(existing.delivery_type);
            setScheduledAt(existing.scheduled_at ? existing.scheduled_at.slice(0, 16) : '');
            setKurzOrder(existing.kurz_order || '');
            setCostCenter(existing.cost_center || '');
            setDescription(existing.description);
            setNotes(existing.notes || '');

            if (existing.press_kit_info) {
              setPressKitVehicle(existing.press_kit_info.vehicle_type);
              setKitQuantity(existing.press_kit_info.kit_quantity);
              setCampaignName(existing.press_kit_info.campaign_name);
              setSpecialCare(existing.press_kit_info.special_care || '');
            }

            if (existing.stops && existing.stops.length > 0) {
              const p = existing.stops.find((s) => s.stop_type === 'PICKUP');
              const d = existing.stops
                .filter((s) => s.stop_type === 'DELIVERY')
                .sort((a, b) => a.sequence_order - b.sequence_order);

              if (p) setPickupStop(p);
              if (d.length > 0) setDeliveryStops(d);
            }

            setDriverId(existing.driver_id || '');
            setPriceClientInput(centsToInputValue(existing.price_client_cents));
            setPriceDriverInput(centsToInputValue(existing.price_driver_cents));

            if (existing.distance_meters && existing.duration_seconds) {
              setRouteData({
                distanceMeters: existing.distance_meters,
                durationSeconds: existing.duration_seconds,
                polyline: existing.route_polyline,
                legs: [],
                modeUsed: existing.category === 'motoboy' ? 'TWO_WHEELER' : 'DRIVE',
                isTwoWheelerBetaWarning: existing.category === 'motoboy',
                fallbackUsed: false,
                computedAt: existing.updated_at,
              });
            }
          }
        }
      } catch (err) {
        console.error('Erro ao carregar dados:', err);
      } finally {
        setLoadingInitial(false);
      }
    }
    init();
  }, [id, isEditing]);

  // Determina o modo de veículo para cálculo da rota
  // Press kit é categoria de serviço, o cálculo usa o veículo escolhido
  const activeVehicleType: VehicleType =
    category === 'press_kit' ? pressKitVehicle : (category as VehicleType);

  // Invalida estimativa quando qualquer endereço ou veículo mudar
  const invalidateRoute = () => {
    setRouteStale(true);
    setRouteErrorMessage(null);
  };

  // Cálculo de Rota
  const handleComputeRoute = async () => {
    if (!pickupStop.address_full.trim()) {
      setRouteErrorMessage('Preencha o endereço completo da coleta.');
      return;
    }
    const hasValidDelivery = deliveryStops.some((d) => d.address_full.trim().length > 0);
    if (!hasValidDelivery) {
      setRouteErrorMessage('Preencha ao menos um endereço de entrega.');
      return;
    }

    setIsCalculatingRoute(true);
    setRouteErrorMessage(null);

    try {
      const result = await calculateRoute({
        pickup: pickupStop,
        deliveries: deliveryStops,
        vehicleType: activeVehicleType,
        deliveryType,
        scheduledAt: deliveryType === 'AGD' && scheduledAt ? scheduledAt : undefined,
      });

      setRouteData(result);
      setRouteStale(false);
    } catch (err: any) {
      setRouteErrorMessage(err.message || 'Falha ao calcular rota online.');
    } finally {
      setIsCalculatingRoute(false);
    }
  };

  // Adicionar e remover paradas
  const addDeliveryStop = () => {
    setDeliveryStops([
      ...deliveryStops,
      {
        stop_type: 'DELIVERY',
        sequence_order: deliveryStops.length + 2,
        company_name: '',
        address_full: '',
        number: '',
        complement: '',
        contact_name: '',
        contact_phone: '',
        access_notes: '',
        service_time_minutes: 5,
      },
    ]);
    invalidateRoute();
  };

  const removeDeliveryStop = (index: number) => {
    if (deliveryStops.length <= 1) return;
    const updated = deliveryStops.filter((_, i) => i !== index);
    setDeliveryStops(updated);
    invalidateRoute();
  };

  const updateDeliveryStop = (index: number, field: keyof RequestStop, value: any) => {
    const updated = [...deliveryStops];
    updated[index] = { ...updated[index], [field]: value };
    setDeliveryStops(updated);
    if (field === 'address_full' || field === 'number' || field === 'service_time_minutes') {
      invalidateRoute();
    }
  };

  // Cálculos financeiros automáticos em centavos
  const priceClientCents = parseBRLInputToCents(priceClientInput);
  const priceDriverCents = parseBRLInputToCents(priceDriverInput);
  const marginCents =
    priceClientCents !== undefined && priceDriverCents !== undefined
      ? priceClientCents - priceDriverCents
      : undefined;

  // Preenchimento automático ao selecionar cliente
  const handleClientSelect = (cId: string) => {
    setClientId(cId);
    const selected = clients.find((c) => c.id === cId);
    if (selected) {
      if (!requesterName && selected.contact_name) setRequesterName(selected.contact_name);
      if (!requesterPhone && selected.phone) setRequesterPhone(selected.phone);
      if (!pickupStop.address_full && selected.address) {
        setPickupStop((prev) => ({
          ...prev,
          company_name: selected.trade_name || selected.corporate_name,
          address_full: selected.address || '',
          contact_name: selected.contact_name || '',
          contact_phone: selected.phone || '',
        }));
        invalidateRoute();
      }
    }
  };

  // Submissão do Formulário
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validações obrigatórias
    if (!clientId) {
      setErrorMessage('Selecione ou cadastre o cliente solicitante.');
      return;
    }
    if (!requesterName.trim() || !requesterPhone.trim()) {
      setErrorMessage('Informe o nome e o telefone do solicitante.');
      return;
    }
    if (deliveryType === 'AGD' && !scheduledAt) {
      setErrorMessage('Para serviços agendados (AGD), a data e o horário são obrigatórios.');
      return;
    }
    if (!pickupStop.address_full.trim()) {
      setErrorMessage('Informe o endereço de coleta.');
      return;
    }
    if (!deliveryStops[0]?.address_full.trim()) {
      setErrorMessage('Informe ao menos um endereço de entrega.');
      return;
    }
    if (!description.trim()) {
      setErrorMessage('Descreva o serviço a ser realizado.');
      return;
    }

    setIsSubmitting(true);

    try {
      const pressKitPayload: PressKitDetails | undefined =
        category === 'press_kit'
          ? {
              vehicle_type: pressKitVehicle,
              kit_quantity: kitQuantity,
              campaign_name: campaignName,
              special_care: specialCare,
            }
          : undefined;

      const stopsPayload: RequestStop[] = [
        { ...pickupStop, sequence_order: 1 },
        ...deliveryStops.map((d, i) => ({ ...d, sequence_order: i + 2 })),
      ];

      const totalServiceTimeMinutes =
        (pickupStop.service_time_minutes || 5) +
        deliveryStops.reduce((acc, curr) => acc + (curr.service_time_minutes || 5), 0);

      const displacementSeconds = routeData?.durationSeconds || 0;
      const operationalDurationSeconds = displacementSeconds + totalServiceTimeMinutes * 60;

      if (isEditing && id) {
        await dataService.updateRequest(id, {
          client_id: clientId,
          requester_name: requesterName,
          requester_phone: requesterPhone,
          category,
          delivery_type: deliveryType,
          scheduled_at: deliveryType === 'AGD' && scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
          kurz_order: kurzOrder || undefined,
          cost_center: costCenter || undefined,
          description,
          notes: notes || undefined,
          press_kit_info: pressKitPayload,
          driver_id: driverId || undefined,
          stops: stopsPayload,
          distance_meters: routeData?.distanceMeters,
          duration_seconds: routeData?.durationSeconds,
          operational_duration_seconds: operationalDurationSeconds,
          route_polyline: routeData?.polyline,
          price_client_cents: priceClientCents,
          price_driver_cents: priceDriverCents,
        });
      } else {
        await dataService.createRequest(
          {
            client_id: clientId,
            requester_name: requesterName,
            requester_phone: requesterPhone,
            category,
            delivery_type: deliveryType,
            scheduled_at: deliveryType === 'AGD' && scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
            kurz_order: kurzOrder || undefined,
            cost_center: costCenter || undefined,
            description,
            notes: notes || undefined,
            press_kit_info: pressKitPayload,
            driver_id: driverId || undefined,
            status: driverId ? 'ATRIBUIDA' : 'NOVA',
            stops: stopsPayload,
            distance_meters: routeData?.distanceMeters,
            duration_seconds: routeData?.durationSeconds,
            operational_duration_seconds: operationalDurationSeconds,
            route_polyline: routeData?.polyline,
            price_client_cents: priceClientCents,
            price_driver_cents: priceDriverCents,
          },
          user?.full_name || 'Operador'
        );
      }

      navigate('/');
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao gravar solicitação.');
      setIsSubmitting(false);
    }
  };

  if (loadingInitial) {
    return (
      <div className="py-24 text-center">
        <div className="w-8 h-8 border-3 border-violet-800 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-500 font-semibold">Carregando formulário...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              {isEditing ? 'Editar Solicitação' : 'Nova Solicitação de Transporte'}
            </h1>
            <p className="text-xs text-slate-500">
              Preencha os três blocos operacionais para roteirização e lançamento imediato
            </p>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2.5 shadow-xs">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          <span className="font-semibold">{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* =========================================================================
            BLOCO 1: DADOS DO SERVIÇO
        ========================================================================= */}
        <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-violet-100 text-violet-800 flex items-center justify-center text-xs font-black">
                1
              </span>
              Dados do Serviço
            </h2>
            <span className="text-xs text-slate-400 font-medium">Campos com * são obrigatórios</span>
          </div>

          {/* Cliente e Cadastro Rápido */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Cliente Solicitante *
                </label>
                <button
                  type="button"
                  onClick={() => setIsQuickClientOpen(true)}
                  className="text-xs font-bold text-violet-800 hover:text-violet-950 inline-flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> + Novo Cliente
                </button>
              </div>
              <select
                required
                value={clientId}
                onChange={(e) => handleClientSelect(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-violet-800"
              >
                <option value="">Selecione o cliente na lista...</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.trade_name ? `${c.trade_name} (${c.corporate_name})` : c.corporate_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Nosso Pedido / KURZ (Opcional)
              </label>
              <input
                type="text"
                value={kurzOrder}
                onChange={(e) => setKurzOrder(e.target.value)}
                placeholder="Ex: KZ-88421"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-800"
              />
            </div>
          </div>

          {/* Solicitante, Telefone e Centro de Custo */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nome do Solicitante *
              </label>
              <input
                type="text"
                required
                value={requesterName}
                onChange={(e) => setRequesterName(e.target.value)}
                placeholder="Ex: Camila Mendonça"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-800"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Telefone do Solicitante *
              </label>
              <input
                type="text"
                required
                value={requesterPhone}
                onChange={(e) => setRequesterPhone(e.target.value)}
                placeholder="(11) 98765-4321"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-800 tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Centro de Custo (Opcional)
              </label>
              <input
                type="text"
                value={costCenter}
                onChange={(e) => setCostCenter(e.target.value)}
                placeholder="Ex: Expedição / Mkt"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-800"
              />
            </div>
          </div>

          {/* Categoria e Tipo de Atendimento */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Categoria do Transporte *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(['motoboy', 'utilitario', 'passeio', 'press_kit'] as ServiceCategory[]).map(
                  (cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        setCategory(cat);
                        invalidateRoute();
                      }}
                      className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-all text-center ${
                        category === cat
                          ? 'bg-violet-800 text-white border-violet-800 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {cat === 'motoboy' && 'Motoboy'}
                      {cat === 'utilitario' && 'Utilitário'}
                      {cat === 'passeio' && 'Passeio'}
                      {cat === 'press_kit' && 'Press Kit'}
                    </button>
                  )
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Tipo de Atendimento *
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setDeliveryType('IMEDIATO');
                    invalidateRoute();
                  }}
                  className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-all text-center ${
                    deliveryType === 'IMEDIATO'
                      ? 'bg-violet-800 text-white border-violet-800 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  IMEDIATO (Saída agora)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDeliveryType('AGD');
                    invalidateRoute();
                  }}
                  className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-all text-center ${
                    deliveryType === 'AGD'
                      ? 'bg-violet-800 text-white border-violet-800 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  AGD (Agendado)
                </button>
              </div>
            </div>
          </div>

          {/* Data e hora se for AGD */}
          {deliveryType === 'AGD' && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg text-xs space-y-2 animate-in fade-in">
              <label className="block font-bold text-amber-950 uppercase tracking-wider">
                Data e Horário Programados (Obrigatório para AGD) *
              </label>
              <input
                type="datetime-local"
                required
                value={scheduledAt}
                onChange={(e) => {
                  setScheduledAt(e.target.value);
                  invalidateRoute();
                }}
                className="w-full sm:w-72 px-3 py-2 bg-white border border-amber-300 rounded-md text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <span className="text-[11px] text-amber-800 block">
                Não é permitido agendamento no passado. A estimativa de trânsito considerará este horário futuro.
              </span>
            </div>
          )}

          {/* Bloco Condicional para Press Kit */}
          {category === 'press_kit' && (
            <div className="p-4 bg-amber-50/70 border border-amber-300 rounded-lg space-y-3 animate-in fade-in">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-700" />
                <h3 className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                  Configuração Específica de Press Kit
                </h3>
              </div>
              <p className="text-[11px] text-amber-900">
                Press kit é uma categoria de serviço. Selecione o veículo físico para cálculo da rota e informe os dados da campanha.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Veículo para Trajeto *
                  </label>
                  <select
                    value={pressKitVehicle}
                    onChange={(e) => {
                      setPressKitVehicle(e.target.value as VehicleType);
                      invalidateRoute();
                    }}
                    className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded text-slate-900 font-medium"
                  >
                    <option value="motoboy">Motoboy (Mochila / Bag)</option>
                    <option value="utilitario">Carro Utilitário (Fiorino / Van)</option>
                    <option value="passeio">Carro de Passeio (Porta-malas)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Quantidade de Kits *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={kitQuantity}
                    onChange={(e) => setKitQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded text-slate-900 tabular-nums font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Nome da Campanha *
                  </label>
                  <input
                    type="text"
                    required
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    placeholder="Ex: Lançamento Kurz & Mídia 2026"
                    className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1 text-xs">
                  Cuidados Especiais (Frágil, Refrigeração, etc.)
                </label>
                <input
                  type="text"
                  value={specialCare}
                  onChange={(e) => setSpecialCare(e.target.value)}
                  placeholder="Ex: Caixas de vidro frágeis, não virar, manter na horizontal"
                  className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded text-slate-900 text-xs"
                />
              </div>
            </div>
          )}

          {/* Descrição e Observações */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Descrição do Serviço *
              </label>
              <textarea
                required
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descreva o que será transportado, volume, documentos, etc."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Observações Operacionais (Opcional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Instruções adicionais para a expedição ou motorista..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-800"
              />
            </div>
          </div>
        </section>

        {/* =========================================================================
            BLOCO 2: COLETA, ENTREGAS E ROTA
        ========================================================================= */}
        <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-violet-100 text-violet-800 flex items-center justify-center text-xs font-black">
                2
              </span>
              Coleta, Entregas e Rota
            </h2>
            <button
              type="button"
              onClick={handleComputeRoute}
              disabled={isCalculatingRoute}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-violet-900 bg-amber-400 hover:bg-amber-300 rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isCalculatingRoute ? 'animate-spin' : ''}`} />
              {routeData ? 'Recalcular Rota' : 'Calcular Rota Online'}
            </button>
          </div>

          {/* Aviso se rota estiver desatualizada */}
          {routeStale && routeData && (
            <div className="p-3 bg-amber-50 border border-amber-300 text-amber-900 rounded-lg text-xs flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                Os endereços, veículos ou horários foram alterados. Clique em "Recalcular Rota" para atualizar o trajeto.
              </span>
              <button
                type="button"
                onClick={handleComputeRoute}
                className="font-bold underline text-violet-900"
              >
                Atualizar agora
              </button>
            </div>
          )}

          {routeErrorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{routeErrorMessage}</span>
            </div>
          )}

          {/* Ponto de Coleta */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 font-bold flex items-center justify-center text-[10px]">
                  C
                </span>
                Ponto de Coleta (Origem) *
              </span>
              <div className="flex items-center gap-1 text-xs text-slate-500">
                <span>Tempo de atendimento:</span>
                <input
                  type="number"
                  min="0"
                  value={pickupStop.service_time_minutes}
                  onChange={(e) => {
                    setPickupStop({
                      ...pickupStop,
                      service_time_minutes: parseInt(e.target.value, 10) || 0,
                    });
                    invalidateRoute();
                  }}
                  className="w-14 px-1.5 py-0.5 bg-white border border-slate-300 rounded text-center text-xs tabular-nums"
                />
                <span>min</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Empresa / Local</label>
                <input
                  type="text"
                  value={pickupStop.company_name}
                  onChange={(e) => setPickupStop({ ...pickupStop, company_name: e.target.value })}
                  placeholder="Ex: Kurz Brasil"
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md text-slate-900"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">
                  Endereço Completo (Rua, Av, Bairro, Cidade) *
                </label>
                <input
                  type="text"
                  required
                  value={pickupStop.address_full}
                  onChange={(e) => {
                    setPickupStop({ ...pickupStop, address_full: e.target.value });
                    invalidateRoute();
                  }}
                  placeholder="Ex: Av. das Nações Unidas, Chácara Santo Antônio, São Paulo - SP"
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md text-slate-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Número</label>
                <input
                  type="text"
                  value={pickupStop.number}
                  onChange={(e) => {
                    setPickupStop({ ...pickupStop, number: e.target.value });
                    invalidateRoute();
                  }}
                  placeholder="14401"
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md text-slate-900"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Complemento</label>
                <input
                  type="text"
                  value={pickupStop.complement}
                  onChange={(e) => setPickupStop({ ...pickupStop, complement: e.target.value })}
                  placeholder="Doca 3"
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md text-slate-900"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Contato Coleta</label>
                <input
                  type="text"
                  value={pickupStop.contact_name}
                  onChange={(e) => setPickupStop({ ...pickupStop, contact_name: e.target.value })}
                  placeholder="Nome do responsável"
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md text-slate-900"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Telefone Contato</label>
                <input
                  type="text"
                  value={pickupStop.contact_phone}
                  onChange={(e) => setPickupStop({ ...pickupStop, contact_phone: e.target.value })}
                  placeholder="(11) 98765-4321"
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md text-slate-900 tabular-nums"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-600 mb-1 text-xs">
                Observações de Acesso na Coleta
              </label>
              <input
                type="text"
                value={pickupStop.access_notes}
                onChange={(e) => setPickupStop({ ...pickupStop, access_notes: e.target.value })}
                placeholder="Ex: Entrar pela portaria de carga e solicitar crachá de fornecedor"
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md text-slate-900 text-xs"
              />
            </div>
          </div>

          {/* Entregas Múltiplas */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Destinos de Entrega ({deliveryStops.length})
              </span>
              <button
                type="button"
                onClick={addDeliveryStop}
                className="text-xs font-bold text-violet-800 hover:text-violet-950 inline-flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> + Adicionar Outra Entrega
              </button>
            </div>

            {deliveryStops.map((stop, index) => (
              <div
                key={index}
                className="p-4 bg-white border border-slate-200 rounded-lg space-y-3 relative group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-violet-900 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-violet-600 text-white font-bold flex items-center justify-center text-[10px]">
                      {index + 1}
                    </span>
                    Entrega #{index + 1} *
                  </span>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <span>Atendimento:</span>
                      <input
                        type="number"
                        min="0"
                        value={stop.service_time_minutes}
                        onChange={(e) =>
                          updateDeliveryStop(
                            index,
                            'service_time_minutes',
                            parseInt(e.target.value, 10) || 0
                          )
                        }
                        className="w-14 px-1.5 py-0.5 bg-slate-50 border border-slate-300 rounded text-center text-xs tabular-nums"
                      />
                      <span>min</span>
                    </div>

                    {deliveryStops.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeDeliveryStop(index)}
                        className="text-rose-600 hover:text-rose-800 text-xs p-1"
                        title="Remover esta parada"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">Empresa / Destinatário</label>
                    <input
                      type="text"
                      value={stop.company_name}
                      onChange={(e) => updateDeliveryStop(index, 'company_name', e.target.value)}
                      placeholder="Ex: Gráfica Alphagraphics"
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-md text-slate-900"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">
                      Endereço Completo de Entrega *
                    </label>
                    <input
                      type="text"
                      required
                      value={stop.address_full}
                      onChange={(e) => updateDeliveryStop(index, 'address_full', e.target.value)}
                      placeholder="Ex: Rua Funchal, Vila Olímpia, São Paulo - SP"
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-md text-slate-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">Número</label>
                    <input
                      type="text"
                      value={stop.number}
                      onChange={(e) => updateDeliveryStop(index, 'number', e.target.value)}
                      placeholder="418"
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-md text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">Complemento</label>
                    <input
                      type="text"
                      value={stop.complement}
                      onChange={(e) => updateDeliveryStop(index, 'complement', e.target.value)}
                      placeholder="4º andar"
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-md text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">Contato no Local</label>
                    <input
                      type="text"
                      value={stop.contact_name}
                      onChange={(e) => updateDeliveryStop(index, 'contact_name', e.target.value)}
                      placeholder="Nome de quem recebe"
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-md text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">Telefone Contato</label>
                    <input
                      type="text"
                      value={stop.contact_phone}
                      onChange={(e) => updateDeliveryStop(index, 'contact_phone', e.target.value)}
                      placeholder="(11) 99887-6655"
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-md text-slate-900 tabular-nums"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 mb-1 text-xs">
                    Instruções Específicas para esta Entrega
                  </label>
                  <input
                    type="text"
                    value={stop.access_notes}
                    onChange={(e) => updateDeliveryStop(index, 'access_notes', e.target.value)}
                    placeholder="Ex: Entregar apenas em mãos do destinatário e colher assinatura"
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-md text-slate-900 text-xs"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Visualizador do Mapa e Estatísticas do Trajeto */}
          <RouteMapVisualizer
            pickup={pickupStop}
            deliveries={deliveryStops}
            vehicleType={activeVehicleType}
            routeData={routeData}
            isLoading={isCalculatingRoute}
          />
        </section>

        {/* =========================================================================
            BLOCO 3: RESPONSÁVEL E VALORES
        ========================================================================= */}
        <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="pb-3 border-b border-slate-100">
            <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-violet-100 text-violet-800 flex items-center justify-center text-xs font-black">
                3
              </span>
              Responsável e Valores Financeiros
            </h2>
            <p className="text-xs text-slate-500">
              Atribua o motorista e informe os valores acordados para cálculo da margem da operação
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Seleção de Motorista */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Motorista Atribuído
              </label>
              <select
                value={driverId}
                onChange={(e) => setDriverId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-violet-800"
              >
                <option value="">A definir (Salvar sem motorista)</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.phone}) - {d.vehicle_type.toUpperCase()}
                  </option>
                ))}
              </select>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Pode ser atribuído posteriormente na listagem.
              </span>
            </div>

            {/* Valor Cliente */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Valor Cobrado do Cliente (R$)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">R$</span>
                <input
                  type="text"
                  value={priceClientInput}
                  onChange={(e) => setPriceClientInput(e.target.value)}
                  placeholder="0,00"
                  className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-violet-800"
                />
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Valor não preenchido constará como "A definir".
              </span>
            </div>

            {/* Valor Motorista */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Valor Repassado ao Motorista (R$)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">R$</span>
                <input
                  type="text"
                  value={priceDriverInput}
                  onChange={(e) => setPriceDriverInput(e.target.value)}
                  placeholder="0,00"
                  className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-violet-800"
                />
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Aceita vírgula decimal (ex: 45,50).
              </span>
            </div>
          </div>

          {/* Cálculo Automático da Diferença / Margem */}
          <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                Margem Líquida da Operação (Diferença)
              </span>
              <p className="text-[11px] text-slate-500">Valor Cliente − Valor Motorista</p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-violet-900 tabular-nums">
                {formatBRL(marginCents)}
              </span>
            </div>
          </div>
        </section>

        {/* Barra de Ações Inferior com Prevenção de Duplo Clique */}
        <div className="flex items-center justify-between pt-2">
          <Link
            to="/"
            className="px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Cancelar e Voltar
          </Link>

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-extrabold text-white bg-violet-800 hover:bg-violet-900 rounded-lg shadow-sm transition-all focus:ring-2 focus:ring-violet-800 focus:ring-offset-2 disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-4 h-4 text-amber-400" />
            {isSubmitting
              ? 'Gravando Solicitação...'
              : isEditing
              ? 'Atualizar Solicitação'
              : 'Concluir e Lançar OS'}
          </button>
        </div>
      </form>

      {/* Modal de Cadastro Rápido de Cliente */}
      <QuickClientModal
        isOpen={isQuickClientOpen}
        onClose={() => setIsQuickClientOpen(false)}
        onClientCreated={(newCli) => {
          setClients((prev) => [...prev, newCli]);
          handleClientSelect(newCli.id);
        }}
      />
    </div>
  );
};
