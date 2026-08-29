import { createBrowserRouter } from 'react-router-dom';
import { AgendamentosPage } from '@/pages/AgendamentosPage';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { TechnicalStatusPage } from '@/pages/TechnicalStatusPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AgendamentosPage />,
  },
  {
    path: '/agendamentos',
    element: <AgendamentosPage />,
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
    path: '/status',
    element: <TechnicalStatusPage />,
  },
  {
    path: '*',
    element: <AgendamentosPage />,
  },
]);
