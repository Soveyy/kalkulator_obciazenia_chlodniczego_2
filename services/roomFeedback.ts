import { createInitialRoomState } from '../data/defaults';
import type { AppTab, RoomState } from '../types';
import { isRoomResultCurrent, roomInputKey, type ValidationIssue } from './validationService';

export interface RoomFeedback {
    status: 'empty' | 'invalid' | 'error' | 'loading' | 'updating' | 'ready';
    issues: ValidationIssue[];
    hasPreviousResult: boolean;
    message: string;
}

const emptyRoomKey = roomInputKey(createInitialRoomState());

export function getRoomFeedback(
    room: RoomState,
    roomIssues: ValidationIssue[],
    projectName: string,
    dataLoaded: boolean,
): RoomFeedback {
    const issues = projectName.trim() ? roomIssues : [
        { path: 'projectName', message: 'Nazwa projektu: uzupełnij nazwę.', severity: 'error' as const, missing: true },
        ...roomIssues,
    ];
    const hasPreviousResult = Boolean(room.results);
    const base = { issues, hasPreviousResult };

    // A new room is an invitation to enter data, not a failed calculation.
    if (!hasPreviousResult && projectName.trim() && roomInputKey(room) === emptyRoomKey) {
        return { ...base, status: 'empty', message: 'Uzupełnij dane pomieszczenia, aby zobaczyć wyniki.' };
    }
    if (issues.some(issue => issue.severity === 'error')) {
        return { ...base, status: 'invalid', message: 'Uzupełnij lub popraw wskazane dane. Wyniki przeliczą się automatycznie.' };
    }
    if (room.calculationError) {
        return { ...base, status: 'error', message: room.calculationError };
    }
    if (!dataLoaded) {
        return { ...base, status: 'loading', message: 'Ładowanie danych do obliczeń…' };
    }
    if (!isRoomResultCurrent(room)) {
        return { ...base, status: 'updating', message: 'Przeliczanie wyników…' };
    }
    return { ...base, status: 'ready', message: 'Wyniki aktualne.' };
}

export function getIssueTab(path: string): AppTab {
    if (path.startsWith('internalGains.ventilation.')) return 'ventilation';
    if (path.startsWith('internalGains.')) return 'internal';
    if (path.startsWith('windows.')) return 'windows';
    if (path.startsWith('walls.')) return 'walls';
    return 'input';
}

// Keep charts mounted during a valid edit; stale data remains unavailable for export
// in RoomState.activeResults until the matching background calculation completes.
export function getDisplayedRoomResult(room: RoomState, feedback: RoomFeedback, shading: boolean) {
    if (feedback.status === 'ready') return room.activeResults;
    if (feedback.status === 'updating' && room.results) {
        return shading ? room.results.withShading : room.results.withoutShading;
    }
    return null;
}
