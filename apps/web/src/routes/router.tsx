import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AgendamentosPage } from '@/pages/AgendamentosPage';
import { ServiceCatalogPage } from '@/pages/ServiceCatalogPage';
import { TechnicalStatusPage } from '@/pages/TechnicalStatusPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { LoginPage } from '@/pages/LoginPage';
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage';
import { ClientProfilePage } from '@/pages/ClientProfilePage';
import { NotificationsPage } from '@/pages/NotificationsPage';
import { AdminClientProfilePage } from '@/pages/AdminClientProfilePage';
import { AdminHorariosPage } from '@/pages/AdminHorariosPage';
import { AdminDashboardPage } from '@/pages/AdminDashboardPage';
import { AdminRoute } from './AdminRoute';
import { ProtectedRoute } from './ProtectedRoute';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/servicos" replace />,
  },
  {
    path: '/agendamentos',
    element: <AgendamentosPage />,
  },
  {
    path: '/servicos',
    element: <ServiceCatalogPage />,
  },
  {
    path: '/status',
    element: <TechnicalStatusPage />,
  },
  {
    path: '/cadastro',
    element: <RegisterPage />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/recuperar-senha',
    element: <ForgotPasswordPage />,
  },
  {
    path: '/esqueci-senha',
    element: <Navigate to="/recuperar-senha" replace />,
  },
  {
    path: '/perfil',
    element: (
      <ProtectedRoute>
        <ClientProfilePage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/notificacoes',
    element: (
      <ProtectedRoute>
        <NotificationsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin',
    element: (
      <ProtectedRoute>
        <AdminRoute>
          <AdminDashboardPage />
        </AdminRoute>
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/clientes/:clientId',
    element: (
      <ProtectedRoute>
        <AdminRoute>
          <AdminClientProfilePage />
        </AdminRoute>
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/horarios',
    element: (
      <ProtectedRoute>
        <AdminRoute>
          <AdminHorariosPage />
        </AdminRoute>
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/:section',
    element: (
      <ProtectedRoute>
        <AdminRoute>
          <AdminDashboardPage />
        </AdminRoute>
      </ProtectedRoute>
    ),
  },
  {
    path: '/horarios',
    element: (
      <ProtectedRoute>
        <AdminRoute>
          <AdminHorariosPage />
        </AdminRoute>
      </ProtectedRoute>
    ),
  },
  {
    path: '*',
    element: <Navigate to="/servicos" replace />,
  },
]);
