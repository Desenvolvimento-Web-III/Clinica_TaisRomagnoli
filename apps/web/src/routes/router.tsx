import { createBrowserRouter } from 'react-router-dom';
import { TechnicalStatusPage } from '@/pages/TechnicalStatusPage';

export const router = createBrowserRouter([
  {
    path: '*',
    element: <TechnicalStatusPage />,
  },
]);
