import React, { useMemo } from 'react';
import {
  MapPin,
  Clock,
  Navigation,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';
import { ComputeRouteResponse, RequestStop, VehicleType } from '../types';
import { formatDateTime, formatDuration, formatKilometers } from '../lib/formatters';

interface RouteMapVisualizerProps {
  pickup: RequestStop;
  deliveries: RequestStop[];
  vehicleType: VehicleType;
  routeData?: ComputeRouteResponse | null;
  isLoading?: boolean;
}

const mapsApiKey =
  import.meta.env.VITE_GOOGLE_MAPS_BROWSER_KEY ||
  import.meta.env.VITE_GOOGLE_MAPS_API_KEY ||
  '';

export const RouteMapVisualizer: React.FC<RouteMapVisualizerProps> = ({
  pickup,
  deliveries,
  vehicleType,
  routeData,
  isLoading,
}) => {
  const validDeliveries = deliveries.filter((d) => d.address_full.trim().length > 0);
  const totalStops = 1 + validDeliveries.length;

  // Calcula tempo total operacional: tempo de deslocamento + tempo de atendimento
  const totalServiceTimeMinutes =
    (pickup.service_time_minutes || 5) +
    validDeliveries.reduce((acc, curr) => acc + (curr.service_time_minutes || 5), 0);
  const serviceTimeSeconds = totalServiceTimeMinutes * 60;

  const displacementSeconds = routeData?.durationSeconds || 0;
  const operationalTotalSeconds = displacementSeconds + serviceTimeSeconds;

  // Previsão de chegada estimada
  const estimatedArrival = new Date(Date.now() + operationalTotalSeconds * 1000);

  // Centro inicial do mapa (São Paulo por padrão ou coordenada da coleta)
  const mapCenter = useMemo(() => {
    if (pickup.lat && pickup.lng) {
      return { lat: Number(pickup.lat), lng: Number(pickup.lng) };
    }
    return { lat: -23.5505, lng: -46.6333 }; // São Paulo SP
  }, [pickup.lat, pickup.lng]);

  const hasApiKey = Boolean(mapsApiKey && mapsApiKey.startsWith('AIzaSy'));

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Navigation className="w-5 h-5 text-violet-800" />
            Roteirização e Mapa do Trajeto
          </h3>
          <p className="text-xs text-slate-500">
            Cálculo online de rota ponto a ponto via Google Maps Routes API
          </p>
        </div>
        {routeData && (
          <span className="text-xs text-slate-500 tabular-nums">
            Consulta: {formatDateTime(routeData.computedAt)}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="py-12 flex flex-col items-center justify-center text-slate-500 space-y-3 bg-slate-50 rounded border border-dashed border-slate-200">
          <div className="w-8 h-8 border-3 border-violet-800 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium">Calculando rota e condições de trânsito...</p>
        </div>
      ) : !routeData ? (
        <div className="py-10 text-center text-slate-500 bg-slate-50 rounded border border-dashed border-slate-200 px-4">
          <MapPin className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-medium text-slate-700">Aguardando dados de endereço</p>
          <p className="text-xs text-slate-400 mt-1">
            Preencha a coleta e ao menos uma entrega para calcular KM, tempo e trajeto.
          </p>
        </div>
      ) : (
        <>
          {/* Indicadores Principais de Rota */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-lg border border-slate-200">
            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Distância Total
              </span>
              <span className="text-xl font-extrabold text-violet-900 tabular-nums">
                {formatKilometers(routeData.distanceMeters)}
              </span>
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Tempo Deslocamento
              </span>
              <span className="text-xl font-extrabold text-slate-900 tabular-nums">
                {formatDuration(routeData.durationSeconds)}
              </span>
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Tempo Operacional Total
              </span>
              <span
                className="text-xl font-extrabold text-slate-900 tabular-nums"
                title={`Inclui ${totalServiceTimeMinutes} min de atendimento nas paradas`}
              >
                {formatDuration(operationalTotalSeconds)}
              </span>
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Previsão de Chegada
              </span>
              <span className="text-xl font-extrabold text-emerald-700 tabular-nums">
                {estimatedArrival.toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          </div>

          {/* Renderização do Mapa Google Interativo */}
          {hasApiKey && (
            <div className="rounded-lg overflow-hidden border border-slate-200 shadow-xs h-72 w-full relative">
              <Map
                mapId="DEMO_MAP_ID"
                defaultCenter={mapCenter}
                defaultZoom={12}
                gestureHandling="cooperative"
                disableDefaultUI={false}
                internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                className="w-full h-full"
              >
                {/* Marcador de Coleta */}
                {pickup.lat && pickup.lng && (
                  <AdvancedMarker
                    position={{ lat: Number(pickup.lat), lng: Number(pickup.lng) }}
                    title={`Coleta: ${pickup.company_name || pickup.address_full}`}
                  >
                    <Pin background="#FACC15" glyphColor="#000000" borderColor="#CA8A04">
                      C
                    </Pin>
                  </AdvancedMarker>
                )}

                {/* Marcadores de Entregas */}
                {validDeliveries.map(
                  (d, idx) =>
                    d.lat &&
                    d.lng && (
                      <AdvancedMarker
                        key={idx}
                        position={{ lat: Number(d.lat), lng: Number(d.lng) }}
                        title={`Entrega #${idx + 1}: ${d.company_name || d.address_full}`}
                      >
                        <Pin background="#7C3AED" glyphColor="#FFFFFF" borderColor="#5B21B6">
                          {idx + 1}
                        </Pin>
                      </AdvancedMarker>
                    )
                )}
              </Map>
            </div>
          )}

          {/* Esquema Visual Interativo de Paradas e Rota */}
          <div className="border border-slate-200 rounded-lg p-4 bg-slate-950 text-white relative overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs text-slate-400">
              <span className="font-semibold text-amber-400 flex items-center gap-1.5">
                <Navigation className="w-3.5 h-3.5 text-amber-400" />
                Trajeto Sequencial ({totalStops} paradas)
              </span>
              <span className="tabular-nums">
                Modo: <strong className="text-white">{routeData.modeUsed}</strong>
              </span>
            </div>

            <div className="py-4 space-y-4">
              {/* Ponto de Coleta */}
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-amber-400 text-slate-950 font-bold flex items-center justify-center text-xs shrink-0 shadow">
                  C
                </div>
                <div className="flex-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-400 uppercase text-[10px] tracking-wider">
                      Ponto de Coleta
                    </span>
                    <span className="text-slate-400 tabular-nums">
                      Atendimento: {pickup.service_time_minutes || 5} min
                    </span>
                  </div>
                  <p className="font-semibold text-white mt-0.5">
                    {pickup.company_name || 'Origem'}
                  </p>
                  <p className="text-slate-300">
                    {pickup.address_full} {pickup.number ? `, ${pickup.number}` : ''}
                  </p>
                </div>
              </div>

              {/* Linha conectora */}
              <div className="ml-3.5 pl-3 border-l-2 border-dashed border-violet-500/60 py-1 text-[11px] text-violet-300">
                Trecho de deslocamento
              </div>

              {/* Entregas Numeradas */}
              {validDeliveries.map((delivery, index) => (
                <React.Fragment key={index}>
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-violet-600 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow">
                      {index + 1}
                    </div>
                    <div className="flex-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-violet-300 uppercase text-[10px] tracking-wider">
                          Entrega #{index + 1}
                        </span>
                        <span className="text-slate-400 tabular-nums">
                          Atendimento: {delivery.service_time_minutes || 5} min
                        </span>
                      </div>
                      <p className="font-semibold text-white mt-0.5">
                        {delivery.company_name || `Destino ${index + 1}`}
                      </p>
                      <p className="text-slate-300">
                        {delivery.address_full} {delivery.number ? `, ${delivery.number}` : ''}
                      </p>
                      {delivery.contact_name && (
                        <p className="text-slate-400 text-[11px] mt-0.5">
                          Contato: {delivery.contact_name}{' '}
                          {delivery.contact_phone ? `(${delivery.contact_phone})` : ''}
                        </p>
                      )}
                    </div>
                  </div>

                  {index < validDeliveries.length - 1 && (
                    <div className="ml-3.5 pl-3 border-l-2 border-dashed border-violet-500/60 py-1 text-[11px] text-violet-300">
                      Próximo destino
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
              <span className="flex items-center gap-1 text-amber-400/90">
                <Info className="w-3.5 h-3.5 shrink-0" />
                Estimativa sujeita às condições de trânsito em tempo real.
              </span>
              {routeData.fallbackUsed && (
                <span className="text-amber-300 font-semibold">
                  (Cálculo aproximado da malha viária)
                </span>
              )}
            </div>
          </div>

          {/* Avisos Regulatórios e do Provedor Google Maps */}
          {routeData.isTwoWheelerBetaWarning && (
            <div className="bg-amber-50 border border-amber-200 rounded p-3 text-xs text-amber-900 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold">Aviso Google Maps (TWO_WHEELER em Beta):</strong>
                <p className="text-[11px] mt-0.5">
                  As rotas para motocicletas e veículos de duas rodas estão em versão Beta na Google
                  Maps Platform. Recomenda-se cautela ao piloto e observância estrita da
                  sinalização e trânsito local.
                </p>
              </div>
            </div>
          )}

          {routeData.modeUsed === 'DRIVE' && (
            <div className="bg-slate-50 border border-slate-200 rounded p-2.5 text-xs text-slate-600 flex items-start gap-2">
              <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
              <p className="text-[11px]">
                Aviso: A rota em modo DRIVE utiliza a rede viária padrão de automóveis e não
                considera restrições específicas de veículos pesados de carga (pontes baixas ou
                rodízios especiais).
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
};
