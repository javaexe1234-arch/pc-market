import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/LoginForm";
import { adminConfig, adminHref } from "@/lib/admin-config";
import { isValidSession, SESSION_COOKIE } from "@/lib/admin-session";
import { login } from "../actions";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const config = adminConfig();
  if (!config) notFound();
  const jar = await cookies();
  if (isValidSession(jar.get(SESSION_COOKIE)?.value, config)) redirect(adminHref(config));
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <LoginForm action={login} />
    </main>
  );
}
