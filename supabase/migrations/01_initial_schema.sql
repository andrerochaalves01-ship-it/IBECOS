-- ==============================================================================
-- IBEC EXPRESS | CENTRAL DE SOLICITAÇÕES
-- Migração Inicial: Esquema de Banco de Dados, Índices, Gatilhos e Regras RLS
-- ==============================================================================

-- 1. Extensões Necessárias
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Tabela de Perfis de Usuários (Integrada ao Supabase Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'operacional')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Tabela de Clientes
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  corporate_name TEXT NOT NULL,
  trade_name TEXT,
  document TEXT,
  contact_name TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Tabela de Motoristas
CREATE TABLE IF NOT EXISTS public.drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  vehicle_type TEXT NOT NULL CHECK (vehicle_type IN ('motoboy', 'utilitario', 'passeio')),
  plate TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Sequência Atômica e Função para Geração de Número de OS
CREATE SEQUENCE IF NOT EXISTS public.order_number_seq START WITH 1;

CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TRIGGER AS $$
DECLARE
  current_year TEXT;
  next_val BIGINT;
BEGIN
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    current_year := TO_CHAR(CURRENT_DATE, 'YYYY');
    next_val := nextval('public.order_number_seq');
    NEW.order_number := 'OS-' || current_year || '-' || LPAD(next_val::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Tabela Principal de Solicitações de Serviço
CREATE TABLE IF NOT EXISTS public.service_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  requester_name TEXT NOT NULL,
  requester_phone TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('motoboy', 'utilitario', 'passeio', 'press_kit')),
  delivery_type TEXT NOT NULL CHECK (delivery_type IN ('IMEDIATO', 'AGD')),
  scheduled_at TIMESTAMPTZ,
  kurz_order TEXT,
  cost_center TEXT,
  description TEXT,
  notes TEXT,
  press_kit_info JSONB, -- { vehicle_type, kit_quantity, campaign_name, special_care }
  driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'NOVA' CHECK (status IN ('NOVA', 'ATRIBUIDA', 'EM_COLETA', 'EM_TRANSPORTE', 'FINALIZADA', 'CANCELADA')),
  cancel_reason TEXT,
  distance_meters INTEGER DEFAULT 0,
  duration_seconds INTEGER DEFAULT 0,
  operational_duration_seconds INTEGER DEFAULT 0,
  route_polyline TEXT,
  price_client_cents INTEGER, -- Centavos inteiros (ex: R$ 50,00 = 5000)
  price_driver_cents INTEGER, -- Centavos inteiros
  margin_cents INTEGER GENERATED ALWAYS AS (COALESCE(price_client_cents, 0) - COALESCE(price_driver_cents, 0)) STORED,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_scheduled_when_agd CHECK (delivery_type = 'IMEDIATO' OR scheduled_at IS NOT NULL),
  CONSTRAINT chk_driver_when_assigned CHECK (status != 'ATRIBUIDA' OR driver_id IS NOT NULL),
  CONSTRAINT chk_cancel_reason CHECK (status != 'CANCELADA' OR (cancel_reason IS NOT NULL AND length(trim(cancel_reason)) > 0))
);

-- Gatilho para gerar OS sequencial antes de inserir
CREATE OR REPLACE TRIGGER trg_generate_order_number
BEFORE INSERT ON public.service_requests
FOR EACH ROW
EXECUTE FUNCTION public.generate_order_number();

-- 7. Tabela de Paradas da Solicitação (Coleta e Entregas em Ordem)
CREATE TABLE IF NOT EXISTS public.request_stops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.service_requests(id) ON DELETE CASCADE,
  stop_type TEXT NOT NULL CHECK (stop_type IN ('PICKUP', 'DELIVERY')),
  sequence_order INTEGER NOT NULL,
  company_name TEXT,
  address_full TEXT NOT NULL,
  number TEXT,
  complement TEXT,
  contact_name TEXT,
  contact_phone TEXT,
  access_notes TEXT,
  lat NUMERIC(10, 7),
  lng NUMERIC(10, 7),
  service_time_minutes INTEGER NOT NULL DEFAULT 5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Tabela de Histórico de Mudança de Status
