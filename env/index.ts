// Gonna have to get used to modifying these things in two places :(
function getEnvVar(key: keyof NodeJS.ProcessEnv): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing env var: ${key}`);
  return value;
}

export const PORT = parseInt(getEnvVar('PORT'), 10);
export const DATABASE_URL = getEnvVar('DATABASE_URL');
export const FRONTEND_URL = getEnvVar('FRONTEND_URL');