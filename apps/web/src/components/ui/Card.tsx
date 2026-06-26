import type { HTMLAttributes, ReactNode } from 'react';
import './card.css';

type CardElevation = 'flat' | 'raised' | 'floating';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  elevation?: CardElevation;
  children: ReactNode;
}

export function Card({ elevation = 'raised', className, children, ...rest }: CardProps) {
  const classes = ['vk-card', `vk-card--${elevation}`, className].filter(Boolean).join(' ');
  return (
    <div className={classes} {...rest}>
      {children}
    </div>
  );
}
