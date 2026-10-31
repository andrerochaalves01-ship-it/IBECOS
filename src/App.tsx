import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { CredentialStatusBanner } from './components/CredentialStatusBanner';
import { RequestsList } from './pages/RequestsList';
import { RequestForm } from './pages/RequestForm';
import { ClientsList } from './pages/ClientsList';
import { DriversList } from './pages/DriversList';
import { UsersList } from './pages/UsersList';
import { SettingsPage } from './pages/SettingsPage';
import { Login } from './pages/Login';
import { ForgotPassword } from './pages/ForgotPassword';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 2, // 2 minutos
    },
  },
});

// Componente para rotas protegidas
const ProtectedLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center space-y-3">
        <div className="w-10 h-10 border-4 border-violet-800 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Carregando IBEC Express...
        </p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Navbar />
      <CredentialStatusBanner />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-400">
        IBEC Express · Central de Solicitações © 2026. Todos os direitos reservados.
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Rotas Públicas */}
            <Route path="/login" element={<Login />} />
            <Route path="/recuperar-senha" element={<ForgotPassword />} />

            {/* Rotas Protegidas com Navbar e Banner */}
            <Route
              path="/"
              element={
                <ProtectedLayout>
                  <RequestsList />
                </ProtectedLayout>
              }
            />
            <Route
              path="/solicitacoes/nova"
              element={
                <ProtectedLayout>
                  <RequestForm />
                </ProtectedLayout>
              }
            />
            <Route
              path="/solicitacoes/:id/editar"
              element={
                <ProtectedLayout>
                  <RequestForm />
                </ProtectedLayout>
              }
            />
            <Route
              path="/clientes"
              element={
                <ProtectedLayout>
                  <ClientsList />
                </ProtectedLayout>
              }
            />
            <Route
              path="/motoristas"
              element={
                <ProtectedLayout>
                  <DriversList />
                </ProtectedLayout>
              }
            />
            <Route
              path="/usuarios"
              element={
                <ProtectedLayout>
                  <UsersList />
                </ProtectedLayout>
              }
            />
            <Route
              path="/configuracoes"
              element={
                <ProtectedLayout>
                  <SettingsPage />
                </ProtectedLayout>
              }
            />

            {/* Redirecionamento Padrão */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
