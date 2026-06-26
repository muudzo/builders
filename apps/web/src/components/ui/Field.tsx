import { useId } from 'react';
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import './field.css';

interface FieldWrapperProps {
  label: string;
  error?: string;
  hint?: string;
  children: (id: string, describedBy: string | undefined) => ReactNode;
}

function FieldWrapper({ label, error, hint, children }: FieldWrapperProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className="vk-field">
      <label htmlFor={id} className="vk-field__label">
        {label}
      </label>
      {children(id, describedBy)}
      {hint && !error && (
        <p id={hintId} className="vk-field__hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="vk-field__error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  hint?: string;
};

export function Input({ label, error, hint, className, ...rest }: InputProps) {
  return (
    <FieldWrapper label={label} error={error} hint={hint}>
      {(id, describedBy) => (
        <input
          id={id}
          className={['vk-field__input', error && 'vk-field__input--error', className]
            .filter(Boolean)
            .join(' ')}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          {...rest}
        />
      )}
    </FieldWrapper>
  );
}

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
};

export function Select({ label, error, hint, className, children, ...rest }: SelectProps) {
  return (
    <FieldWrapper label={label} error={error} hint={hint}>
      {(id, describedBy) => (
        <select
          id={id}
          className={['vk-field__input', error && 'vk-field__input--error', className]
            .filter(Boolean)
            .join(' ')}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          {...rest}
        >
          {children}
        </select>
      )}
    </FieldWrapper>
  );
}

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  error?: string;
  hint?: string;
};

export function Textarea({ label, error, hint, className, ...rest }: TextareaProps) {
  return (
    <FieldWrapper label={label} error={error} hint={hint}>
      {(id, describedBy) => (
        <textarea
          id={id}
          className={['vk-field__input', 'vk-field__input--textarea', error && 'vk-field__input--error', className]
            .filter(Boolean)
            .join(' ')}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          {...rest}
        />
      )}
    </FieldWrapper>
  );
}
