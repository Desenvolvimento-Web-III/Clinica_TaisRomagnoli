import { z } from 'zod';

const optionalValue = z.string().trim().min(1).optional();

const rawEnvironmentSchema = z
  .object({
    VITE_FIREBASE_API_KEY: optionalValue,
    VITE_FIREBASE_AUTH_DOMAIN: optionalValue,
    VITE_FIREBASE_PROJECT_ID: optionalValue,
    VITE_FIREBASE_STORAGE_BUCKET: optionalValue,
    VITE_FIREBASE_MESSAGING_SENDER_ID: optionalValue,
    VITE_FIREBASE_APP_ID: optionalValue,
    VITE_USE_FIREBASE_EMULATORS: z.enum(['true', 'false']).default('false'),
  })
  .superRefine((environment, context) => {
    const firebaseValues = [
      environment.VITE_FIREBASE_API_KEY,
      environment.VITE_FIREBASE_AUTH_DOMAIN,
      environment.VITE_FIREBASE_PROJECT_ID,
      environment.VITE_FIREBASE_STORAGE_BUCKET,
      environment.VITE_FIREBASE_MESSAGING_SENDER_ID,
      environment.VITE_FIREBASE_APP_ID,
    ];
    const configuredValues = firebaseValues.filter(Boolean).length;

    if (configuredValues > 0 && configuredValues < firebaseValues.length) {
      context.addIssue({
        code: 'custom',
        message: 'A configuração Firebase deve ser fornecida por completo.',
      });
    }
  });

const rawEnvironment = rawEnvironmentSchema.parse(import.meta.env);

export const environment = {
  firebase:
    rawEnvironment.VITE_FIREBASE_API_KEY &&
    rawEnvironment.VITE_FIREBASE_AUTH_DOMAIN &&
    rawEnvironment.VITE_FIREBASE_PROJECT_ID &&
    rawEnvironment.VITE_FIREBASE_STORAGE_BUCKET &&
    rawEnvironment.VITE_FIREBASE_MESSAGING_SENDER_ID &&
    rawEnvironment.VITE_FIREBASE_APP_ID
      ? {
          apiKey: rawEnvironment.VITE_FIREBASE_API_KEY,
          authDomain: rawEnvironment.VITE_FIREBASE_AUTH_DOMAIN,
          projectId: rawEnvironment.VITE_FIREBASE_PROJECT_ID,
          storageBucket: rawEnvironment.VITE_FIREBASE_STORAGE_BUCKET,
          messagingSenderId: rawEnvironment.VITE_FIREBASE_MESSAGING_SENDER_ID,
          appId: rawEnvironment.VITE_FIREBASE_APP_ID,
        }
      : null,
  useFirebaseEmulators: rawEnvironment.VITE_USE_FIREBASE_EMULATORS === 'true',
} as const;
