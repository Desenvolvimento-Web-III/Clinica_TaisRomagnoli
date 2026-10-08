import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AgendamentosPage } from '@/pages/AgendamentosPage';
import { AgendamentoFlowPage } from '@/pages/AgendamentoFlowPage';
import { ReagendamentoPage } from '@/pages/ReagendamentoPage';
import { ServiceCatalogPage } from '@/pages/ServiceCatalogPage';
import { TechnicalStatusPage } from '@/pages/TechnicalStatusPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { LoginPage } from '@/pages/LoginPage';
import { ClientProfilePage } from '@/pages/ClientProfilePage';
import { FichaAnamnesePage } from '@/pages/FichaAnamnesePage';
import { AdminClientProfilePage } from '@/pages/AdminClientProfilePage';
import { AdminHorariosPage } from '@/pages/AdminHorariosPage';
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
    path: '/agendar/:serviceId',
    element: <AgendamentoFlowPage />,
  },
  {
    path: '/agendar',
    element: <AgendamentoFlowPage />,
  },
  {
    path: '/agendamentos/reagendar/:id',
    element: <ReagendamentoPage />,
  },
  {
    path: '/agendamentos/reagendar',
    element: <ReagendamentoPage />,
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
    path: '/perfil',
    element: <ClientProfilePage />,
  },
  {
    path: '/anamnese',
    element: <FichaAnamnesePage />,
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
    path: '/admin/horarios',
    element: (
      <AdminRoute>
        <AdminHorariosPage />
      </AdminRoute>
    ),
  },
  {
    path: '/horarios',
    element: (
      <AdminRoute>
        <AdminHorariosPage />
      </AdminRoute>
    ),
  },
  {
    path: '*',
    element: <Navigate to="/servicos" replace />,
  },
]);
