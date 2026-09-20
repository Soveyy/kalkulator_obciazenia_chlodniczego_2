import React, { useEffect, useId, useRef, useState } from 'react';
import { AlertTriangle, ChevronDown, Loader2, X } from 'lucide-react';
import { useCalculator } from '../contexts/CalculatorContext';

const CalculationStatus: React.FC = () => {
    const { state, roomFeedback, navigateToIssue } = useCalculator();
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const panelId = useId();

    useEffect(() => setOpen(false), [state.activeRoomId, roomFeedback.status]);
    useEffect(() => {
        if (!open) return;
        panelRef.current?.focus({ preventScroll: true });
        const onPointerDown = (event: PointerEvent) => {
            if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
        };
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setOpen(false);
                triggerRef.current?.focus({ preventScroll: true });
            }
        };
        document.addEventListener('pointerdown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('pointerdown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [open]);

    if (state.activeRoomId === 'aggregate' || roomFeedback.status === 'empty') return null;
    const busy = roomFeedback.status === 'loading' || roomFeedback.status === 'updating';
    if (busy) return (
        <span role="status" className="inline-flex items-center gap-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
            <Loader2 size={15} className="motion-safe:animate-spin shrink-0" aria-hidden="true" />
            <span className="hidden sm:inline">{roomFeedback.message}</span>
        </span>
    );
    if (roomFeedback.status === 'ready' && roomFeedback.issues.length === 0) return null;

    const label = roomFeedback.status === 'error' ? 'Błąd obliczeń'
        : roomFeedback.status === 'ready' ? 'Sprawdź założenia'
        : roomFeedback.hasPreviousResult ? 'Wynik nieaktualny' : 'Uzupełnij dane';
    const room = state.rooms.find(item => item.id === state.activeRoomId);

    return (
        <div ref={containerRef} className="static sm:relative shrink-0">
            <button
                ref={triggerRef}
                type="button"
                aria-expanded={open}
                aria-controls={panelId}
                aria-label={`${label}${roomFeedback.issues.length > 0 ? ` (${roomFeedback.issues.length})` : ''}`}
                title={label}
                onClick={() => setOpen(value => !value)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs sm:text-sm font-medium text-amber-900 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-200 dark:hover:bg-amber-900/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 transition-colors"
            >
                <AlertTriangle size={15} className="shrink-0" aria-hidden="true" />
                <span className="hidden sm:inline">{label}</span>
                {roomFeedback.issues.length > 0 && <span className="tabular-nums">({roomFeedback.issues.length})</span>}
                <ChevronDown size={14} className={open ? 'rotate-180' : ''} aria-hidden="true" />
            </button>
            {open && (
                <div
                    ref={panelRef}
                    id={panelId}
                    role="region"
                    aria-labelledby={`${panelId}-title`}
                    tabIndex={-1}
                    className="absolute right-0 top-full z-40 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-xl dark:border-slate-600 dark:bg-slate-800 focus:outline-none"
                >
                    <div className="flex items-start justify-between gap-3 mb-2">
                        <h2 id={`${panelId}-title`} className="font-semibold text-slate-900 dark:text-white">{label} · {room?.name}</h2>
                        <button type="button" aria-label="Zamknij szczegóły statusu" onClick={() => { setOpen(false); triggerRef.current?.focus(); }} className="rounded p-1 text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                            <X size={16} aria-hidden="true" />
                        </button>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mb-3">
                        {roomFeedback.status === 'ready' ? 'Wyniki są dostępne. Sprawdź poniższe nietypowe założenia.' : roomFeedback.message}
                    </p>
                    {roomFeedback.issues.length > 0 && <ul className="space-y-1 max-h-[45vh] overflow-y-auto">
                        {roomFeedback.issues.map(issue => (
                            <li key={issue.path}>
                                <button type="button" onClick={() => { setOpen(false); navigateToIssue(issue.path); }} className="w-full rounded-md p-2 text-left text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                                    {issue.message}
                                    <span className="block text-xs text-blue-600 dark:text-blue-300 mt-1">Przejdź do danych →</span>
                                </button>
                            </li>
                        ))}
                    </ul>}
                </div>
            )}
        </div>
    );
};

export default CalculationStatus;
