"use client";

import { useActionState } from "react";
import type { FormState } from "@/app/control/actions";
import { FormValues, SPEC_FIELDS, specFieldName } from "@/lib/spec-schema";
import type { Slot } from "@/lib/specs";
import { CheckField, FormSection, MultiField, SelectField, TextField } from "./fields";

interface Props {
  action: (state: FormState, form: FormData) => Promise<FormState>;
  slot: Slot;
  id?: number;
  initial: FormValues;
}

export function ProductForm({ action, slot, id, initial }: Props) {
  const [state, formAction, pending] = useActionState(action, { attempt: 0, errors: {} });
  const values = state.values ?? initial;
  const { errors } = state;
  const shared = { values, errors };

  return (
    // The key rebuilds the form after a failed save, so it keeps what was typed.
    <form key={state.attempt} action={formAction} className="space-y-4" data-testid="product-form">
      {id ? <input type="hidden" name="id" value={id} /> : <input type="hidden" name="slot" value={slot} />}

      <FormSection title="Основное">
        <TextField name="brand" label="Бренд" {...shared} />
        <TextField name="name" label="Название" {...shared} />
        <TextField name="priceUzs" label="Цена, сум" inputMode="numeric" {...shared} />
        <TextField name="stock" label="Остаток, шт." inputMode="numeric" {...shared} />
        <div className="sm:col-span-2">
          <CheckField name="active" label="Показывать на сайте" values={values} />
        </div>
      </FormSection>

      <FormSection title="Описание">
        <TextField name="descRu" label="На русском" rows={4} {...shared} />
        <TextField name="descUz" label="На узбекском" rows={4} {...shared} />
      </FormSection>

      <FormSection title="Характеристики">
        {SPEC_FIELDS[slot].map((field) => {
          const name = specFieldName(field.key);
          const common = { name, label: field.label, hint: field.hint, ...shared };
          switch (field.type) {
            case "enum":
              return <SelectField key={name} {...common} options={field.options} />;
            case "multi":
              return <MultiField key={name} {...common} options={field.options} />;
            case "bool":
              return <CheckField key={name} name={name} label={field.label} values={values} />;
            case "int":
              return <TextField key={name} {...common} inputMode="numeric" />;
            case "decimal":
              return <TextField key={name} {...common} inputMode="decimal" />;
            default:
              return <TextField key={name} {...common} />;
          }
        })}
      </FormSection>

      {Object.keys(errors).length > 0 && <p role="alert" className="text-sm text-danger" data-testid="form-error">Не сохранено: проверьте отмеченные поля.</p>}
      <button type="submit" disabled={pending} className="btn btn-primary disabled:opacity-50">{pending ? "Сохраняем…" : "Сохранить"}</button>
    </form>
  );
}
