"use client";

import { useActionState } from "react";

type LoginAction = (state: { error?: string }, form: FormData) => Promise<{ error?: string }>;

export function LoginForm({ action }: { action: LoginAction }) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="w-full max-w-sm space-y-4 rounded-xl border border-line bg-panel p-6">
      <h1 className="text-xl font-bold">Вход</h1>
      <label className="block text-sm font-semibold">
        Пароль
        <input type="password" name="password" required autoFocus autoComplete="current-password" className="field mt-2 font-normal" />
      </label>
      {state.error && <p role="alert" className="text-sm text-danger" data-testid="login-error">{state.error}</p>}
      <button type="submit" disabled={pending} className="btn btn-primary w-full disabled:opacity-50">
        {pending ? "Проверяем…" : "Войти"}
      </button>
    </form>
  );
}
