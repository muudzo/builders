import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import './modal.css';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Hide the close affordance during an in-flight step the user shouldn't be able to dismiss accidentally. */
  isDismissable?: boolean;
}

export function Modal({ isOpen, onClose, title, children, isDismissable = true }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && isDismissable) onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [isOpen, isDismissable, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="vk-modal-overlay">
      <div
        ref={dialogRef}
        className="vk-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="vk-modal-title"
        tabIndex={-1}
      >
        <div className="vk-modal__header">
          <h2 id="vk-modal-title" className="vk-modal__title">
            {title}
          </h2>
          {isDismissable && (
            <button type="button" className="vk-modal__close" onClick={onClose} aria-label="Close dialog">
              ×
            </button>
          )}
        </div>
        <div className="vk-modal__body">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
