import type { ButtonHTMLAttributes, ReactNode } from 'react';
import './button.css';

type ButtonVariant = 'primary' | 'accent' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leadingIcon?: ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leadingIcon,
  disabled,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  const classes = ['vk-button', `vk-button--${variant}`, `vk-button--${size}`, className]
    .filter(Boolean)
    .join(' ');

  return (
    <button type={type} className={classes} disabled={disabled || isLoading} {...rest}>
      {isLoading ? <span className="vk-button__spinner" aria-hidden="true" /> : leadingIcon}
      <span>{children}</span>
    </button>
  );
}
