import type { Request, Response } from 'express';

interface StopInput {
  address: string;
  lat?: number;
  lng?: number;
  serviceTimeMinutes?: number;
}

interface ComputeRouteRequestBody {
  origin: StopInput;
  destinations: StopInput[];
  vehicleType: 'motoboy' | 'utilitario' | 'passeio';
  deliveryType?: 'IMEDIATO' | 'AGD';
  scheduledAt?: string;
}

// Cálculo geodésico de fallback (Haversine com fator urbano 1.35) quando chave Google Routes não estiver presente
function calculateApproximation(origin: StopInput, destinations: StopInput[], vehicleType: string) {
  let totalDistanceMeters = 0;
  let totalDurationSeconds = 0;
  const legs = [];

  const points: { lat: number; lng: number }[] = [];
  if (origin.lat && origin.lng) {
    points.push({ lat: origin.lat, lng: origin.lng });
  } else {
    points.push({ lat: -23.5505, lng: -46.6333 }); // Marco Zero Sé SP default
  }

  for (const dest of destinations) {
    if (dest.lat && dest.lng) {
      points.push({ lat: dest.lat, lng: dest.lng });
    } else {
      // Offset aproximado se não tiver lat/lng precisa
      const prev = points[points.length - 1];
      points.push({ lat: prev.lat + 0.035, lng: prev.lng + 0.025 });
    }
  }

  // Fator de velocidade média urbana SP:
  // Moto: ~28 km/h (7.77 m/s)
  // Carro/Utilitário: ~21 km/h (5.83 m/s)
  const speedMetersPerSecond = vehicleType === 'motoboy' ? 7.8 : 5.8;

  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];

    const R = 6371e3; // metros
    const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
    const dLon = ((p2.lng - p1.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((p1.lat * Math.PI) / 180) *
        Math.cos((p2.lat * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const straightDistance = R * c;

    // Fator de sinuosidade urbana de malha viária brasileira: 1.35x
    const legDistanceMeters = Math.max(1000, Math.round(straightDistance * 1.38));
    const legDurationSeconds = Math.round(legDistanceMeters / speedMetersPerSecond);

    totalDistanceMeters += legDistanceMeters;
    totalDurationSeconds += legDurationSeconds;

    legs.push({
      distanceMeters: legDistanceMeters,
      durationSeconds: legDurationSeconds,
      startLocation: p1,
      endLocation: p2,
    });
  }

  return {
    distanceMeters: totalDistanceMeters,
    durationSeconds: totalDurationSeconds,
    legs,
    modeUsed: vehicleType === 'motoboy' ? 'TWO_WHEELER' : 'DRIVE',
    isTwoWheelerBetaWarning: vehicleType === 'motoboy',
    fallbackUsed: true,
    computedAt: new Date().toISOString(),
  };
}

export async function computeRouteHandler(req: Request, res: Response) {
  try {
    const body: ComputeRouteRequestBody = req.body;
    const { origin, destinations, vehicleType, deliveryType, scheduledAt } = body;

    if (!origin || !destinations || destinations.length === 0) {
      return res.status(400).json({
        error: 'É obrigatório informar ponto de coleta (origem) e ao menos um destino.',
      });
    }

    const apiKey = process.env.GOOGLE_MAPS_SERVER_KEY;

    // Se a chave não estiver configurada no servidor, usa o fallback de coordenadas
    if (!apiKey || apiKey.startsWith('AIzaSy_EXEMPLO') || apiKey.length < 20) {
      const approx = calculateApproximation(origin, destinations, vehicleType);
      return res.status(200).json({
        ...approx,
        warning: 'Google Maps Routes API não configurada. Estimativa preliminar calculada via malha urbana.',
      });
    }

    // Monta a chamada para a Google Maps Routes API (POST computeRoutes)
    const travelMode = vehicleType === 'motoboy' ? 'TWO_WHEELER' : 'DRIVE';
    const finalDest = destinations[destinations.length - 1];
    const intermediates = destinations.slice(0, -1);

    const formatWaypoint = (stop: StopInput) => {
      if (stop.lat && stop.lng) {
        return {
          location: {
            latLng: {
              latitude: Number(stop.lat),
              longitude: Number(stop.lng),
            },
          },
        };
      }
      return {
        address: stop.address,
      };
    };

    const routesPayload: Record<string, any> = {
      origin: formatWaypoint(origin),
      destination: formatWaypoint(finalDest),
      travelMode: travelMode,
      languageCode: 'pt-BR',
      units: 'METRIC',
    };

    if (intermediates.length > 0) {
      routesPayload.intermediates = intermediates.map((stop) => formatWaypoint(stop));
    }

    // Configuração de trânsito em tempo real
    if (travelMode === 'DRIVE') {
      routesPayload.routingPreference = 'TRAFFIC_AWARE_OPTIMAL';
      if (deliveryType === 'AGD' && scheduledAt) {
        const schedDate = new Date(scheduledAt);
        if (schedDate.getTime() > Date.now()) {
          routesPayload.departureTime = schedDate.toISOString();
        }
      }
    }

    const googleApiUrl = 'https://routes.googleapis.com/directions/v2:computeRoutes';
    const fieldMask =
      'routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline,routes.legs';

    const response = await fetch(googleApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': fieldMask,
      },
      body: JSON.stringify(routesPayload),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.warn('Google Routes API retornou erro:', response.status, errText);

      // Se TWO_WHEELER falhar por região não suportada, tenta com DRIVE como especificado
      if (travelMode === 'TWO_WHEELER') {
        const driveFallbackPayload = { ...routesPayload, travelMode: 'DRIVE', routingPreference: 'TRAFFIC_AWARE_OPTIMAL' };
        const driveResp = await fetch(googleApiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask': fieldMask,
          },
          body: JSON.stringify(driveFallbackPayload),
        });

        if (driveResp.ok) {
          const driveData = await driveResp.json();
          const route = driveData.routes?.[0];
          if (route) {
            const durationSec = parseInt(route.duration?.replace('s', '') || '0', 10);
            return res.status(200).json({
              distanceMeters: route.distanceMeters || 0,
              durationSeconds: durationSec,
              polyline: route.polyline?.encodedPolyline,
              legs: route.legs || [],
              modeUsed: 'DRIVE',
              isTwoWheelerBetaWarning: false,
              fallbackUsed: false,
              warning: 'Modo TWO_WHEELER indisponível nesta região. Estimativa calculada em modo DRIVE.',
              computedAt: new Date().toISOString(),
            });
          }
        }
      }

      // Se persistir erro, fallback aproximado com aviso claro
      const approx = calculateApproximation(origin, destinations, vehicleType);
      return res.status(200).json({
        ...approx,
        warning: `Falha na Google Routes API (${response.status}). Estimativa aproximada utilizada.`,
      });
    }

    const data = await response.json();
    const route = data.routes?.[0];

    if (!route) {
      const approx = calculateApproximation(origin, destinations, vehicleType);
      return res.status(200).json({
        ...approx,
        warning: 'Nenhuma rota retornada pelo Google Maps. Estimativa calculada por coordenadas.',
      });
    }

    const durationSec = parseInt(route.duration?.replace('s', '') || '0', 10);

    return res.status(200).json({
      distanceMeters: route.distanceMeters || 0,
      durationSeconds: durationSec,
      polyline: route.polyline?.encodedPolyline,
      legs: (route.legs || []).map((l: any) => ({
        distanceMeters: l.distanceMeters,
        durationSeconds: parseInt(l.duration?.replace('s', '') || '0', 10),
        startLocation: l.startLocation?.latLng
          ? { lat: l.startLocation.latLng.latitude, lng: l.startLocation.latLng.longitude }
          : undefined,
        endLocation: l.endLocation?.latLng
          ? { lat: l.endLocation.latLng.latitude, lng: l.endLocation.latLng.longitude }
          : undefined,
      })),
      modeUsed: travelMode,
      isTwoWheelerBetaWarning: travelMode === 'TWO_WHEELER',
      fallbackUsed: false,
      computedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Erro no cálculo de rota:', error);
    return res.status(500).json({
      error: 'Erro interno ao processar cálculo de rota.',
      message: error?.message,
    });
  }
}
