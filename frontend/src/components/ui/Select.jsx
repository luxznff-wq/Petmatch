import { useId } from 'react';

/**
 * Desplegable con etiqueta.
 * `options` acepta cadenas o `{ value, label }`.
 */
export default function Select({
  label,
  error,
  options = [],
  placeholder,
  className = '',
  required,
  ...props
}) {
  const id = useId();

  return (
    <div className={`field ${error ? 'field-invalid' : ''} ${className}`}>
      {label && (
        <label htmlFor={id}>
          {label}
          {required && <span className="required" aria-hidden="true"> *</span>}
        </label>
      )}
      <select id={id} required={required} aria-invalid={error ? 'true' : undefined} {...props}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => {
          const value = typeof option === 'string' ? option : option.value;
          const text = typeof option === 'string' ? option : option.label;
          return (
            <option key={value} value={value}>
              {text}
            </option>
          );
        })}
      </select>
      {error && (
        <small className="field-error" role="alert">
          {error}
        </small>
      )}
    </div>
  );
}
