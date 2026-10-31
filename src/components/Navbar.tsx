import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Truck,
  Users,
  Building2,
  FileText,
  LogOut,
  Shield,
  Menu,
  X,
  Settings,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Navbar: React.FC = () => {
  const { user, isAdmin, logout, isDemoMode, switchDemoRole } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  const navLinks = [
    { name: 'Solicitações', path: '/', icon: FileText },
    { name: 'Clientes', path: '/clientes', icon: Building2 },
    { name: 'Motoristas', path: '/motoristas', icon: Truck },
    ...(isAdmin ? [{ name: 'Usuários', path: '/usuarios', icon: Users }] : []),
    { name: 'Credenciais & Deploy', path: '/configuracoes', icon: Settings },
  ];

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
      {/* Barra de Topo */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Zona 1: Brand Wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-lg bg-violet-800 flex items-center justify-center text-amber-400 font-bold shadow-sm group-hover:bg-violet-900 transition-colors">
                <Truck className="w-5 h-5 text-amber-400" />
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-lg text-slate-900 tracking-tight leading-tight">
                  IBEC <span className="text-violet-800">Express</span>
                </span>
                <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">
                  Central de Solicitações
                </span>
              </div>
            </Link>
          </div>

          {/* Zona 2: Links de Navegação Desktop */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const active = isActive(link.path);
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                    active
                      ? 'bg-violet-50 text-violet-900 font-semibold border-b-2 border-violet-800'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${active ? 'text-violet-800' : 'text-slate-400'}`} />
                  {link.name}
                </Link>
              );
            })}
          </nav>

          {/* Zona 3: Perfil do Usuário e Ações */}
          <div className="hidden md:flex items-center gap-3 shrink-0">
            {isDemoMode && (
              <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 px-2 py-1 rounded text-xs text-amber-900">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span className="font-medium">Perfil:</span>
                <button
                  type="button"
                  onClick={() => switchDemoRole(isAdmin ? 'operacional' : 'admin')}
                  className="font-bold text-violet-800 hover:underline cursor-pointer"
                  title="Clique para alternar permissão de teste"
                >
                  {isAdmin ? 'Administrador' : 'Operacional'} ⇄
                </button>
              </div>
            )}

            <div className="flex items-center gap-2 pl-2 border-l border-slate-200 text-xs">
              <div className="w-7 h-7 rounded-full bg-violet-100 text-violet-800 font-bold flex items-center justify-center">
                {user?.full_name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="flex flex-col text-left">
                <span className="font-semibold text-slate-800 truncate max-w-[130px]">
                  {user?.full_name}
                </span>
                <span className="text-[11px] text-slate-500 flex items-center gap-1">
                  {isAdmin ? (
                    <span className="text-violet-700 font-medium flex items-center gap-0.5">
                      <Shield className="w-3 h-3" /> Admin
                    </span>
                  ) : (
                    'Operador'
                  )}
                </span>
              </div>
            </div>

            <button
              onClick={() => logout()}
              className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
              title="Sair da aplicação"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          {/* Botão Mobile */}
          <div className="flex md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Menu Gaveta Mobile */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-2 pb-4 space-y-1">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const active = isActive(link.path);
            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium ${
                  active
                    ? 'bg-violet-50 text-violet-800 font-semibold'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                {link.name}
              </Link>
            );
          })}

          <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-violet-100 text-violet-800 font-bold flex items-center justify-center">
                {user?.full_name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-slate-800">{user?.full_name}</span>
                <span className="text-xs text-slate-500">
                  {isAdmin ? 'Administrador' : 'Operacional'}
                </span>
              </div>
            </div>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                logout();
              }}
              className="px-3 py-1.5 text-xs text-rose-700 font-medium hover:bg-rose-50 rounded"
            >
              Sair
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
