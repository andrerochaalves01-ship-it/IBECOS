import { ComputeRouteResponse, RequestStop, VehicleType } from '../types';

export interface RouteCalculationParams {
  pickup: RequestStop;
  deliveries: RequestStop[];
  vehicleType: VehicleType;
  deliveryType: 'IMEDIATO' | 'AGD';
  scheduledAt?: string;
}

export async function calculateRoute(params: RouteCalculationParams): Promise<ComputeRouteResponse> {
  const { pickup, deliveries, vehicleType, deliveryType, scheduledAt } = params;

  if (!pickup.address_full.trim()) {
    throw new Error('Endereço de coleta é obrigatório para calcular a rota.');
  }

  const validDeliveries = deliveries.filter((d) => d.address_full.trim().length > 0);
  if (validDeliveries.length === 0) {
    throw new Error('Adicione ao menos um endereço de entrega válido.');
  }

  const payload = {
    origin: {
      address: `${pickup.address_full}${pickup.number ? ', ' + pickup.number : ''}`,
      lat: pickup.lat,
      lng: pickup.lng,
      serviceTimeMinutes: pickup.service_time_minutes || 5,
    },
    destinations: validDeliveries.map((del) => ({
      address: `${del.address_full}${del.number ? ', ' + del.number : ''}`,
      lat: del.lat,
      lng: del.lng,
      serviceTimeMinutes: del.service_time_minutes || 5,
    })),
    vehicleType,
    deliveryType,
    scheduledAt,
  };

  const response = await fetch('/api/routes/compute', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorJson = await response.json().catch(() => ({}));
    throw new Error(errorJson.error || 'Não foi possível calcular a rota com o servidor.');
  }

  return response.json();
}
