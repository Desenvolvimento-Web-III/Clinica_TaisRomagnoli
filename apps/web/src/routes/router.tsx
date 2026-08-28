import { createBrowserRouter } from 'react-router-dom';
import { TechnicalStatusPage } from '@/pages/TechnicalStatusPage';
import { RegisterPage } from '@/pages/RegisterPage';

export const router = createBrowserRouter([
  {
    path: '/cadastro',
    element: <RegisterPage />,
  },
  {
    path: '*',
    element: <TechnicalStatusPage />,
  },
]);
