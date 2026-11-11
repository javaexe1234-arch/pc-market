import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { adminConfig, AdminConfig, adminHref } from "./admin-config";
import { isValidSession, SESSION_COOKIE } from "./admin-session";

/** Must run first in every admin page and action: server actions are reachable by direct POST. */
export async function requireAdmin(): Promise<AdminConfig> {
  const config = adminConfig();
  if (!config) notFound();
  const jar = await cookies();
  if (!isValidSession(jar.get(SESSION_COOKIE)?.value, config)) redirect(adminHref(config, "/login"));
  return config;
}

/** For route handlers, which answer "not found" instead of revealing a login page. */
export async function isAdminRequest(): Promise<boolean> {
  const config = adminConfig();
  if (!config) return false;
  const jar = await cookies();
  return isValidSession(jar.get(SESSION_COOKIE)?.value, config);
}
