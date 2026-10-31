export type ServiceCategory = 'motoboy' | 'utilitario' | 'passeio' | 'press_kit';
export type DeliveryType = 'IMEDIATO' | 'AGD';
export type RequestStatus = 'NOVA' | 'ATRIBUIDA' | 'EM_COLETA' | 'EM_TRANSPORTE' | 'FINALIZADA' | 'CANCELADA';
export type VehicleType = 'motoboy' | 'utilitario' | 'passeio';
export type UserRole = 'admin' | 'operacional';
export type StopType = 'PICKUP' | 'DELIVERY';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface Client {
  id: string;
  corporate_name: string;
  trade_name?: string;
  document?: string;
  contact_name?: string;
  phone?: string;
  email?: string;
  address?: string;
  is_active: boolean;
  created_at?: string;
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  vehicle_type: VehicleType;
  plate?: string;
  is_active: boolean;
  created_at?: string;
}

export interface RequestStop {
  id?: string;
  request_id?: string;
  stop_type: StopType;
  sequence_order: number;
  company_name: string;
  address_full: string;
  number: string;
  complement?: string;
  contact_name: string;
  contact_phone: string;
  access_notes?: string;
  lat?: number;
  lng?: number;
  service_time_minutes: number;
}

export interface PressKitDetails {
  vehicle_type: VehicleType;
  kit_quantity: number;
  campaign_name: string;
  special_care?: string;
}

export interface ServiceRequest {
  id: string;
  order_number: string;
  client_id: string;
  client?: Client;
  requester_name: string;
  requester_phone: string;
  category: ServiceCategory;
  delivery_type: DeliveryType;
  scheduled_at?: string;
  kurz_order?: string;
  cost_center?: string;
  description: string;
  notes?: string;
  press_kit_info?: PressKitDetails;
  driver_id?: string;
  driver?: Driver;
  status: RequestStatus;
  cancel_reason?: string;
  distance_meters?: number;
  duration_seconds?: number;
  operational_duration_seconds?: number;
  route_polyline?: string;
  price_client_cents?: number; // centavos inteiros (ex: R$ 45,00 = 4500)
  price_driver_cents?: number; // centavos inteiros
  margin_cents?: number; // price_client_cents - price_driver_cents
  stops?: RequestStop[];
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface RequestStatusHistory {
  id: string;
  request_id: string;
  from_status?: RequestStatus;
  to_status: RequestStatus;
  reason?: string;
  changed_by?: string;
  author_name?: string;
  created_at: string;
}

export interface RouteLeg {
  distanceMeters: number;
  durationSeconds: number;
  startLocation: { lat: number; lng: number };
  endLocation: { lat: number; lng: number };
}

export interface ComputeRouteResponse {
  distanceMeters: number;
  durationSeconds: number;
  polyline?: string;
  legs: RouteLeg[];
  modeUsed: 'TWO_WHEELER' | 'DRIVE';
  isTwoWheelerBetaWarning?: boolean;
  fallbackUsed?: boolean;
  computedAt: string;
}

export interface FilterState {
  period: 'all' | 'today' | 'week' | 'month' | 'custom';
  startDate?: string;
  endDate?: string;
  clientId: string;
  category: string;
  driverId: string;
  status: string;
  searchQuery: string;
}
