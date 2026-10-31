import React, { useEffect, useState } from 'react';
import {
  KeyRound,
  Database,
  MapPin,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Copy,
  Terminal,
  ShieldAlert,
  Server,
  Cloud,
} from 'lucide-react';
import { isGoogleMapsBrowserConfigured, isSupabaseConfigured } from '../lib/supabase';

export const SettingsPage: React.FC = () => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [serverStatus, setServerStatus] = useState<{
    googleMapsServerConfigured: boolean;
  }>({ googleMapsServerConfigured: false });

  const supabaseOk = isSupabaseConfigured();
  const mapsBrowserOk = isGoogleMapsBrowserConfigured();

  useEffect(() => {
    fetch('/api/config-status')
      .then((res) => res.json())
      .then((data) => {
        setServerStatus({
          googleMapsServerConfigured: data.googleMapsServerConfigured,
        });
      })
      .catch(() => {});
  }, []);

  const copyToClipboard = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 3000);
  };

  const sqlBootstrapAdmin = `-- 1. Execute no SQL Editor do Supabase após criar o usuário no Supabase Auth:
-- Substitua 'SEU_USER_ID_AQUI' pelo ID gerado na aba Authentication > Users
INSERT INTO public.profiles (id, full_name, email, role, is_active)
VALUES (
  'SEU_USER_ID_AQUI',
  'Administrador Geral IBEC',
  'admin@ibec.express',
  'admin',
  true
)
ON CONFLICT (id) DO UPDATE SET role = 'admin', is_active = true;`;

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
          <KeyRound className="w-6 h-6 text-violet-800" />
          Credenciais, Banco de Dados & Deploy
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Guia passo a passo para conectar Supabase PostgreSQL, Google Maps Routes API e publicar na Vercel
        </p>
      </div>

      {/* Diagnóstico em Tempo Real das Integrações */}
      <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
        <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
          Status das Integrações Externas
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {/* Supabase */}
          <div
            className={`p-4 rounded-xl border flex flex-col justify-between space-y-2 ${
              supabaseOk ? 'bg-emerald-50/70 border-emerald-200' : 'bg-amber-50/70 border-amber-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold flex items-center gap-1.5 text-slate-900">
                <Database className="w-4 h-4 text-violet-800" />
                Supabase PostgreSQL
              </span>
              {supabaseOk ? (
                <span className="text-emerald-700 font-bold flex items-center gap-1 text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Conectado
                </span>
              ) : (
                <span className="text-amber-800 font-bold flex items-center gap-1 text-[11px]">
                  <AlertCircle className="w-3.5 h-3.5" /> Pendente no .env
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-600">
              {supabaseOk
                ? 'Banco de dados e autenticação oficial ativos.'
                : 'Operando em modo demonstração local com persistência no navegador.'}
            </p>
          </div>

          {/* Google Routes API (Server) */}
          <div
            className={`p-4 rounded-xl border flex flex-col justify-between space-y-2 ${
              serverStatus.googleMapsServerConfigured
                ? 'bg-emerald-50/70 border-emerald-200'
                : 'bg-amber-50/70 border-amber-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold flex items-center gap-1.5 text-slate-900">
                <Server className="w-4 h-4 text-violet-800" />
                Google Routes API (Server)
              </span>
              {serverStatus.googleMapsServerConfigured ? (
                <span className="text-emerald-700 font-bold flex items-center gap-1 text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Ativo
                </span>
              ) : (
                <span className="text-amber-800 font-bold flex items-center gap-1 text-[11px]">
                  <AlertCircle className="w-3.5 h-3.5" /> Pendente no .env
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-600">
              {serverStatus.googleMapsServerConfigured
                ? 'Cálculo de rota trânsito em tempo real funcionando.'
                : 'Ativado cálculo urbano por coordenadas com fallback seguro.'}
            </p>
          </div>

          {/* Google Maps Browser */}
          <div
            className={`p-4 rounded-xl border flex flex-col justify-between space-y-2 ${
              mapsBrowserOk ? 'bg-emerald-50/70 border-emerald-200' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold flex items-center gap-1.5 text-slate-900">
                <MapPin className="w-4 h-4 text-violet-800" />
                Google Maps (Browser)
              </span>
              {mapsBrowserOk ? (
                <span className="text-emerald-700 font-bold flex items-center gap-1 text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Configurado
                </span>
              ) : (
                <span className="text-slate-500 font-bold flex items-center gap-1 text-[11px]">
                  Opcional
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-600">
              Para visualização gráfica direta de pins e autocomplete Places.
            </p>
          </div>
        </div>
      </section>

      {/* Passo a Passo 1: Supabase PostgreSQL & RLS */}
      <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <Database className="w-5 h-5 text-violet-800" />
            1. Configuração do Supabase (Banco, RLS e Auth)
          </h2>
          <a
            href="https://supabase.com/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-bold text-violet-800 hover:text-violet-950 inline-flex items-center gap-1"
          >
            Abrir Supabase Dashboard <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        <ol className="list-decimal list-inside space-y-2.5 text-xs text-slate-700 leading-relaxed">
          <li>
            Crie um novo projeto no Supabase com fuso horário <strong>America/Sao_Paulo</strong>.
          </li>
          <li>
            Acesse a aba <strong>SQL Editor</strong> e execute o script de migração completo
            localizado no arquivo do projeto:{' '}
            <code className="bg-slate-100 px-1.5 py-0.5 rounded text-violet-800 font-mono">
              /supabase/migrations/01_initial_schema.sql
            </code>
            . Esse script cria as tabelas relacionais, sequence atômica de OS, índices e todas as
            políticas RLS.
          </li>
          <li>
            Em <strong>Project Settings &gt; API</strong>, copie a URL do projeto (
            <code className="font-mono">Project URL</code>), a chave pública anônima (
            <code className="font-mono">anon public</code>) e a chave de serviço (
            <code className="font-mono">service_role secret</code>).
          </li>
          <li>
            Em <strong>Authentication &gt; URL Configuration</strong>, configure a Site URL com o
            domínio da sua Vercel ou localhost:3000 para envio de e-mails de recuperação de senha.
          </li>
        </ol>

        {/* Criação segura do primeiro administrador */}
        <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-900 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-violet-800" />
              Procedimento Seguro para Criar o Primeiro Administrador
            </span>
            <button
              onClick={() => copyToClipboard(sqlBootstrapAdmin, 'admin-sql')}
              className="text-[11px] font-bold text-violet-800 hover:text-violet-950 inline-flex items-center gap-1"
            >
              <Copy className="w-3.5 h-3.5" />{' '}
              {copiedSection === 'admin-sql' ? 'Copiado!' : 'Copiar SQL'}
            </button>
          </div>
          <p className="text-slate-600">
            Nunca permita criação de administrador pelo navegador. No Supabase Dashboard, crie o
            usuário em <strong>Authentication &gt; Users</strong> e execute no SQL Editor:
          </p>
          <pre className="bg-slate-950 text-slate-100 p-3 rounded font-mono text-[11px] overflow-x-auto">
            {sqlBootstrapAdmin}
          </pre>
        </div>
      </section>

      {/* Passo a Passo 2: Google Maps Platform (Routes API) */}
      <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-violet-800" />
            2. Configuração da Google Maps Platform
          </h2>
          <a
            href="https://console.cloud.google.com/google/maps-apis"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-bold text-violet-800 hover:text-violet-950 inline-flex items-center gap-1"
          >
            Google Cloud Console <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        <ol className="list-decimal list-inside space-y-2.5 text-xs text-slate-700 leading-relaxed">
          <li>
            Ative o faturamento (Billing) no seu projeto Google Cloud e habilite as seguintes APIs:
            <ul className="list-disc list-inside ml-5 mt-1 font-semibold text-slate-800 space-y-0.5">
              <li>Routes API (método computeRoutes para cálculo no servidor)</li>
              <li>Places API (para busca preditiva de endereços no Brasil)</li>
              <li>Maps JavaScript API (para visualização no navegador)</li>
            </ul>
          </li>
          <li>
            Crie <strong>duas chaves de API distintas</strong> para máxima segurança:
            <ul className="list-disc list-inside ml-5 mt-1 space-y-1">
              <li>
                <strong>GOOGLE_MAPS_SERVER_KEY (Servidor)</strong>: Restrinja a chave apenas para a{' '}
                <code className="font-mono font-bold text-violet-900">Routes API</code>. Esta chave
                nunca é exposta ao frontend.
              </li>
              <li>
                <strong>VITE_GOOGLE_MAPS_BROWSER_KEY (Navegador)</strong>: Restrinja por Domínio
                (HTTP Referrer) para seus domínios da Vercel e localhost, limitando a Places API e
                Maps JavaScript API.
              </li>
            </ul>
          </li>
          <li>
            <strong>Políticas de Atribuição e Cache:</strong> A aplicação respeita os termos da
            Google Maps Platform, não persistindo geometrias ou polylines completas
            indefinidamente. Armazena apenas o endereço digitado pelo usuário e as distâncias/tempos
            calculados.
          </li>
        </ol>
      </section>

      {/* Passo a Passo 3: Deploy na Vercel e .env */}
      <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <Cloud className="w-5 h-5 text-violet-800" />
            3. Deploy na Vercel & Variáveis de Ambiente
          </h2>
          <a
            href="https://vercel.com/new"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-bold text-violet-800 hover:text-violet-950 inline-flex items-center gap-1"
          >
            Vercel Dashboard <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        <p className="text-xs text-slate-600">
          O projeto já contém o arquivo <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-violet-800">vercel.json</code>{' '}
          configurado para servir a SPA com reescrita para as funções Serverless em{' '}
          <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-violet-800">/api/*</code>.
        </p>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Variáveis para cadastrar no painel da Vercel (Environment Variables):
            </span>
          </div>

          <div className="bg-slate-950 text-slate-200 p-4 rounded-lg font-mono text-xs overflow-x-auto space-y-1">
            <p>VITE_SUPABASE_URL="https://seu-projeto.supabase.co"</p>
            <p>VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGciOiJIUzI1..."</p>
            <p>VITE_GOOGLE_MAPS_BROWSER_KEY="AIzaSy..."</p>
            <p>SUPABASE_URL="https://seu-projeto.supabase.co"</p>
            <p>SUPABASE_PUBLISHABLE_KEY="eyJhbGciOiJIUzI1..."</p>
            <p>SUPABASE_SECRET_KEY="eyJhbGciOiJIUzI1..."</p>
            <p>GOOGLE_MAPS_SERVER_KEY="AIzaSy..."</p>
            <p>APP_URL="https://seu-app.vercel.app"</p>
          </div>
        </div>
      </section>
    </div>
  );
};
