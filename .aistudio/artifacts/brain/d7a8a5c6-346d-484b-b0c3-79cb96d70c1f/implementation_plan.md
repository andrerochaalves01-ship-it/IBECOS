# IBEC Express | Central de Solicitações

Sistema web operacional completo para lançamento, cálculo de rotas e gestão do ciclo de vida de solicitações de transporte rápido (motoboy, carro utilitário, carro de passeio e press kit com múltiplas paradas), integrando Supabase PostgreSQL com Row Level Security (RLS) e Google Maps Routes API via backend seguro.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> **Decisões confirmadas na etapa de alinhamento interativo:**
> - **Arquitetura Base**: Vite SPA com React 19 + TypeScript e backend Node.js/Express estruturado com handlers compatíveis com Vercel Functions (`/api/*`).
> - **Ambiente sem Credenciais**: Enquanto as chaves do Supabase e Google Maps não forem configuradas no `.env`, a aplicação exibirá uma **Central de Configuração Pendente / Credenciais**, permitindo testar a interface de homologação ou conectar as chaves instantaneamente.
> - **Cálculo de Rotas**: Integração nativa com a Google Maps Routes API (`POST https://routes.googleapis.com/directions/v2:computeRoutes`) pelo backend com chave secreta restrita; quando as credenciais estiverem pendentes, o operador poderá gerar uma estimativa preliminar baseada em geocodificação/coordenadas e salvar como rascunho.

---

### 1. Overview & Core Concept

- **O que faz**: Plataforma ágil de despacho logístico que permite cadastrar solicitações imediatas ou agendadas, calcular KM e tempo em tempo real com regras específicas por veículo (moto TWO_WHEELER, utilitário DRIVE, passeio DRIVE e press kits com múltiplos destinos ordenáveis), gerenciar valores financeiros em centavos (cliente, motorista e margem) e acompanhar todo o histórico de status com auditoria completa.
- **Público-alvo**: Equipe operacional de logística e despacho interno, além de administradores de operação do IBEC Express.
- **Proposta de valor**: Rapidez no lançamento com busca preditiva de clientes e endereços (Google Places), cálculo de rota 100% no servidor (sem expor credenciais) e controle estrito de permissões (Administrador vs. Operacional).

---

### 2. User Experience & Visual Design

#### A. Identidade Visual e Paleta de Cores
- **Cor Primária**: Roxo institucional `#5B21B6` (Tailwind `violet-800`), transmitindo autoridade, tecnologia e modernidade.
- **Destaque / Ação**: Amarelo vibrante `#FACC15` (Tailwind `amber-400`/`yellow-400`) para badges de atenção, botões de ação e alertas de trânsito.
- **Fundo da Aplicação**: `#F8FAFC` (Tailwind `slate-50`), com cards em `#FFFFFF` e bordas discretas `border-slate-200`.
- **Tipografia**: Família moderna `Plus Jakarta Sans` para títulos e botões, combinada com `font-mono tabular-nums` para OS, quilometragem, tempo e valores financeiros em Real (BRL).
- **Zero-Pill Discipline**: Metadados estáticos renderizados com separadores tipográficos sutis (`·`), sem excesso de pílulas coloridas artificiais. Segmented controls e abas de filtro ativas tratadas como botões de alta ergonomia.

#### B. Fluxos Principais de Usuário
1. **Autenticação Segura**:
   - Tela de login com e-mail e senha pelo Supabase Auth.
   - Fluxo de recuperação de senha com link seguro.
   - Detecção de perfil (Admin ou Operacional) e proteção de rotas/menus.
2. **Painel de Solicitações (Página Inicial)**:
   - 4 Cartões de Indicadores: Total de solicitações, Aguardando, Em atendimento e Finalizadas.
   - Barra de filtros: Período, Cliente, Categoria do serviço, Motorista, Status e busca por OS ou pedido KURZ.
   - Tabela densa e responsiva (convertida para cards em visualização mobile).
   - Ações rápidas na linha: Visualizar detalhes, Editar, Duplicar com nova OS, Atualizar status modal e Cancelar com justificativa obrigatória.
   - Exportação para CSV higienizada contra injeção de fórmulas (`=`, `+`, `-`, `@`).
3. **Formulário de Nova Solicitação (3 Blocos Coesos)**:
   - **Bloco 1: Dados do Serviço**: Seleção/cadastro rápido de cliente, solicitante, contato, categoria (Motoboy, Utilitário, Passeio, Press Kit com veículo e campanha), tipo (Imediato vs. AGD com data/hora futura) e pedido KURZ.
   - **Bloco 2: Coleta, Entregas e Rota**: Endereço de coleta e lista dinâmica de entregas ordenáveis; campo de tempo de permanência por parada; mapa interativo e painel de rota com KM, tempo de deslocamento, tempo operacional total e previsão de chegada.
   - **Bloco 3: Motorista e Valores**: Atribuição opcional de motorista, valor cobrado do cliente, valor repassado ao motorista, cálculo instantâneo da margem de lucro com formatação BRL em centavos.

---

### 3. Key Product Decisions & Trade-Offs

1. **Backend com Handlers Vercel e Express Integrado**:
   - *Abordagem*: Implementar os endpoints em `/api/*` seguindo a assinatura de Request/Response de Serverless Functions (Vercel), integrados a um servidor Express local para desenvolvimento e preview direto no AI Studio.
   - *Por quê*: Permite execução idêntica no preview local (`npm run dev`) e deploy imediato na Vercel sem refatoração de código.
