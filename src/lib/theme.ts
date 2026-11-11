import { cookies } from "next/headers";

export type Theme = "dark" | "light";

export const THEME_COOKIE = "theme";

/**
 * The theme the visitor chose, read on the server so the page arrives already in that theme.
 * Undefined until they choose: the CSS then follows the system setting.
 */
export async function savedTheme(): Promise<Theme | undefined> {
  const value = (await cookies()).get(THEME_COOKIE)?.value;
  return value === "light" || value === "dark" ? value : undefined;
}
