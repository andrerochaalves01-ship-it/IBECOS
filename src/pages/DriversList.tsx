import React, { useEffect, useState } from 'react';
import { Plus, Search, Truck, CheckCircle, XCircle, X } from 'lucide-react';
import { Driver, VehicleType } from '../types';
import { dataService } from '../services/dataService';
import { VEHICLE_LABELS } from '../lib/formatters';

export const DriversList: React.FC = () => {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [vehicleType, setVehicleType] = useState<VehicleType>('motoboy');
  const [plate, setPlate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadDrivers = async () => {
    setIsLoading(true);
    try {
      const data = await dataService.getDrivers();
      setDrivers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDrivers();
  }, []);

  const filteredDrivers = drivers.filter(
    (d) =>
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.phone.includes(search) ||
      (d.plate && d.plate.toLowerCase().includes(search.toLowerCase()))
  );

  const handleCreateDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      alert('Nome e telefone são obrigatórios.');
      return;
    }

    setIsSubmitting(true);
    try {
      await dataService.createDriver({
        name: name.trim(),
        phone: phone.trim(),
        vehicle_type: vehicleType,
        plate: plate.trim() || undefined,
        is_active: true,
      });

      setName('');
      setPhone('');
      setPlate('');
      setIsModalOpen(false);
      loadDrivers();
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleStatus = async (drv: Driver) => {
    try {
      await dataService.updateDriver(drv.id, { is_active: !drv.is_active });
      loadDrivers();
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Gestão de Motoristas
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Cadastro da frota de motoboys, utilitários e veículos de passeio
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-800 hover:bg-violet-900 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4 text-amber-400 stroke-[3]" />
          Novo Motorista
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div className="relative w-full max-w-md">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, telefone ou placa..."
            className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-800"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
        </div>
        <span className="text-xs text-slate-500 tabular-nums">
          Total: <strong className="text-slate-800">{drivers.length}</strong> motoristas
        </span>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-slate-500">
            <div className="w-8 h-8 border-3 border-violet-800 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs font-medium">Carregando motoristas...</p>
          </div>
        ) : filteredDrivers.length === 0 ? (
          <div className="py-16 text-center text-slate-500 space-y-2">
            <Truck className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-semibold text-slate-700">Nenhum motorista cadastrado</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                  <th className="py-3 px-4">Nome do Motorista</th>
                  <th className="py-3 px-4">Telefone</th>
                  <th className="py-3 px-4">Tipo de Veículo</th>
                  <th className="py-3 px-4">Placa</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredDrivers.map((driver) => (
                  <tr key={driver.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">{driver.name}</td>
                    <td className="py-3 px-4 tabular-nums text-slate-600">{driver.phone}</td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-violet-900">
                        {VEHICLE_LABELS[driver.vehicle_type]}
                      </span>
                    </td>
                    <td className="py-3 px-4 tabular-nums uppercase text-slate-700">
                      {driver.plate || '-'}
                    </td>
                    <td className="py-3 px-4">
                      {driver.is_active ? (
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
                        onClick={() => toggleStatus(driver)}
                        className="text-xs font-semibold text-violet-800 hover:text-violet-950 underline cursor-pointer"
                      >
                        {driver.is_active ? 'Desativar' : 'Ativar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Cadastro de Motorista */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-violet-800" />
                <h3 className="text-base font-bold text-slate-900">Cadastrar Novo Motorista</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDriver} className="p-6 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Carlos Alberto Ferreira"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Telefone / WhatsApp *
                </label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(11) 98111-2233"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-800 tabular-nums"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Tipo de Veículo *
                  </label>
                  <select
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value as VehicleType)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-medium"
                  >
                    <option value="motoboy">Motoboy (Moto)</option>
                    <option value="utilitario">Carro Utilitário</option>
                    <option value="passeio">Carro de Passeio</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Placa (Opcional)
                  </label>
                  <input
                    type="text"
                    value={plate}
                    onChange={(e) => setPlate(e.target.value)}
                    placeholder="BRA-3D21"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 uppercase font-semibold tabular-nums"
                  />
                </div>
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
                  className="px-4 py-2 font-bold text-white bg-violet-800 hover:bg-violet-900 rounded-lg shadow-sm"
                >
                  {isSubmitting ? 'Salvando...' : 'Salvar Motorista'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
