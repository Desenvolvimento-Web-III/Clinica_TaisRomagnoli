import { initializeApp } from 'firebase-admin/app';
import { onRequest } from 'firebase-functions/v2/https';
import { getHealthStatus } from './core/health-status.js';

initializeApp();

export const healthCheck = onRequest({ cors: false }, (_request, response) => {
  response.status(200).json(getHealthStatus());
});
