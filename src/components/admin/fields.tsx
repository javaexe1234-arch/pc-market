import type { ReactNode } from "react";
import type { FormErrors, FormValues } from "@/lib/spec-schema";

const asText = (value: FormValues[string]) => (Array.isArray(value) ? value[0] : value) ?? "";

export function ErrorText({ name, errors }: { name: string; errors: FormErrors }) {
  return errors[name] ? <p className="mt-1 text-xs font-normal text-danger" data-field-error={name}>{errors[name]}</p> : null;
}

interface FieldProps {
  name: string;
  label: string;
  hint?: string;
  values: FormValues;
  errors: FormErrors;
}

const Hint = ({ hint }: { hint?: string }) => (hint ? <span className="mt-1 block text-xs font-normal text-muted">{hint}</span> : null);

export function TextField({ name, label, hint, values, errors, rows, inputMode }: FieldProps & { rows?: number; inputMode?: "numeric" | "decimal" }) {
  const className = `field mt-2 font-normal ${errors[name] ? "!border-danger" : ""}`;
  return (
    <label className="block text-sm font-semibold">
      {label}
      {rows ? (
        <textarea name={name} rows={rows} defaultValue={asText(values[name])} className={className} />
      ) : (
        <input name={name} inputMode={inputMode} defaultValue={asText(values[name])} className={className} />
      )}
      <Hint hint={hint} />
      <ErrorText name={name} errors={errors} />
    </label>
  );
}

export function SelectField({ name, label, hint, values, errors, options }: FieldProps & { options: string[] }) {
  return (
    <label className="block text-sm font-semibold">
      {label}
      <select name={name} defaultValue={asText(values[name])} className="field mt-2 font-normal">
        <option value="">Выберите</option>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
      <Hint hint={hint} />
      <ErrorText name={name} errors={errors} />
    </label>
  );
}

export function CheckField({ name, label, values }: { name: string; label: string; values: FormValues }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
      <input type="checkbox" name={name} defaultChecked={asText(values[name]) === "on"} className="h-4 w-4 accent-signal" />
      {label}
    </label>
  );
}

export function MultiField({ name, label, values, errors, options }: FieldProps & { options: string[] }) {
  const selected = [values[name] ?? []].flat();
  return (
    <fieldset className="text-sm font-semibold">
      <legend>{label}</legend>
      <div className="mt-2 flex flex-wrap gap-3 font-normal">
        {options.map((option) => (
          <label key={option} className="flex cursor-pointer items-center gap-2">
            <input type="checkbox" name={name} value={option} defaultChecked={selected.includes(option)} className="h-4 w-4 accent-signal" />
            {option}
          </label>
        ))}
      </div>
      <ErrorText name={name} errors={errors} />
    </fieldset>
  );
}

export function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-line bg-panel p-5">
      <h2 className="font-bold">{title}</h2>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}
