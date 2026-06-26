import type { ReactNode } from 'react';
import './empty-state.css';

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}

/** Every data view shows a next step, even when empty — see the "no dead ends" UX law. */
export function EmptyState({ title, description, action, icon }: EmptyStateProps) {
  return (
    <div className="vk-empty-state">
      {icon && <div className="vk-empty-state__icon">{icon}</div>}
      <h3 className="vk-empty-state__title">{title}</h3>
      {description && <p className="vk-empty-state__description">{description}</p>}
      {action && <div className="vk-empty-state__action">{action}</div>}
    </div>
  );
}
