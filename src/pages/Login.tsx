import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Truck, Lock, Mail, AlertTriangle, ArrowRight, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login, isConfigured, isDemoMode } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Falha ao autenticar.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemo = async (role: 'admin' | 'operacional') => {
    const demoEmail = role === 'admin' ? 'admin@ibec.express' : 'operador@ibec.express';
    setEmail(demoEmail);
    setPassword('demo123');
    try {
      await login(demoEmail, 'demo123');
      navigate('/');
    } catch {
      // Ignora erro em demo
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="w-12 h-12 rounded-xl bg-violet-800 flex items-center justify-center text-amber-400 mx-auto shadow-sm">
          <Truck className="w-6 h-6 text-amber-400" />
        </div>
        <h1 className="mt-4 text-2xl font-black text-slate-900 tracking-tight">
          IBEC <span className="text-violet-800">Express</span>
        </h1>
        <p className="mt-1 text-xs text-slate-500 font-medium uppercase tracking-wider">
          Central de Solicitações & Despacho
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200 rounded-2xl sm:px-10 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
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

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Senha
                </label>
                <Link
                  to="/recuperar-senha"
                  className="text-xs text-violet-800 hover:text-violet-950 font-semibold"
                >
                  Esqueceu a senha?
                </Link>
              </div>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-800"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 text-xs font-extrabold text-white bg-violet-800 hover:bg-violet-900 rounded-lg shadow-sm transition-colors focus:ring-2 focus:ring-violet-800 focus:ring-offset-2 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? 'Autenticando...' : 'Entrar no Sistema'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Atalhos Rápidos para Teste de Homologação */}
          <div className="pt-4 border-t border-slate-100 space-y-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block text-center">
              Acesso Rápido de Homologação
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleQuickDemo('admin')}
                className="py-1.5 px-2 bg-violet-50 hover:bg-violet-100 text-violet-900 font-bold rounded border border-violet-200 transition-colors"
              >
                Entrar como Admin
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemo('operacional')}
                className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded border border-slate-200 transition-colors"
              >
                Entrar como Operador
              </button>
            </div>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-slate-400">
          IBEC Express · Central de Solicitações © 2026. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
};
