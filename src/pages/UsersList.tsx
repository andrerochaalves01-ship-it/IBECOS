import React, { useEffect, useState } from 'react';
import {
  Shield,
  UserPlus,
  CheckCircle,
  XCircle,
  AlertTriangle,
  X,
  Lock,
  Eye,
  EyeOff,
  User,
  Mail,
} from 'lucide-react';
import { UserProfile, UserRole } from '../types';
import { dataService } from '../services/dataService';
import { useAuth } from '../context/AuthContext';
import { formatDateTime } from '../lib/formatters';

export const UsersList: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<UserRole>('operacional');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const data = await dataService.getUsers();
      setUsers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadUsers();
    }
  }, [isAdmin]);

  // Se não for admin, bloqueia acesso
  if (!isAdmin) {
    return (
      <div className="max-w-lg mx-auto py-16 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
          <Shield className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Acesso Restrito a Administradores</h2>
        <p className="text-xs text-slate-500">
          Você está conectado com perfil <strong>Operacional</strong>. Apenas administradores
          possuem permissão para gerenciar a equipe e os acessos ao sistema.
        </p>
      </div>
    );
  }

  const handleOpenModal = () => {
    setFullName('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setRole('operacional');
    setModalError(null);
    setShowPassword(false);
    setIsModalOpen(true);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    if (!fullName.trim() || !email.trim()) {
      setModalError('Preencha nome completo e e-mail corporativo.');
      return;
    }

    if (!password || password.length < 6) {
      setModalError('A senha deve conter no mínimo 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setModalError('As senhas digitadas não coincidem.');
      return;
    }

    setIsSubmitting(true);
    try {
      await dataService.createUser({
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        role,
        password: password,
        is_active: true,
      });

      setFeedback(`Usuário ${email.trim().toLowerCase()} cadastrado com sucesso! Acesso já liberado com a senha configurada.`);
      setTimeout(() => setFeedback(null), 7000);
      setIsModalOpen(false);
      loadUsers();
    } catch (err: any) {
      setModalError(err.message || 'Erro ao cadastrar usuário.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleStatus = async (targetUser: UserProfile) => {
    if (targetUser.id === user?.id) {
      alert('Você não pode desativar seu próprio perfil de administrador.');
      return;
    }

    try {
      await dataService.updateUser(targetUser.id, { is_active: !targetUser.is_active });
      loadUsers();
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {feedback && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg text-xs font-semibold flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{feedback}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="underline text-emerald-800 hover:text-emerald-950 cursor-pointer">
            Fechar
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Shield className="w-6 h-6 text-violet-800" />
            Gestão de Usuários e Permissões
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Cadastro de novos operadores e administradores com definição direta de login e senha
          </p>
        </div>

        <button
          onClick={handleOpenModal}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-800 hover:bg-violet-900 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
        >
          <UserPlus className="w-4 h-4 text-amber-400 stroke-[2.5]" />
          Cadastrar Usuário
        </button>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3.5 text-xs text-amber-900 flex items-start gap-2.5">
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <strong className="font-semibold block">Acesso Restrito ao Administrador:</strong>
          <span className="text-[11px]">
            Como administrador, você pode cadastrar diretamente o usuário e definir a senha de acesso inicial.
            O operador poderá fazer login imediatamente com as credenciais cadastradas.
          </span>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-slate-500">
            <div className="w-8 h-8 border-3 border-violet-800 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs font-medium">Carregando usuários...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                  <th className="py-3 px-4">Nome do Usuário</th>
                  <th className="py-3 px-4">E-mail de Acesso</th>
                  <th className="py-3 px-4">Perfil / Permissão</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Data Cadastro</th>
                  <th className="py-3 px-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {users.map((usr) => (
                  <tr key={usr.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {usr.full_name}
                      {usr.id === user?.id && (
                        <span className="ml-2 px-1.5 py-0.5 bg-violet-100 text-violet-800 text-[10px] rounded font-semibold">
                          Você
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600">{usr.email}</td>
                    <td className="py-3 px-4">
                      {usr.role === 'admin' ? (
                        <span className="inline-flex items-center gap-1 font-bold text-violet-900 bg-violet-50 px-2 py-0.5 rounded border border-violet-200">
                          <Shield className="w-3 h-3 text-violet-700" /> Administrador
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          Operacional
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {usr.is_active ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-bold">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Ativo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-rose-700 font-bold">
                          <XCircle className="w-3.5 h-3.5 text-rose-500" /> Inativo
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 tabular-nums text-slate-500">
                      {formatDateTime(usr.created_at)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {usr.id !== user?.id ? (
                        <button
                          onClick={() => toggleStatus(usr)}
                          className="text-xs font-semibold text-violet-800 hover:text-violet-950 underline cursor-pointer"
                        >
                          {usr.is_active ? 'Desativar' : 'Ativar'}
                        </button>
                      ) : (
                        <span className="text-slate-400 text-[11px] italic">Inalterável</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Cadastrar Usuário e Senha */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in duration-200">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-violet-100 text-violet-800 flex items-center justify-center">
                  <UserPlus className="w-4 h-4 text-violet-800" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Cadastrar Novo Usuário</h3>
                  <p className="text-[11px] text-slate-500">Defina os dados e a senha de acesso inicial</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-6 space-y-4 text-xs">
              {modalError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{modalError}</span>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nome Completo *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Ex: Carlos Eduardo Silveira"
                    className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-800 font-medium"
                  />
                  <User className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  E-mail de Acesso *
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="operador@ibec.express"
                    className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-800 font-medium"
                  />
                  <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                </div>
              </div>

              <div className="space-y-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                      Senha de Acesso Inicial *
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-violet-800 hover:text-violet-950 font-semibold inline-flex items-center gap-1 text-[11px]"
                    >
                      {showPassword ? (
                        <>
                          <EyeOff className="w-3 h-3" /> Ocultar
                        </>
                      ) : (
                        <>
                          <Eye className="w-3 h-3" /> Visualizar
                        </>
                      )}
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mínimo de 6 caracteres"
                      className="w-full pl-8 pr-3 py-2 bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-800 font-medium"
                    />
                    <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-1">
                    Confirmar Senha *
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repita a mesma senha"
                      className="w-full pl-8 pr-3 py-2 bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-800 font-medium"
                    />
                    <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Perfil de Permissão *
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-violet-800"
                >
                  <option value="operacional">Operacional (Lança e acompanha solicitações, clientes e motoristas)</option>
                  <option value="admin">Administrador (Acesso total e gestão de usuários/senhas)</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 font-bold text-white bg-violet-800 hover:bg-violet-900 rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Cadastrando usuário...' : 'Salvar e Ativar Acesso'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
