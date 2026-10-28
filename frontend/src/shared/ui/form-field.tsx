import type { InputHTMLAttributes, ReactNode } from "react";
type FormFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  icon?: ReactNode;
  labelAside?: ReactNode;
  endAdornment?: ReactNode;
};
export function FormField({
  label,
  error,
  id,
  icon,
  labelAside,
  endAdornment,
  ...props
}: FormFieldProps) {
  return (
    <div className="form-field">
      <div className="field-label-row">
        <label htmlFor={id}>
          {label}
          {props.required && <span aria-hidden="true"> *</span>}
        </label>
        {labelAside}
      </div>
      <div
        className={`input-wrap ${icon ? "has-icon" : ""} ${endAdornment ? "has-adornment" : ""}`}
      >
        {icon && (
          <span className="input-icon" aria-hidden="true">
            {icon}
          </span>
        )}
        <input
          id={id}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          {...props}
        />
        {endAdornment}
      </div>
      {error && (
        <p id={`${id}-error`} className="field-error">
          {error}
        </p>
      )}
    </div>
  );
}
