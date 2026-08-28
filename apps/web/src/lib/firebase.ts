import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { environment } from '../config/env';

// Inicializa o Firebase apenas se a configuração estiver completa
const app = environment.firebase ? initializeApp(environment.firebase) : null;

export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;

// Conecta aos emuladores caso configurado
if (app && environment.useFirebaseEmulators) {
  if (auth) {
    connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
  }
  if (db) {
    connectFirestoreEmulator(db, 'localhost', 8080);
  }
}