2. **Supabase PostgreSQL com RLS Completo**:
   - *Abordagem*: Scripts de migração SQL completos com extensão `pgcrypto`, tabelas relacionais (`profiles`, `clients`, `drivers`, `service_requests`, `request_stops`, `request_status_history`), sequence atômica para números de OS legíveis (`OS-2026-0001`) e policies RLS que garantem isolamento para usuários autenticados e ativos.
   - *Por quê*: Garante integridade referencial, histórico imutável de transições de status e conformidade com os requisitos de segurança.
3. **Integração Google Routes API (`computeRoutes`)**:
   - *Abordagem*: Chamada estrita server-side com `POST https://routes.googleapis.com/directions/v2:computeRoutes`, cabeçalho `X-Goog-FieldMask: routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline,routes.legs`, mapeamento de modo de transporte (`TWO_WHEELER` para moto com aviso de beta, `DRIVE` para carro/utilitário) e suporte a trânsito em tempo real (`TRAFFIC_AWARE_OPTIMAL`).
   - *Fallback transparente*: Se a chave não estiver configurada no `.env`, a API retorna status `pending_credentials` com cálculo geodésico aproximado e permite salvar como rascunho com rota pendente.
4. **Precisão Financeira em Centavos**:
   - *Abordagem*: Armazenamento de todos os valores monetários em inteiros no banco (`INTEGER` centavos, ex: R$ 45,50 = `4550`), evitando erros de ponto flutuante. Inputs com máscara BRL amigável que aceitam vírgula decimal.

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        IBEC Express Frontend                           │
│     React 19 + TypeScript + Vite + Tailwind CSS + TanStack Query       │
│                                                                        │
│   ┌──────────────────┐  ┌──────────────────┐  ┌────────────────────┐   │
│   │   AuthContext    │  │  Solicitações    │  │  Nova Solicitação  │   │
│   │ (Supabase Auth)  │  │  (Filtros + KPI) │  │  (3 Blocos + Rota) │   │
│   └────────┬─────────┘  └────────┬─────────┘  └─────────┬──────────┘   │
│            │                     │                      │              │
│   ┌────────┴─────────┐  ┌────────┴─────────┐  ┌─────────┴──────────┐   │
│   │ Clientes/Drivers │  │  Admin Usuários  │  │ Google Maps Embed  │   │
│   │  (CRUD Modais)   │  │  (Perfis / RLS)  │  │ (Trajeto + Paradas)│   │
│   └────────┬─────────┘  └────────┬─────────┘  └─────────┬──────────┘   │
└────────────┼─────────────────────┼──────────────────────┼──────────────┘
             │                     │                      │
             ▼                     ▼                      ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        Node.js Backend / APIs                          │
│                                                                        │
│   /api/routes/compute   /api/requests        /api/clients              │
│   /api/requests/:id     /api/requests/status /api/drivers              │
│   /api/users            /api/health                                    │
└────────────┬────────────────────────────────────────────┬──────────────┘
             │                                            │
             ▼                                            ▼
┌───────────────────────────┐                ┌───────────────────────────┐
│     Google Maps Routes    │                │    Supabase PostgreSQL   │
│  computeRoutes (TwoWheeler│                │  RLS Policies + Profiles  │
│  & Drive, polyline, legs) │                │  Service Requests + Stops │
└───────────────────────────┘                └───────────────────────────┘
```

#### Estrutura de Tabelas (Migrações SQL):
- `profiles`: `id (uuid, FK auth.users)`, `full_name`, `email`, `role (admin, operacional)`, `is_active`, `created_at`.
- `clients`: `id (uuid)`, `corporate_name`, `trade_name`, `document (CPF/CNPJ)`, `contact_name`, `phone`, `email`, `address`, `is_active`.
- `drivers`: `id (uuid)`, `name`, `phone`, `vehicle_type (motoboy, utilitario, passeio)`, `plate`, `is_active`.
- `service_requests`: `id (uuid)`, `order_number (OS-YYYY-XXXX)`, `client_id`, `requester_name`, `requester_phone`, `category`, `delivery_type (IMEDIATO, AGD)`, `scheduled_at`, `kurz_order`, `cost_center`, `description`, `notes`, `press_kit_info (jsonb)`, `driver_id`, `status (NOVA, ATRIBUIDA, EM_COLETA, EM_TRANSPORTE, FINALIZADA, CANCELADA)`, `cancel_reason`, `distance_meters`, `duration_seconds`, `operational_duration_seconds`, `route_polyline`, `price_client_cents`, `price_driver_cents`, `margin_cents`, `created_by`, `created_at`, `updated_at`.
- `request_stops`: `id (uuid)`, `request_id`, `stop_type (PICKUP, DELIVERY)`, `sequence_order`, `company_name`, `address_full`, `number`, `complement`, `contact_name`, `contact_phone`, `access_notes`, `lat`, `lng`, `service_time_minutes`.
- `request_status_history`: `id (uuid)`, `request_id`, `from_status`, `to_status`, `reason`, `changed_by`, `created_at`.

---

### 5. Deployment, Environment & Documentation
- **Arquivo `.env.example`** completo com todas as variáveis públicas e privadas para Vercel e Supabase.
- **`vercel.json`** configurando reescritas de SPA e rotas de API `/api/*`.
- **Scripts de Migração SQL**: Arquivo `supabase/migrations/01_initial_schema.sql` pronto para execução no Supabase SQL Editor.
- **README.md** detalhado em português com passos para criação do primeiro administrador, ativação das APIs Google Maps, e deploy na Vercel.
