import type { ReactNode } from 'react';
import './stat.css';

interface StatProps {
  label: string;
  value: string;
  trend?: string;
  tone?: 'default' | 'accent' | 'pass' | 'fail';
  icon?: ReactNode;
}

/** A single bento KPI tile for the council/ministry dashboard. */
export function Stat({ label, value, trend, tone = 'default', icon }: StatProps) {
  return (
    <div className={`vk-stat vk-stat--${tone}`}>
      {icon && <div className="vk-stat__icon">{icon}</div>}
      <p className="vk-stat__label">{label}</p>
      <p className="vk-stat__value">{value}</p>
      {trend && <p className="vk-stat__trend">{trend}</p>}
    </div>
  );
}
