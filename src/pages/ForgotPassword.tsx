import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Truck, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

export const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (isSupabaseConfigured() && supabase) {
        const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/redefinir-senha`,
        });
        if (resetErr) throw resetErr;
      }
      setIsSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Falha ao enviar e-mail de recuperação.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="w-12 h-12 rounded-xl bg-violet-800 flex items-center justify-center text-amber-400 mx-auto shadow-sm">
          <Truck className="w-6 h-6 text-amber-400" />
        </div>
        <h1 className="mt-4 text-2xl font-black text-slate-900 tracking-tight">
          Recuperação de Senha
        </h1>
        <p className="mt-1 text-xs text-slate-500 font-medium">
          IBEC Express · Central de Solicitações
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200 rounded-2xl sm:px-10 space-y-5">
          {isSubmitted ? (
            <div className="text-center space-y-4">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">E-mail de Recuperação Enviado</h3>
              <p className="text-xs text-slate-600">
                Se o e-mail <strong>{email}</strong> estiver cadastrado no sistema, você receberá um link seguro para redefinição da sua senha.
              </p>
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-violet-800 hover:text-violet-950 mt-2"
              >
                <ArrowLeft className="w-4 h-4" /> Voltar para o Login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-xs text-slate-600">
                Informe o seu e-mail corporativo cadastrado para enviarmos as instruções de redefinição de acesso.
              </p>

              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  E-mail Corporativo
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="usuario@ibec.express"
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-800"
                  />
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 text-xs font-extrabold text-white bg-violet-800 hover:bg-violet-900 rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50"
              >
                {isLoading ? 'Enviando...' : 'Enviar Link de Redefinição'}
              </button>

              <div className="text-center pt-2">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 font-semibold"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Voltar ao Login
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
