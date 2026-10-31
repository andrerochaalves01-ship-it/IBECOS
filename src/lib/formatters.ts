import { RequestStatus, ServiceCategory, VehicleType } from '../types';

/**
 * Converte valor em centavos inteiros para formato monetário BRL (ex: 4550 -> "R$ 45,50")
 * Se for nulo ou indefinido, retorna "A definir" sem confundir com zero.
 */
export function formatBRL(cents?: number | null): string {
  if (cents === null || cents === undefined) {
    return 'A definir';
  }
  const reais = cents / 100;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(reais);
}

/**
 * Converte texto digitado pelo usuário (com vírgula ou ponto) para centavos inteiros
 * Ex: "45,50" -> 4550; "1.250,00" -> 125000; "" -> undefined
 */
export function parseBRLInputToCents(val?: string | number): number | undefined {
  if (val === undefined || val === null || val === '') return undefined;
  if (typeof val === 'number') return Math.round(val);

  // Remove espaços e símbolo R$
  const cleaned = val.replace(/R\$\s?/, '').trim();
  if (!cleaned) return undefined;

  // Trata separador de milhar e decimal
  // Se tem vírgula, os pontos anteriores são milhares
  let normalized = cleaned;
  if (normalized.includes(',')) {
    normalized = normalized.replace(/\./g, '').replace(',', '.');
  }
  const floatVal = parseFloat(normalized);
  if (isNaN(floatVal)) return undefined;

  return Math.round(floatVal * 100);
}

/**
 * Converte centavos para string no input decimal (ex: 4550 -> "45,50")
 */
export function centsToInputValue(cents?: number | null): string {
  if (cents === null || cents === undefined) return '';
  return (cents / 100).toFixed(2).replace('.', ',');
}

/**
 * Formata distância em metros para quilômetros com uma casa decimal (ex: 12400 -> "12,4 km")
 */
export function formatKilometers(meters?: number | null): string {
  if (meters === null || meters === undefined || meters <= 0) {
    return '0,0 km';
  }
  const km = meters / 1000;
  return `${km.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km`;
}

/**
 * Formata duração em segundos para horas e minutos em pt-BR (ex: 4500s -> "1h 15min")
 */
export function formatDuration(seconds?: number | null): string {
  if (!seconds || seconds <= 0) return '0 min';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes.toString().padStart(2, '0')}min`;
  }
  return `${minutes} min`;
}

/**
 * Formata data e hora para fuso horário America/Sao_Paulo
 */
export function formatDateTime(isoString?: string | null): string {
  if (!isoString) return '-';
  try {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return isoString;
  }
}

/**
 * Formata apenas data para visualização
 */
export function formatDateOnly(isoString?: string | null): string {
  if (!isoString) return '-';
  try {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  } catch {
    return isoString;
  }
}

export const STATUS_LABELS: Record<RequestStatus, string> = {
  NOVA: 'Nova',
  ATRIBUIDA: 'Atribuída',
  EM_COLETA: 'Em coleta',
  EM_TRANSPORTE: 'Em transporte',
  FINALIZADA: 'Finalizada',
  CANCELADA: 'Cancelada',
};

export const CATEGORY_LABELS: Record<ServiceCategory, string> = {
  motoboy: 'Motoboy',
  utilitario: 'Carro Utilitário',
  passeio: 'Carro de Passeio',
  press_kit: 'Press Kit',
};

export const VEHICLE_LABELS: Record<VehicleType, string> = {
  motoboy: 'Moto',
  utilitario: 'Utilitário',
  passeio: 'Passeio',
};
