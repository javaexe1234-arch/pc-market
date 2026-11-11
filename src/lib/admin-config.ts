export interface AdminConfig {
  path: string;
  password: string;
}

/** Where the admin pages really live. The browser only ever sees the secret path. */
export const ADMIN_ROUTE_ROOT = "/control";

const PATH_PATTERN = /^[A-Za-z0-9_-]{16,64}$/;
const MIN_PASSWORD_LENGTH = 12;

/** Null until a long enough secret path and password are set: the admin panel then doesn't exist. */
export function adminConfig(): AdminConfig | null {
  const path = process.env.ADMIN_PATH?.trim();
  const password = process.env.ADMIN_PASSWORD?.trim();
  if (!path || !password || !PATH_PATTERN.test(path) || password.length < MIN_PASSWORD_LENGTH) return null;
  return { path, password };
}

export const adminHref = (config: AdminConfig, subPath = "") => `/${config.path}${subPath}`;
