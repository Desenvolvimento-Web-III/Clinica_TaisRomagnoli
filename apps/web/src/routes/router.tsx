import { createBrowserRouter } from 'react-router-dom';
import { TechnicalStatusPage } from '@/pages/TechnicalStatusPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { LoginPage } from '@/pages/LoginPage';

export const router = createBrowserRouter([
  {
    path: '/cadastro',
    element: <RegisterPage />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '*',
    element: <TechnicalStatusPage />,
  },
]);
