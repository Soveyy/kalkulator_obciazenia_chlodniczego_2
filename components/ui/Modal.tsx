import React, { useEffect, useId, useRef } from 'react';
import { XIcon } from '../Icons';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
  disableBackdropClick?: boolean;
  disableEscKey?: boolean;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, footer, maxWidth = 'max-w-xl', disableBackdropClick = false, disableEscKey = false }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    const previousPadding = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${parseFloat(getComputedStyle(document.body).paddingRight) + scrollbarWidth}px`;
    }
    document.body.style.overflow = 'hidden';
    modalRef.current?.focus({ preventScroll: true });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (event.key === 'Escape' && !disableEscKey) {
        event.preventDefault();
        onCloseRef.current();
      }
      if (event.key === 'Tab' && modalRef.current) {
        const focusable = Array.from<HTMLElement>(modalRef.current.querySelectorAll(
          'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]',
        )).filter(element => element.getClientRects().length > 0);
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const active = document.activeElement;
        if (!first) {
          event.preventDefault();
        } else if (event.shiftKey && (active === first || active === modalRef.current || !modalRef.current.contains(active))) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && (active === last || !modalRef.current.contains(active))) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPadding;
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, [isOpen, disableEscKey]);

  if (!isOpen) return null;

  const handleBackdropClick = () => {
    if (!disableBackdropClick) {
        onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4 transition-opacity duration-200"
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full ${maxWidth} max-h-[calc(100dvh-2rem)] flex flex-col transform transition-transform duration-200 scale-95 animate-scale-in focus:outline-none`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 shrink-0 flex items-start justify-between gap-3 border-b border-slate-200 dark:border-slate-700">
          <h2 id={titleId} className="text-xl font-semibold text-slate-800 dark:text-white">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Zamknij okno" className="shrink-0 rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
            <XIcon className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
        <div className="px-6 py-4 flex-1 min-h-0 overflow-y-auto overscroll-contain">
          {children}
        </div>
        {footer && (
          <div className="px-6 py-4 shrink-0 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700 rounded-b-lg flex flex-wrap justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
      <style>{`
        @keyframes scale-in {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-scale-in { animation: scale-in 0.2s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default Modal;
