import './spinner.css';

interface SpinnerProps {
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function Spinner({ label = 'Loading', size = 'md' }: SpinnerProps) {
  return (
    <div className="vk-spinner-wrap" role="status">
      <span className={`vk-spinner vk-spinner--${size}`} aria-hidden="true" />
      <span className="vk-visually-hidden">{label}</span>
    </div>
  );
}
