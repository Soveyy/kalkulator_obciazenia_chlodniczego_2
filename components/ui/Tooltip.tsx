import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { InformationCircleIcon } from '../Icons';

interface TooltipProps {
  text?: string;
  content?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  children?: React.ReactNode;
}

const Tooltip: React.FC<TooltipProps> = ({ text, content, position = 'bottom', children }) => {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [placement, setPlacement] = useState({ left: 0, top: 0 });
  const containerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLSpanElement>(null);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const tooltipId = useId();
  const displayValue = text || content;
  const visible = Boolean(displayValue) && (hovered || focused || pinned) && !dismissed;

  useEffect(() => () => clearTimeout(leaveTimer.current), []);

  useLayoutEffect(() => {
    if (!visible || !containerRef.current || !tooltipRef.current) return;
    const anchor = containerRef.current.getBoundingClientRect();
    const tip = tooltipRef.current.getBoundingClientRect();
    const margin = 12;
    const gap = 8;
    const width = document.documentElement.clientWidth;
    const height = window.innerHeight;
    let left = anchor.left + (anchor.width - tip.width) / 2;
    let top = position === 'top' ? anchor.top - tip.height - gap : anchor.bottom + gap;

    if (position === 'left' || position === 'right') {
      left = position === 'left' ? anchor.left - tip.width - gap : anchor.right + gap;
      top = anchor.top + (anchor.height - tip.height) / 2;
    } else if (top < margin) {
      top = anchor.bottom + gap;
    } else if (top + tip.height > height - margin) {
      top = anchor.top - tip.height - gap;
    }
    setPlacement({
      left: Math.max(margin, Math.min(left, width - tip.width - margin)),
      top: Math.max(margin, Math.min(top, height - tip.height - margin)),
    });
  }, [visible, displayValue, position]);

  useEffect(() => {
    if (!visible) return;
    const dismiss = () => { setDismissed(true); setPinned(false); };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        dismiss();
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node) && !tooltipRef.current?.contains(event.target as Node)) dismiss();
    };
    const onScroll = (event: Event) => {
      if (!tooltipRef.current?.contains(event.target as Node)) dismiss();
    };
    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', dismiss);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', dismiss);
    };
  }, [visible]);

  if (!displayValue) return children ? <>{children}</> : null;

  const onPointerEnter = (event: React.PointerEvent) => {
    if (event.pointerType === 'touch') return;
    clearTimeout(leaveTimer.current);
    setHovered(true);
    setDismissed(false);
  };
  const onPointerLeave = () => {
    leaveTimer.current = setTimeout(() => setHovered(false), 120);
  };

  return (
    <span
      ref={containerRef}
      className={children ? 'inline-flex shrink-0 items-center' : 'ml-1 inline-flex shrink-0 items-center align-middle'}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      onFocus={event => {
        if (event.target.matches(':focus-visible')) { setFocused(true); setDismissed(false); }
      }}
      onBlur={event => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) { setFocused(false); setPinned(false); }
      }}
      onClick={children ? () => setDismissed(true) : undefined}
    >
      {children || (
        <button
          type="button"
          aria-label="Pomoc do pola"
          aria-describedby={visible ? tooltipId : undefined}
          aria-expanded={visible}
          onClick={event => {
            event.stopPropagation();
            setPinned(!pinned);
            setDismissed(pinned);
          }}
          className="inline-flex rounded-full text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-300 cursor-help focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-800"
        >
          <InformationCircleIcon className="w-4 h-4" aria-hidden="true" />
        </button>
      )}
      {visible && createPortal(
        <span
          ref={tooltipRef}
          id={tooltipId}
          role="tooltip"
          onPointerEnter={onPointerEnter}
          onPointerLeave={onPointerLeave}
          className="fixed z-[100] w-max max-w-[min(320px,calc(100vw-24px))] max-h-[calc(100dvh-24px)] overflow-y-auto whitespace-pre-line break-words rounded-md bg-slate-800 px-2.5 py-2 text-xs leading-relaxed text-white shadow-xl border border-white/10 normal-case text-left font-normal dark:bg-slate-700"
          style={placement}
        >
          {displayValue}
        </span>,
        document.fullscreenElement || document.body,
      )}
    </span>
  );
};

export default Tooltip;
