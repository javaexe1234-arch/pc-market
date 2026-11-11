"use client";

import { useActionState } from "react";
import type { FormState } from "@/app/control/actions";
import { FPS_FIELDS, VRAM_FIELDS } from "@/lib/admin-validation";
import type { FormValues } from "@/lib/spec-schema";
import { CheckField, FormSection, TextField } from "./fields";

interface Props {
  action: (state: FormState, form: FormData) => Promise<FormState>;
  id?: number;
  initial: FormValues;
}

export function GameForm({ action, id, initial }: Props) {
  const [state, formAction, pending] = useActionState(action, { attempt: 0, errors: {} });
  const values = state.values ?? initial;
  const { errors } = state;
  const shared = { values, errors };

  return (
    <form key={state.attempt} action={formAction} className="space-y-4" data-testid="game-form">
      {id && <input type="hidden" name="id" value={id} />}

      <FormSection title="Игра">
        <TextField name="name" label="Название" {...shared} />
        <TextField name="year" label="Год выхода" inputMode="numeric" {...shared} />
        <div className="sm:col-span-2">
          <CheckField name="active" label="Показывать в расчёте FPS" values={values} />
        </div>
      </FormSection>

      <section className="rounded-lg border border-line bg-raised p-4 text-sm text-muted">
        <p>
          Значения FPS указывайте для эталонной сборки: RTX 4070 (индекс 100), 1080p, без трассировки лучей и DLSS или FSR.
          Ориентиры можно взять из обзоров игры. Предел процессора — FPS, выше которого Ryzen 5 7600X в этой игре не поднимается
          даже с очень мощной видеокартой.
        </p>
      </section>

      <FormSection title="Производительность">
        {FPS_FIELDS.map(({ key, label }) => <TextField key={key} name={key} label={label} inputMode="numeric" {...shared} />)}
        <TextField name="cpuFps" label="Предел процессора, FPS" inputMode="numeric" {...shared} />
      </FormSection>

      <FormSection title="Требования к памяти">
        <TextField name="ramGb" label="Оперативная память, ГБ" inputMode="numeric" {...shared} />
        {VRAM_FIELDS.map(({ key, label }) => <TextField key={key} name={key} label={label} inputMode="numeric" {...shared} />)}
      </FormSection>

      {Object.keys(errors).length > 0 && <p role="alert" className="text-sm text-danger" data-testid="form-error">Не сохранено: проверьте отмеченные поля.</p>}
      <button type="submit" disabled={pending} className="btn btn-primary disabled:opacity-50">{pending ? "Сохраняем…" : "Сохранить"}</button>
    </form>
  );
}
