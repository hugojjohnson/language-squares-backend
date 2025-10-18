import { z } from 'zod';

// Define your schema for env vars
const envSchema = z.object({
  PORT: z
    .string()
    .transform((val) => parseInt(val, 10))
    .refine((val) => !isNaN(val), { message: 'PORT must be a number' }),
  DATABASE_URL: z.string().url(),
  FRONTEND_URL: z.string().url(),
  GOOGLE_APPLICATION_CREDENTIALS: z.string() // NOT EXPORTED! Just for Google.
});

// Parse process.env and throw if missing/invalid
const env = envSchema.parse(process.env);

// Now these are fully typed
export const PORT: number = env.PORT;
export const DATABASE_URL: string = env.DATABASE_URL;
export const FRONTEND_URL: string = env.FRONTEND_URL;
