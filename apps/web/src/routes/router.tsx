import { createBrowserRouter } from 'react-router-dom';
import { ServiceCatalogPage } from '@/pages/ServiceCatalogPage';
import { TechnicalStatusPage } from '@/pages/TechnicalStatusPage';

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
    path: '*',
    element: <ServiceCatalogPage />,
  },
]);
