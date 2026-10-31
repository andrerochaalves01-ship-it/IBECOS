import React, { useEffect, useState } from 'react';
import { Plus, Search, Building2, Edit, CheckCircle, XCircle } from 'lucide-react';
import { Client } from '../types';
import { dataService } from '../services/dataService';
import { QuickClientModal } from '../components/QuickClientModal';

export const ClientsList: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadClients = async () => {
    setIsLoading(true);
    try {
      const data = await dataService.getClients();
      setClients(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
  }, []);

  const filteredClients = clients.filter(
    (c) =>
      c.corporate_name.toLowerCase().includes(search.toLowerCase()) ||
      (c.trade_name && c.trade_name.toLowerCase().includes(search.toLowerCase())) ||
      (c.document && c.document.includes(search)) ||
      (c.contact_name && c.contact_name.toLowerCase().includes(search.toLowerCase()))
  );

  const toggleStatus = async (client: Client) => {
    try {
      await dataService.updateClient(client.id, { is_active: !client.is_active });
      loadClients();
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Gestão de Clientes
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Cadastro de empresas, dados cadastrais e pontos focais de contato
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-800 hover:bg-violet-900 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4 text-amber-400 stroke-[3]" />
          Novo Cliente
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div className="relative w-full max-w-md">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por razão social, nome fantasia, documento ou contato..."
            className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-800"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
        </div>
        <span className="text-xs text-slate-500 tabular-nums">
          Total: <strong className="text-slate-800">{clients.length}</strong> clientes
        </span>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-slate-500">
            <div className="w-8 h-8 border-3 border-violet-800 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs font-medium">Carregando clientes...</p>
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="py-16 text-center text-slate-500 space-y-2">
            <Building2 className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-semibold text-slate-700">Nenhum cliente cadastrado</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                  <th className="py-3 px-4">Empresa / Razão Social</th>
                  <th className="py-3 px-4">Nome Fantasia</th>
                  <th className="py-3 px-4">CNPJ / CPF</th>
                  <th className="py-3 px-4">Contato / Telefone</th>
                  <th className="py-3 px-4">E-mail</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredClients.map((client) => (
                  <tr key={client.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <strong className="text-slate-900 block font-bold">
                        {client.corporate_name}
                      </strong>
                      {client.address && (
                        <span className="text-[11px] text-slate-400 block truncate max-w-xs">
                          {client.address}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">{client.trade_name || '-'}</td>
                    <td className="py-3 px-4 tabular-nums text-slate-600">
                      {client.document || '-'}
                    </td>
                    <td className="py-3 px-4">
                      <span className="block text-slate-900">{client.contact_name || '-'}</span>
                      <span className="text-[11px] text-slate-500 tabular-nums">
                        {client.phone || '-'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{client.email || '-'}</td>
                    <td className="py-3 px-4">
                      {client.is_active ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-bold">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Ativo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-rose-700 font-bold">
                          <XCircle className="w-3.5 h-3.5 text-rose-500" /> Inativo
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => toggleStatus(client)}
                        className="text-xs font-semibold text-violet-800 hover:text-violet-950 underline cursor-pointer"
                      >
                        {client.is_active ? 'Desativar' : 'Ativar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <QuickClientModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onClientCreated={() => loadClients()}
      />
    </div>
  );
};