CREATE TABLE IF NOT EXISTS public.request_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.service_requests(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  reason TEXT,
  changed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Gatilho de Updated_At Automático
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE OR REPLACE TRIGGER trg_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE OR REPLACE TRIGGER trg_drivers_updated_at BEFORE UPDATE ON public.drivers FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE OR REPLACE TRIGGER trg_service_requests_updated_at BEFORE UPDATE ON public.service_requests FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 10. Índices para Otimização de Consultas e Filtros
CREATE INDEX IF NOT EXISTS idx_requests_status ON public.service_requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_client ON public.service_requests(client_id);
CREATE INDEX IF NOT EXISTS idx_requests_driver ON public.service_requests(driver_id);
CREATE INDEX IF NOT EXISTS idx_requests_created_at ON public.service_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_requests_order_number ON public.service_requests(order_number);
CREATE INDEX IF NOT EXISTS idx_requests_kurz ON public.service_requests(kurz_order);
CREATE INDEX IF NOT EXISTS idx_stops_request_id ON public.request_stops(request_id, sequence_order);
CREATE INDEX IF NOT EXISTS idx_history_request_id ON public.request_status_history(request_id, created_at DESC);

-- ==============================================================================
-- 11. Segurança: Row Level Security (RLS)
-- ==============================================================================

-- Funções utilitárias de segurança sem recursão
CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS TEXT STABLE SECURITY DEFINER AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() AND is_active = true;
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION public.is_active_operator()
RETURNS BOOLEAN STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_active = true
  );
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin' AND is_active = true
  );
$$ LANGUAGE sql;

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.request_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.request_status_history ENABLE ROW LEVEL SECURITY;

-- Políticas para 'profiles'
CREATE POLICY "Usuários autenticados podem ver perfis ativos"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (is_active_operator());

CREATE POLICY "Somente administradores podem criar ou alterar perfis"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Somente administradores podem atualizar perfis"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Políticas para 'clients'
CREATE POLICY "Operadores ativos podem consultar clientes"
  ON public.clients FOR SELECT
  TO authenticated
  USING (is_active_operator());

CREATE POLICY "Operadores ativos podem cadastrar ou atualizar clientes"
  ON public.clients FOR ALL
  TO authenticated
  USING (is_active_operator())
  WITH CHECK (is_active_operator());

-- Políticas para 'drivers'
CREATE POLICY "Operadores ativos podem consultar motoristas"
  ON public.drivers FOR SELECT
  TO authenticated
  USING (is_active_operator());

CREATE POLICY "Operadores ativos podem cadastrar ou atualizar motoristas"
  ON public.drivers FOR ALL
  TO authenticated
  USING (is_active_operator())
  WITH CHECK (is_active_operator());

-- Políticas para 'service_requests'
CREATE POLICY "Operadores ativos podem consultar solicitações"
  ON public.service_requests FOR SELECT
  TO authenticated
  USING (is_active_operator());

CREATE POLICY "Operadores ativos podem criar solicitações"
  ON public.service_requests FOR INSERT
  TO authenticated
  WITH CHECK (is_active_operator());

CREATE POLICY "Operadores ativos podem atualizar solicitações"
  ON public.service_requests FOR UPDATE
  TO authenticated
  USING (is_active_operator())
  WITH CHECK (is_active_operator());

-- Políticas para 'request_stops'
CREATE POLICY "Operadores ativos podem acessar e gerenciar paradas"
  ON public.request_stops FOR ALL
  TO authenticated
  USING (is_active_operator())
  WITH CHECK (is_active_operator());

-- Políticas para 'request_status_history'
CREATE POLICY "Operadores ativos podem ler histórico de status"
  ON public.request_status_history FOR SELECT
  TO authenticated
  USING (is_active_operator());

CREATE POLICY "Operadores ativos podem inserir registros no histórico"
  ON public.request_status_history FOR INSERT
  TO authenticated
  WITH CHECK (is_active_operator());
