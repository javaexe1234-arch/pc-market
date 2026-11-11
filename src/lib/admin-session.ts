import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { AdminConfig } from "./admin-config";

export const SESSION_COOKIE = "pm_session";
export const SESSION_HOURS = 12;

const sha256 = (value: string) => createHash("sha256").update(value).digest();

/** Comparing fixed-length hashes keeps the check from revealing anything through its timing. */
export const passwordMatches = (given: string, config: AdminConfig) =>
  timingSafeEqual(sha256(given), sha256(config.password));

/** The key comes from the password, so changing the password signs everyone out. */
const signature = (expires: string, config: AdminConfig) =>
  createHmac("sha256", sha256(`${config.password}\n${config.path}`)).update(expires).digest("base64url");

export function createSession(config: AdminConfig, now = Date.now()): string {
  const expires = String(now + SESSION_HOURS * 3600 * 1000);
  return `${expires}.${signature(expires, config)}`;
}

export function isValidSession(value: string | undefined, config: AdminConfig, now = Date.now()): boolean {
  const [expires, given, extra] = (value ?? "").split(".");
  if (!expires || !given || extra !== undefined || !/^\d+$/.test(expires)) return false;
  if (Number(expires) <= now) return false;
  const expected = Buffer.from(signature(expires, config));
  const actual = Buffer.from(given);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
