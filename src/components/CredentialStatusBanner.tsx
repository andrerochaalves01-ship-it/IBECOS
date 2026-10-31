import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, CheckCircle2, ChevronRight, KeyRound } from 'lucide-react';
import { isGoogleMapsBrowserConfigured, isSupabaseConfigured } from '../lib/supabase';

export const CredentialStatusBanner: React.FC = () => {
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

  const allConfigured = supabaseOk && serverStatus.googleMapsServerConfigured;

  if (allConfigured) {
    return null; // Não exibe quando tudo está 100% conectado
  }

  return (
    <div className="bg-amber-50/90 border-b border-amber-200 text-amber-900 px-4 py-2 text-xs">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-amber-700 shrink-0" />
          <span>
            <strong className="font-semibold">Ambiente de Operação:</strong>{' '}
            {!supabaseOk && (
              <span className="mr-2 inline-flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600 inline" />
                Supabase pendente (utilizando armazenamento de homologação)
              </span>
            )}
            {!serverStatus.googleMapsServerConfigured && (
              <span className="inline-flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600 inline" />
                Google Routes API pendente (cálculo de malha urbana ativado)
              </span>
            )}
          </span>
        </div>
        <Link
          to="/configuracoes"
          className="inline-flex items-center gap-1 font-semibold text-violet-800 hover:text-violet-950 underline underline-offset-2 shrink-0"
        >
          Ver instruções de configuração e migração SQL
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
};
