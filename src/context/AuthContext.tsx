import React, { createContext, useContext, useEffect, useState } from 'react';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { UserProfile, UserRole } from '../types';
import { dataService } from '../services/dataService';

interface AuthContextType {
  user: UserProfile | null;
  role: UserRole;
  isAdmin: boolean;
  isLoading: boolean;
  isConfigured: boolean;
  isDemoMode: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  switchDemoRole: (role: UserRole) => void;
  enableDemoMode: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEMO_USERS: Record<UserRole, UserProfile> = {
  admin: {
    id: 'usr-admin-demo',
    email: 'admin@ibec.express',
    full_name: 'André Alves (Administrador)',
    role: 'admin',
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
  },
  operacional: {
    id: 'usr-op-demo',
    email: 'operador@ibec.express',
    full_name: 'Lucas Despachante (Operacional)',
    role: 'operacional',
    is_active: true,
    created_at: '2026-01-05T00:00:00Z',
  },
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(!isSupabaseConfigured());

  useEffect(() => {
    async function initAuth() {
      if (isSupabaseConfigured() && supabase) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            // Busca o perfil na tabela profiles
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();

            if (profile && profile.is_active) {
              setUser(profile as UserProfile);
              setIsDemoMode(false);
            } else {
              setUser(null);
            }
          }
        } catch (err) {
          console.warn('Erro ao verificar sessão Supabase:', err);
        }
      } else {
        // Sem Supabase configurado, inicializa com usuário administrador de homologação/demo
        setUser(DEMO_USERS.admin);
        setIsDemoMode(true);
      }
      setIsLoading(false);
    }

    initAuth();

    if (isSupabaseConfigured() && supabase) {
      const client = supabase;
      const { data: { subscription } } = client.auth.onAuthStateChange(async (_event, session) => {
        if (session?.user) {
          const { data: profile } = await client
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (profile && profile.is_active) {
            setUser(profile as UserProfile);
            setIsDemoMode(false);
          }
        } else {
          setUser(null);
        }
      });
      return () => subscription.unsubscribe();
    }
  }, []);

  const login = async (email: string, pass: string) => {
    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: pass,
      });
      if (error) throw error;
      if (data.user) {
        const { data: profile, error: pError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (pError || !profile) {
          throw new Error('Perfil de usuário não encontrado no sistema.');
        }
        if (!profile.is_active) {
          await supabase.auth.signOut();
          throw new Error('Seu usuário está inativo. Contate o administrador.');
        }
        setUser(profile as UserProfile);
      }
      return;
    }

    // Modo local / demonstração
    const users = await dataService.getUsers();
    const found = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!found) {
      throw new Error('E-mail ou senha inválidos.');
    }
    if (!found.is_active) {
      throw new Error('Este usuário está inativo no sistema.');
    }
    setUser(found);
    setIsDemoMode(true);
  };

  const logout = async () => {
    if (isSupabaseConfigured() && supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
  };

  const switchDemoRole = (role: UserRole) => {
    setUser(DEMO_USERS[role]);
  };

  const enableDemoMode = () => {
    setUser(DEMO_USERS.admin);
    setIsDemoMode(true);
  };

  const role: UserRole = user?.role || 'operacional';
  const isAdmin = role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isAdmin,
        isLoading,
        isConfigured: isSupabaseConfigured(),
        isDemoMode,
        login,
        logout,
        switchDemoRole,
        enableDemoMode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider');
  }
  return context;
};
