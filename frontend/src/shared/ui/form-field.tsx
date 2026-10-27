import type { InputHTMLAttributes } from "react";
export function FormField({ label, error, id, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }) {
  return <div className="form-field"><label htmlFor={id}>{label}{props.required && <span aria-hidden="true"> *</span>}</label><input id={id} aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined} {...props} />{error && <p id={`${id}-error`} className="field-error">{error}</p>}</div>;
}
