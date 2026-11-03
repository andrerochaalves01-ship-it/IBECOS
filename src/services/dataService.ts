import { isSupabaseConfigured, supabase } from '../lib/supabase';
import {
  INITIAL_CLIENTS,
  INITIAL_DRIVERS,
  INITIAL_REQUESTS,
  INITIAL_USERS,
} from '../lib/mockData';
import {
  Client,
  Driver,
  FilterState,
  RequestStatus,
  RequestStatusHistory,
  RequestStop,
  ServiceRequest,
  UserProfile,
} from '../types';

// Chaves de armazenamento local para persistência no navegador em modo demonstração / homologação
const STORAGE_KEYS = {
  REQUESTS: 'ibec_requests_v1',
  CLIENTS: 'ibec_clients_v1',
  DRIVERS: 'ibec_drivers_v1',
  USERS: 'ibec_users_v1',
  HISTORY: 'ibec_history_v1',
};

function getLocalData<T>(key: string, initial: T[]): T[] {
  try {
    const saved = localStorage.getItem(key);
    if (!saved) {
      localStorage.setItem(key, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(saved);
  } catch {
    return initial;
  }
}

function setLocalData<T>(key: string, data: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.error('Falha ao gravar no localStorage:', err);
  }
}

export const dataService = {
  // =========================================================================
  // SOLICITAÇÕES
  // =========================================================================
  async getRequests(filter?: Partial<FilterState>): Promise<ServiceRequest[]> {
    if (isSupabaseConfigured() && supabase) {
      let query = supabase
        .from('service_requests')
        .select(`
          *,
          client:clients(*),
          driver:drivers(*),
          stops:request_stops(*)
        `)
        .order('created_at', { ascending: false });

      if (filter?.clientId) query = query.eq('client_id', filter.clientId);
      if (filter?.category) query = query.eq('category', filter.category);
      if (filter?.driverId) query = query.eq('driver_id', filter.driverId);
      if (filter?.status) query = query.eq('status', filter.status);

      const { data, error } = await query;
      if (error) {
        console.error('Erro ao buscar solicitações no Supabase:', error);
        throw error;
      }
      return (data || []) as ServiceRequest[];
    }

    // Modo local / demonstração
    let list = getLocalData<ServiceRequest>(STORAGE_KEYS.REQUESTS, INITIAL_REQUESTS);

    if (filter) {
      if (filter.clientId) {
        list = list.filter((r) => r.client_id === filter.clientId);
      }
      if (filter.category) {
        list = list.filter((r) => r.category === filter.category);
      }
      if (filter.driverId) {
        list = list.filter((r) => r.driver_id === filter.driverId);
      }
      if (filter.status) {
        list = list.filter((r) => r.status === filter.status);
      }
      if (filter.searchQuery?.trim()) {
        const query = filter.searchQuery.toLowerCase().trim();
        list = list.filter(
          (r) =>
            r.order_number.toLowerCase().includes(query) ||
            (r.kurz_order && r.kurz_order.toLowerCase().includes(query)) ||
            (r.client?.trade_name && r.client.trade_name.toLowerCase().includes(query)) ||
            (r.client?.corporate_name && r.client.corporate_name.toLowerCase().includes(query)) ||
            r.requester_name.toLowerCase().includes(query)
        );
      }
      if (filter.period && filter.period !== 'all') {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        if (filter.period === 'today') {
          list = list.filter((r) => new Date(r.created_at).getTime() >= startOfDay);
        } else if (filter.period === 'week') {
          const sevenDaysAgo = Date.now() - 7 * 86400000;
          list = list.filter((r) => new Date(r.created_at).getTime() >= sevenDaysAgo);
        } else if (filter.period === 'month') {
          const thirtyDaysAgo = Date.now() - 30 * 86400000;
          list = list.filter((r) => new Date(r.created_at).getTime() >= thirtyDaysAgo);
        }
      }
    }

    return list;
  },

  async getRequestById(id: string): Promise<ServiceRequest | null> {
    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase
        .from('service_requests')
        .select(`
          *,
          client:clients(*),
          driver:drivers(*),
          stops:request_stops(*)
        `)
        .eq('id', id)
        .single();
      if (error) return null;
      return data as ServiceRequest;
    }

    const list = getLocalData<ServiceRequest>(STORAGE_KEYS.REQUESTS, INITIAL_REQUESTS);
    return list.find((r) => r.id === id) || null;
  },

  async createRequest(
    data: Omit<ServiceRequest, 'id' | 'order_number' | 'created_at' | 'updated_at'>,
    authorName = 'Operador'
  ): Promise<ServiceRequest> {
    if (isSupabaseConfigured() && supabase) {
      // Cria a solicitação no banco
      const { stops, ...requestPayload } = data;
      const { data: created, error } = await supabase
        .from('service_requests')
        .insert([requestPayload])
        .select()
        .single();

      if (error) throw error;

      // Insere as paradas relacionadas
      if (stops && stops.length > 0) {
        const stopsPayload = stops.map((s, idx) => ({
          ...s,
          request_id: created.id,
          sequence_order: idx + 1,
        }));
        await supabase.from('request_stops').insert(stopsPayload);
      }

      // Registra histórico inicial
      await supabase.from('request_status_history').insert([
        {
          request_id: created.id,
          from_status: null,
          to_status: created.status,
          reason: 'Abertura da solicitação',
        },
      ]);

      return created as ServiceRequest;
    }

    // Modo local
    const list = getLocalData<ServiceRequest>(STORAGE_KEYS.REQUESTS, INITIAL_REQUESTS);
    const clients = await this.getClients();
    const drivers = await this.getDrivers();

    const client = clients.find((c) => c.id === data.client_id);
    const driver = data.driver_id ? drivers.find((d) => d.id === data.driver_id) : undefined;

    const nextSeq = list.length + 1;
    const year = new Date().getFullYear();
    const orderNumber = `OS-${year}-${String(nextSeq).padStart(4, '0')}`;
    const newId = `req-${Date.now()}`;
    const nowIso = new Date().toISOString();

    const newRequest: ServiceRequest = {
      ...data,
      id: newId,
      order_number: orderNumber,
      client,
      driver,
      margin_cents: (data.price_client_cents || 0) - (data.price_driver_cents || 0),
      created_at: nowIso,
      updated_at: nowIso,
    };

    const updatedList = [newRequest, ...list];
    setLocalData(STORAGE_KEYS.REQUESTS, updatedList);

    // Registra histórico
    await this.addStatusHistory({
      id: `hist-${Date.now()}`,
      request_id: newId,
      from_status: undefined,
      to_status: data.status,
      reason: 'Abertura da solicitação',
      author_name: authorName,
      created_at: nowIso,
    });

    return newRequest;
  },

  async updateRequest(
    id: string,
    updates: Partial<ServiceRequest>
  ): Promise<ServiceRequest> {
    if (isSupabaseConfigured() && supabase) {
      const { stops, client, driver, ...fields } = updates;
      const { data, error } = await supabase
        .from('service_requests')
        .update(fields)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as ServiceRequest;
    }

    const list = getLocalData<ServiceRequest>(STORAGE_KEYS.REQUESTS, INITIAL_REQUESTS);
    const index = list.findIndex((r) => r.id === id);
    if (index === -1) throw new Error('Solicitação não encontrada.');

    const current = list[index];
    const margin =
      updates.price_client_cents !== undefined || updates.price_driver_cents !== undefined
        ? (updates.price_client_cents ?? current.price_client_cents ?? 0) -
          (updates.price_driver_cents ?? current.price_driver_cents ?? 0)
        : current.margin_cents;

    const updated: ServiceRequest = {
      ...current,
      ...updates,
      margin_cents: margin,
      updated_at: new Date().toISOString(),
    };

    list[index] = updated;
    setLocalData(STORAGE_KEYS.REQUESTS, list);
    return updated;
  },

  async updateStatus(
    id: string,
    newStatus: RequestStatus,
    reason?: string,
    driverId?: string,
    authorName = 'Operador'
  ): Promise<ServiceRequest> {
    const req = await this.getRequestById(id);
    if (!req) throw new Error('Solicitação não encontrada.');

    if (newStatus === 'ATRIBUIDA' && !driverId && !req.driver_id) {
      throw new Error('É obrigatório selecionar um motorista para atribuir a solicitação.');
    }

    if (newStatus === 'CANCELADA' && (!reason || reason.trim().length === 0)) {
      throw new Error('É obrigatório informar o motivo do cancelamento.');
    }

    const updates: Partial<ServiceRequest> = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    };

    if (driverId) {
      updates.driver_id = driverId;
      const drivers = await this.getDrivers();
      updates.driver = drivers.find((d) => d.id === driverId);
    }

    if (newStatus === 'CANCELADA') {
      updates.cancel_reason = reason;
    }

    const updated = await this.updateRequest(id, updates);

    // Registra no histórico
    await this.addStatusHistory({
      id: `hist-${Date.now()}`,
      request_id: id,
      from_status: req.status,
      to_status: newStatus,
      reason: reason || `Status atualizado para ${newStatus}`,
      author_name: authorName,
      created_at: new Date().toISOString(),
    });

    return updated;
  },

  async duplicateRequest(id: string, authorName = 'Operador'): Promise<ServiceRequest> {
    const original = await this.getRequestById(id);
    if (!original) throw new Error('Solicitação original não encontrada.');

    // Remove ID, OS e reseta status para NOVA, preservando dados do serviço e paradas
    const { id: _id, order_number: _os, created_at: _ca, updated_at: _ua, status: _st, cancel_reason: _cr, ...rest } = original;

    return this.createRequest(
      {
        ...rest,
        status: 'NOVA',
        description: `[Cópia] ${original.description}`,
      },
      authorName
    );
  },

  // =========================================================================
  // HISTÓRICO DE STATUS
  // =========================================================================
  async getStatusHistory(requestId: string): Promise<RequestStatusHistory[]> {
    if (isSupabaseConfigured() && supabase) {
      const { data } = await supabase
        .from('request_status_history')
        .select('*')
        .eq('request_id', requestId)
        .order('created_at', { ascending: false });
      return (data || []) as RequestStatusHistory[];
    }

    const allHistory = getLocalData<RequestStatusHistory>(STORAGE_KEYS.HISTORY, []);
    return allHistory.filter((h) => h.request_id === requestId);
  },

  async addStatusHistory(historyItem: RequestStatusHistory): Promise<void> {
    if (isSupabaseConfigured() && supabase) {
      await supabase.from('request_status_history').insert([historyItem]);
      return;
    }
    const allHistory = getLocalData<RequestStatusHistory>(STORAGE_KEYS.HISTORY, []);
    setLocalData(STORAGE_KEYS.HISTORY, [historyItem, ...allHistory]);
  },

  // =========================================================================
  // CLIENTES
  // =========================================================================
  async getClients(): Promise<Client[]> {
    if (isSupabaseConfigured() && supabase) {
      const { data } = await supabase.from('clients').select('*').order('corporate_name');
      return (data || []) as Client[];
    }
    return getLocalData<Client>(STORAGE_KEYS.CLIENTS, INITIAL_CLIENTS);
  },

  async createClient(client: Omit<Client, 'id' | 'created_at'>): Promise<Client> {
    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase.from('clients').insert([client]).select().single();
      if (error) throw error;
      return data as Client;
    }

    const list = getLocalData<Client>(STORAGE_KEYS.CLIENTS, INITIAL_CLIENTS);
    const newClient: Client = {
      ...client,
      id: `cli-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    setLocalData(STORAGE_KEYS.CLIENTS, [...list, newClient]);
    return newClient;
  },

  async updateClient(id: string, updates: Partial<Client>): Promise<Client> {
    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase
        .from('clients')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as Client;
    }

    const list = getLocalData<Client>(STORAGE_KEYS.CLIENTS, INITIAL_CLIENTS);
    const idx = list.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error('Cliente não encontrado.');
    list[idx] = { ...list[idx], ...updates };
    setLocalData(STORAGE_KEYS.CLIENTS, list);
    return list[idx];
  },

  // =========================================================================
  // MOTORISTAS
  // =========================================================================
  async getDrivers(): Promise<Driver[]> {
    if (isSupabaseConfigured() && supabase) {
      const { data } = await supabase.from('drivers').select('*').order('name');
      return (data || []) as Driver[];
    }
    return getLocalData<Driver>(STORAGE_KEYS.DRIVERS, INITIAL_DRIVERS);
  },

  async createDriver(driver: Omit<Driver, 'id' | 'created_at'>): Promise<Driver> {
    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase.from('drivers').insert([driver]).select().single();
      if (error) throw error;
      return data as Driver;
    }

    const list = getLocalData<Driver>(STORAGE_KEYS.DRIVERS, INITIAL_DRIVERS);
    const newDriver: Driver = {
      ...driver,
      id: `drv-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    setLocalData(STORAGE_KEYS.DRIVERS, [...list, newDriver]);
    return newDriver;
  },

  async updateDriver(id: string, updates: Partial<Driver>): Promise<Driver> {
    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase
        .from('drivers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as Driver;
    }

    const list = getLocalData<Driver>(STORAGE_KEYS.DRIVERS, INITIAL_DRIVERS);
    const idx = list.findIndex((d) => d.id === id);
    if (idx === -1) throw new Error('Motorista não encontrado.');
    list[idx] = { ...list[idx], ...updates };
    setLocalData(STORAGE_KEYS.DRIVERS, list);
    return list[idx];
  },

  // =========================================================================
  // USUÁRIOS (ADMIN)
  // =========================================================================
  async getUsers(): Promise<UserProfile[]> {
    if (isSupabaseConfigured() && supabase) {
      const { data } = await supabase.from('profiles').select('*').order('full_name');
      return (data || []) as UserProfile[];
    }
    return getLocalData<UserProfile>(STORAGE_KEYS.USERS, INITIAL_USERS);
  },

  async createUser(user: Omit<UserProfile, 'id' | 'created_at'> & { password?: string }): Promise<UserProfile> {
    if (isSupabaseConfigured() && user.password) {
      const response = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: user.full_name,
          email: user.email,
          password: user.password,
          role: user.role,
        }),
      });

      const resJson = await response.json();
      if (!response.ok) {
        throw new Error(resJson.error || 'Falha ao cadastrar usuário.');
      }
      return resJson.user as UserProfile;
    }

    if (isSupabaseConfigured() && supabase) {
      const { password, ...profileFields } = user;
      const { data, error } = await supabase.from('profiles').insert([profileFields]).select().single();
      if (error) throw error;
      return data as UserProfile;
    }

    const list = getLocalData<UserProfile>(STORAGE_KEYS.USERS, INITIAL_USERS);
    const newUser: UserProfile = {
      id: `usr-${Date.now()}`,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      is_active: true,
      created_at: new Date().toISOString(),
    };
    setLocalData(STORAGE_KEYS.USERS, [...list, newUser]);
    return newUser;
  },

  async updateUser(id: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as UserProfile;
    }

    const list = getLocalData<UserProfile>(STORAGE_KEYS.USERS, INITIAL_USERS);
    const idx = list.findIndex((u) => u.id === id);
    if (idx === -1) throw new Error('Usuário não encontrado.');
    list[idx] = { ...list[idx], ...updates };
    setLocalData(STORAGE_KEYS.USERS, list);
    return list[idx];
  },
};
