import { createBrowserRouter } from 'react-router-dom';
import { ServiceCatalogPage } from '@/pages/ServiceCatalogPage';
import { TechnicalStatusPage } from '@/pages/TechnicalStatusPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { LoginPage } from '@/pages/LoginPage';
import { AdminClientProfilePage } from '@/pages/AdminClientProfilePage';
import { AdminRoute } from './AdminRoute';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <ServiceCatalogPage />,
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
    element: <ServiceCatalogPage />,
  },
]);
