import { describe, expect, it } from 'vitest';
import { createInitialRoomState } from '../data/defaults';
import { calculatorReducer } from '../contexts/CalculatorContext';
import { getIssueTab, getRoomFeedback } from '../services/roomFeedback';
import { roomInputKey, validateRoom } from '../services/validationService';
import type { CalculationResults, RoomState, State } from '../types';

const feedback = (room: RoomState, name = 'Projekt', loaded = true) => getRoomFeedback(room, validateRoom(room), name, loaded);
const validRoom = () => ({ ...createInitialRoomState(), input: { roomArea: '20', tInternal: '24', rhInternal: '50' } });
const withResult = (room: RoomState): RoomState => {
    const result = {} as CalculationResults; // These tests concern availability, not calculation values.
    return { ...room, results: { withShading: result, withoutShading: result }, activeResults: result, calculatedInputKey: roomInputKey(room) };
};
const project = (room: RoomState): State => ({
    projectName: 'Projekt', rooms: [room], systems: [], activeRoomId: 'aggregate', activeTab: 'rts',
    allData: null, toasts: [], isShadingViewActive: true,
} as State);

describe('informacja o danych i wynikach', () => {
    it('traktuje nowe pomieszczenie jako puste, także przed załadowaniem danych', () => {
        expect(feedback(createInitialRoomState(), 'Projekt', false).status).toBe('empty');
        expect(feedback(createInitialRoomState()).status).toBe('empty');
    });
    it('pokazuje brak powierzchni, gdy użytkownik zaczął konfigurować pomieszczenie', () => {
        const room = createInitialRoomState();
        room.internalGains.people.enabled = true;
        expect(feedback(room).status).toBe('invalid');
        expect(feedback(room).issues[0].path).toBe('input.roomArea');
    });
    it('odróżnia usunięcie wymaganej wartości po obliczeniu od nowego pomieszczenia', () => {
        const room = withResult(validRoom());
        room.input.roomArea = '';
        room.activeResults = null;
        expect(feedback(room)).toMatchObject({ status: 'invalid', hasPreviousResult: true });
    });
    it('nie pokazuje oczekiwania na wyniki dla błędnych danych', () => {
        const room = validRoom();
        room.input.roomArea = '-5';
        expect(feedback(room).status).toBe('invalid');
    });
    it('rozróżnia ładowanie danych, przeliczanie i błąd silnika', () => {
        const room: RoomState = validRoom();
        expect(feedback(room, 'Projekt', false).status).toBe('loading');
        expect(feedback(room).status).toBe('updating');
        room.calculationError = 'Brak danych pogodowych.';
        expect(feedback(room)).toMatchObject({ status: 'error', message: 'Brak danych pogodowych.' });
    });
    it('pozwala pokazać wyniki z ostrzeżeniem o nietypowych założeniach', () => {
        const room = validRoom();
        room.input.tInternal = '14';
        const status = feedback(withResult(room));
        expect(status.status).toBe('ready');
        expect(status.issues).toEqual([expect.objectContaining({ severity: 'warning', path: 'input.tInternal' })]);
    });
    it('uwzględnia pustą nazwę projektu w szczegółach statusu', () => {
        const status = feedback(withResult(validRoom()), '');
        expect(status.status).toBe('invalid');
        expect(status.issues[0].path).toBe('projectName');
    });
    it('prowadzi do odpowiedniej sekcji dla błędów poza danymi podstawowymi', () => {
        expect(getIssueTab('internalGains.ventilation.airflow')).toBe('ventilation');
        expect(getIssueTab('internalGains.people.count')).toBe('internal');
        expect(getIssueTab('windows.0.width')).toBe('windows');
        expect(getIssueTab('walls.0.u')).toBe('walls');
    });
});

describe('rozpoczęcie pracy w nowym pomieszczeniu', () => {
    it('otwiera dane wejściowe i żąda fokusu powierzchni także z widoku zbiorczego', () => {
        const previous = project(validRoom());
        const next = calculatorReducer(previous, { type: 'ADD_ROOM' });
        expect(next.activeTab).toBe('input');
        expect(next.inputFocusRequest).toEqual({ roomId: next.activeRoomId, field: 'roomArea' });
        expect(next.rooms[0]).toBe(previous.rooms[0]);
        expect(feedback(next.rooms[1]).status).toBe('empty');
    });
    it('zachowuje zakładkę podczas duplikowania uzupełnionego pomieszczenia', () => {
        const previous = project(validRoom());
        const next = calculatorReducer(previous, { type: 'DUPLICATE_ROOM', payload: previous.rooms[0].id });
        expect(next.activeTab).toBe('rts');
        expect(next.inputFocusRequest).toBeUndefined();
        expect(next.rooms[1].input.roomArea).toBe('20');
    });
    it('po kliknięciu problemu przenosi do wskazanego pola bez zmiany danych', () => {
        const previous = { ...project(validRoom()), activeRoomId: 'room-1' };
        const next = calculatorReducer(previous, { type: 'FOCUS_ROOM_INPUT', payload: 'rhInternal' });
        expect(next.activeTab).toBe('input');
        expect(next.inputFocusRequest?.field).toBe('rhInternal');
        expect(next.rooms).toEqual(previous.rooms);
        expect(calculatorReducer(next, { type: 'CLEAR_INPUT_FOCUS' }).inputFocusRequest).toBeUndefined();
    });
});
