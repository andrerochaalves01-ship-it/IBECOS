# IBEC Express | Central de Solicitações

Sistema web operacional completo para lançamento, cálculo de rotas e gestão do ciclo de vida de solicitações de transporte rápido (motoboy, carro utilitário, carro de passeio e press kit com múltiplas entregas).

Desenvolvido para priorizar rapidez no lançamento, clareza operacional e poucos cliques.

---

## 1. Stack Tecnológica

- **Frontend**: React 19 com TypeScript, Vite, Tailwind CSS v4, React Router 7, TanStack Query, Lucide React.
- **Backend**: Node.js com TypeScript e Express integrado; handlers modulares em `/api/*` 100% compatíveis com **Vercel Functions**.
- **Banco de Dados & Autenticação**: Supabase PostgreSQL com **Row Level Security (RLS)** e Supabase Auth por e-mail e senha.
- **Roteamento & Mapas**: Google Maps Routes API (método `computeRoutes` exclusivamente via backend seguro) com suporte a `TWO_WHEELER` (moto) e `DRIVE` (carros/utilitários).
- **Hospedagem**: Vercel (frontend SPA + rotas de API serverless).

---

## 2. Passo a Passo de Configuração do Supabase

### A. Criar o Projeto e Rodar as Migrações
1. Acesse o [Supabase Dashboard](https://supabase.com/dashboard) e crie um novo projeto.
2. Defina a região mais próxima (ex: `sa-east-1` São Paulo) e fuso horário `America/Sao_Paulo`.
3. Abra a aba **SQL Editor** no menu lateral esquerdo.
4. Copie todo o conteúdo do arquivo `supabase/migrations/01_initial_schema.sql` deste projeto e execute no editor.
   - Isso criará as tabelas `profiles`, `clients`, `drivers`, `service_requests`, `request_stops` e `request_status_history`.
   - Criará a sequência atômica de OS (`OS-2026-00001`), índices de busca e todas as políticas de Row Level Security (RLS).

### B. Procedimento Seguro para Criar o Primeiro Administrador
Para manter conformidade estrita com segurança e evitar senhas padrões ou promoção pelo navegador:
1. No Supabase Dashboard, vá para **Authentication > Users** e clique em **Invite user** ou **Add user > Create user**.
2. Cadastre o e-mail do administrador (ex: `admin@ibec.express`) e defina a senha inicial.
3. Copie o **User UID** gerado (UUID).
4. No **SQL Editor**, execute o comando abaixo substituindo `'SEU_USER_ID_AQUI'` pelo UID copiado:

```sql
INSERT INTO public.profiles (id, full_name, email, role, is_active)
VALUES (
  'SEU_USER_ID_AQUI',
  'Administrador Geral IBEC',
  'admin@ibec.express',
  'admin',
  true
)
ON CONFLICT (id) DO UPDATE SET role = 'admin', is_active = true;
```

5. O usuário agora possui papel `admin` autenticado pelo banco e validado em todas as políticas RLS.

### C. URLs de Redirecionamento (Auth)
No Supabase Dashboard, acesse **Authentication > URL Configuration**:
- **Site URL**: `https://seu-dominio.vercel.app` (ou `http://localhost:3000` em desenvolvimento local).
- **Redirect URLs**: Adicione `https://seu-dominio.vercel.app/**` e `http://localhost:3000/**`.

---

## 3. Passo a Passo para Google Maps Platform

A Google Maps Platform é uma configuração independente e requer faturamento ativo:

1. Acesse o [Google Cloud Console](https://console.cloud.google.com/google/maps-apis).
2. Selecione ou crie um projeto e ative o faturamento.
3. No **API Library**, ative:
   - **Routes API** (obrigatória para `computeRoutes`).
   - **Places API** (para busca preditiva de endereços).
   - **Maps JavaScript API** (para renderização visual).
4. Crie duas chaves de API com restrições adequadas:
   - **Chave de Servidor (`GOOGLE_MAPS_SERVER_KEY`)**:
     - Restrição de API: selecione exclusivamente **Routes API**.
     - Esta chave deve ser mantida em segredo no arquivo `.env` do servidor e nas variáveis de ambiente da Vercel.
   - **Chave de Navegador (`VITE_GOOGLE_MAPS_BROWSER_KEY`)**:
     - Restrição de aplicativo: **Sites da Web (HTTP referrers)**, configurando seu domínio Vercel e `http://localhost:3000/*`.
     - Restrição de API: selecione **Maps JavaScript API** e **Places API**.

> **Aviso Regulatório Google Maps**: Rotas em modo `TWO_WHEELER` estão em fase beta na Google Maps Platform. O sistema exibe o aviso regulatório oficial na interface.

---

## 4. Variáveis de Ambiente (.env)

Crie um arquivo `.env` na raiz do projeto com base no modelo `.env.example`:

```env
# Supabase (Frontend & Backend)
VITE_SUPABASE_URL="https://seu-projeto.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="sua_chave_anon_publica"
VITE_GOOGLE_MAPS_BROWSER_KEY="sua_chave_restrita_browser"

# Backend / Vercel Serverless Functions
SUPABASE_URL="https://seu-projeto.supabase.co"
SUPABASE_PUBLISHABLE_KEY="sua_chave_anon_publica"
SUPABASE_SECRET_KEY="sua_chave_service_role_privada"
GOOGLE_MAPS_SERVER_KEY="sua_chave_restrita_routes_api"

APP_URL="http://localhost:3000"
PORT=3000
```

---

## 5. Exportação para GitHub e Deploy na Vercel

### A. Executar Localmente
```bash
# Instalar dependências
npm install

# Iniciar servidor local com suporte a API backend e Vite
npm run dev
```
Acesse `http://localhost:3000`.

### B. Enviar para o GitHub
```bash
git init
git add .
git commit -m "feat: implementacao completa do IBEC Express"
git branch -M main
git remote add origin https://github.com/seu-usuario/ibec-express.git
git push -u origin main
```

### C. Importar e Publicar na Vercel
1. Acesse o [Vercel Dashboard](https://vercel.com/new) e clique em **Add New > Project**.
2. Conecte sua conta do GitHub e selecione o repositório `ibec-express`.
3. Framework Preset: **Vite**.
4. Configure as **Environment Variables** com todas as variáveis descritas na Seção 4.
5. Clique em **Deploy**.
6. O arquivo `vercel.json` incluso no projeto roteará automaticamente requisições `/api/*` para as Serverless Functions e todas as outras rotas para o frontend SPA React.

---

## 6. Lista de Configurações Externas Pendentes

Para colocar a aplicação em produção real:
- [ ] Executar o script `supabase/migrations/01_initial_schema.sql` no Supabase SQL Editor.
- [ ] Cadastrar o primeiro administrador no Supabase Auth e associar o perfil na tabela `profiles`.
- [ ] Configurar faturamento no Google Cloud e obter `GOOGLE_MAPS_SERVER_KEY`.
- [ ] Preencher as variáveis de ambiente no painel da Vercel.
