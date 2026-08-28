import { getApp, getApps, initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { connectStorageEmulator, getStorage } from 'firebase/storage';
import { environment } from '@/config/env';

let services: ReturnType<typeof createFirebaseServices> | undefined;

function createFirebaseServices() {
  if (!environment.firebase) {
    throw new Error('Firebase não configurado. Consulte .env.example e docs/SETUP.md.');
  }

  const app = getApps().length > 0 ? getApp() : initializeApp(environment.firebase);
  const auth = getAuth(app);
  const database = getFirestore(app);
  const storage = getStorage(app);

  if (import.meta.env.DEV && environment.useFirebaseEmulators) {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    connectFirestoreEmulator(database, '127.0.0.1', 8080);
    connectStorageEmulator(storage, '127.0.0.1', 9199);
  }

  return { app, auth, database, storage };
}

export function getFirebaseServices() {
  services ??= createFirebaseServices();
  return services;
}
