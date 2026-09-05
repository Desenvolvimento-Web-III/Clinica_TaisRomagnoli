import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AgendamentosPage } from '@/pages/AgendamentosPage';
import { ServiceCatalogPage } from '@/pages/ServiceCatalogPage';
import { TechnicalStatusPage } from '@/pages/TechnicalStatusPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { LoginPage } from '@/pages/LoginPage';
import { AdminClientProfilePage } from '@/pages/AdminClientProfilePage';
import { AdminRoute } from './AdminRoute';

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
    path: '/admin/clientes/:clientId',
    element: (
      <AdminRoute>
        <AdminClientProfilePage />
      </AdminRoute>
    ),
  },
  {
    path: '*',
    element: <Navigate to="/servicos" replace />,
  },
]);
