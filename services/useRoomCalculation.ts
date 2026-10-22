import { useEffect, useRef } from 'react';
import type { Dispatch } from 'react';
import type { Action, State } from '../types';
import type { CalculationJob, CalculationResponse } from './roomCalculation';
import { isRoomResultCurrent, roomInputKey, validateRoom } from './validationService';

export function useRoomCalculation(state: State, dispatch: Dispatch<Action>) {
    const workerRef = useRef<Worker | null>(null);
    const busy = useRef(false);
    const latest = useRef<CalculationJob | null>(null);
    const queued = useRef<CalculationJob | null>(null);
    const sequence = useRef(0);
    const workerError = useRef<string | null>(null);
    const room = state.rooms.find(item => item.id === state.activeRoomId);
    const inputKey = room ? roomInputKey(room) : '';

    useEffect(() => {
        if (!state.allData) return;
        workerError.current = null;
        const worker = new Worker(new URL('../workers/roomCalculation.worker.ts', import.meta.url), { type: 'module' });
        workerRef.current = worker;
        worker.postMessage({ type: 'init', data: state.allData });
        worker.onmessage = ({ data: response }: MessageEvent<CalculationResponse>) => {
            busy.current = false;
            if (response.id === latest.current?.id) {
                if (response.type === 'result') dispatch({ type: 'SET_RESULTS', payload: { ...response.result, ticket: response.ticket } });
                else dispatch({ type: 'SET_CALCULATION_ERROR', payload: { ticket: response.ticket, error: response.error } });
            }
            // Sliders and fast typing keep only the newest waiting input, never a backlog.
            const next = queued.current;
            queued.current = null;
            if (next) { busy.current = true; worker.postMessage({ type: 'calculate', job: next }); }
        };
        worker.onerror = () => {
            workerError.current = 'Nie udało się uruchomić obliczeń w tle. Odśwież aplikację.';
            const current = latest.current;
            if (current) dispatch({ type: 'SET_CALCULATION_ERROR', payload: {
                ticket: current.ticket, error: workerError.current,
            } });
            queued.current = null;
            busy.current = false;
        };
        return () => {
            worker.terminate();
            workerRef.current = null;
            busy.current = false;
            latest.current = null;
            queued.current = null;
        };
    }, [state.allData, dispatch]);

    useEffect(() => {
        const worker = workerRef.current;
        if (!worker || !room || isRoomResultCurrent(room) || validateRoom(room).some(issue => issue.severity === 'error')) return;
        const job: CalculationJob = {
            id: ++sequence.current,
            ticket: { roomId: room.id, inputKey, month: room.currentMonth || '7', shading: state.isShadingViewActive },
            room: { id: room.id, input: room.input, windows: room.windows, walls: room.walls, accumulation: room.accumulation, internalGains: room.internalGains },
        };
        latest.current = job;
        if (workerError.current) dispatch({ type: 'SET_CALCULATION_ERROR', payload: { ticket: job.ticket, error: workerError.current } });
        else if (busy.current) queued.current = job;
        else { busy.current = true; worker.postMessage({ type: 'calculate', job }); }
        return () => { latest.current = null; queued.current = null; };
        // A current result ends the pending job without starting another calculation.
    }, [inputKey, room?.currentMonth, room?.activeResults, state.activeRoomId, state.isShadingViewActive, state.allData, dispatch]);
}
