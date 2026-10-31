import { ServiceRequest } from '../types';
import {
  CATEGORY_LABELS,
  formatBRL,
  formatDateTime,
  formatDuration,
  formatKilometers,
  STATUS_LABELS,
} from './formatters';

/**
 * Higieniza o valor da célula para prevenir injeção de fórmulas no Excel/Calc
 * Se o texto começar com '=', '+', '-', '@', prefixa com apóstrofo (')
 */
export function sanitizeCSVCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '""';
  const stringVal = String(value);

  // Verifica caracteres perigosos de injeção de fórmula
  const dangerousChars = ['=', '+', '-', '@', '\t', '\r'];
  let safeVal = stringVal;
  if (dangerousChars.some((char) => safeVal.startsWith(char))) {
    safeVal = `'${safeVal}`;
  }

  // Escapa aspas duplas internas duplicando-as
  const escaped = safeVal.replace(/"/g, '""');
  return `"${escaped}"`;
}

/**
 * Exporta lista de solicitações filtradas para formato CSV compatível com Excel brasileiro
 */
export function exportRequestsToCSV(requests: ServiceRequest[], filenamePrefix = 'solicitacoes_ibec'): void {
  const headers = [
    'Número da OS',
    'Data e Horário',
    'Cliente',
    'Serviço',
    'Coleta',
    'Entregas',
    'KM Estimados',
    'Tempo Estimado',
    'Tempo Total Operacional',
    'Motorista',
    'Status',
    'Valor Cliente (R$)',
    'Valor Motorista (R$)',
    'Diferença (R$)',
    'Nosso Pedido / KURZ',
    'Solicitante',
    'Telefone Solicitante',
  ];

  const rows = requests.map((req) => {
    const pickupStop = req.stops?.find((s) => s.stop_type === 'PICKUP');
    const deliveryStops = req.stops?.filter((s) => s.stop_type === 'DELIVERY') || [];
    const pickupDesc = pickupStop
      ? `${pickupStop.company_name ? pickupStop.company_name + ' - ' : ''}${pickupStop.address_full}, ${pickupStop.number}`
      : 'Não informada';
    const deliveryDesc = deliveryStops.length > 0
      ? deliveryStops.map((d, idx) => `[${idx + 1}] ${d.address_full}, ${d.number}`).join(' | ')
      : 'Não informada';

    return [
      sanitizeCSVCell(req.order_number),
      sanitizeCSVCell(formatDateTime(req.created_at)),
      sanitizeCSVCell(req.client?.trade_name || req.client?.corporate_name || 'Cliente N/A'),
      sanitizeCSVCell(CATEGORY_LABELS[req.category] || req.category),
      sanitizeCSVCell(pickupDesc),
      sanitizeCSVCell(deliveryDesc),
      sanitizeCSVCell(formatKilometers(req.distance_meters)),
      sanitizeCSVCell(formatDuration(req.duration_seconds)),
      sanitizeCSVCell(formatDuration(req.operational_duration_seconds || req.duration_seconds)),
      sanitizeCSVCell(req.driver?.name || 'Não atribuído'),
      sanitizeCSVCell(STATUS_LABELS[req.status] || req.status),
      sanitizeCSVCell(formatBRL(req.price_client_cents)),
      sanitizeCSVCell(formatBRL(req.price_driver_cents)),
      sanitizeCSVCell(formatBRL(req.margin_cents)),
      sanitizeCSVCell(req.kurz_order || '-'),
      sanitizeCSVCell(req.requester_name),
      sanitizeCSVCell(req.requester_phone),
    ].join(';');
  });

  // UTF-8 BOM (\uFEFF) para garantir acentuação correta no Excel brasileiro
  const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const timestamp = new Date().toISOString().slice(0, 10);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filenamePrefix}_${timestamp}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
