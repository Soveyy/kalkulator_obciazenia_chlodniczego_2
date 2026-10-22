import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { calculatorReducer } from '../contexts/CalculatorContext';
import { createInitialRoomState } from '../data/defaults';
import { calculateGainsForMonth, generateTemperatureProfile } from '../services/calculationService';
import { calculateRoom } from '../services/roomCalculation';
import { getDisplayedRoomResult, getRoomFeedback } from '../services/roomFeedback';
import { isRoomResultCurrent, roomInputKey, validateRoom } from '../services/validationService';
import type { AllData, RoomState, State } from '../types';

const json = (name: string) => JSON.parse(readFileSync(new URL('../public/data/' + name, import.meta.url), 'utf8'));
const parseSolar = (v: any): any => typeof v === 'string' ? JSON.parse(v) : Array.isArray(v) ? v : Object.fromEntries(Object.entries(v).map(([k, child]) => [k, parseSolar(child)]));
const data: AllData = { nsrdb: parseSolar(json('baza_danych_NSRDB.json')), rts: json('rts_factors.json'), shading: json('shading_database.json'), warsaw_weather: json('warsaw_weather.json'), cts: json('cts_factors.json') };
const room = (): RoomState => {
    const r = createInitialRoomState();
    r.input.roomArea = '20';
    r.internalGains.equipment = [{ id: 1, name: 'Test', quantity: 1, power: 1000, startHour: 8, endHour: 16 }];
    return r;
};
const state = (r = room()): State => ({ projectName: 'Test', rooms: [r], systems: [], activeRoomId: r.id, allData: data, isShadingViewActive: true, toasts: [] } as State);
const response = (r: RoomState) => ({ type: 'SET_RESULTS' as const, payload: {
    ...calculateRoom(r, data, r.currentMonth, true),
    ticket: { roomId: r.id, inputKey: roomInputKey(r), month: r.currentMonth, shading: true },
} });
const displayed = (r: RoomState) => getDisplayedRoomResult(r, getRoomFeedback(r, validateRoom(r), 'Test', true), true);

describe('obliczenia w tle', () => {
    it('zachowuje dotychczasowy model obliczeń i zwraca pełny rok oraz oba warianty', () => {
        const r = room();
        const result = calculateRoom(r, data, '7', true);
        for (const withoutShading of [false, true]) {
            expect(result.results[withoutShading ? 'withoutShading' : 'withShading']).toEqual(
                calculateGainsForMonth(r.windows, r.walls, r.input, generateTemperatureProfile('7', data), '7', data, r.accumulation, r.internalGains, withoutShading),
            );
        }
        expect(result.yearlyMatrix).toHaveLength(12);
        expect(result.yearlyMatrix!.every(month => month.length === 24)).toBe(true);
        expect(result.yearlyMatrix![6]).toEqual(result.results.withShading.finalGains.clearSky.coolingTotal);
    });

    it.each(['input', 'month', 'shading', 'deleted'])('odrzuca opóźniony wynik po zmianie: %s', change => {
        const original = state();
        const action = response(original.rooms[0]);
        const next = structuredClone(original);
        if (change === 'input') next.rooms[0].input.roomArea = '30';
        if (change === 'month') next.rooms[0].currentMonth = '8';
        if (change === 'shading') next.isShadingViewActive = false;
        if (change === 'deleted') next.rooms = [];
        expect(calculatorReducer(next, action)).toEqual(next);
    });

    it('przypisuje wynik do właściwego pomieszczenia po przełączeniu zakładki', () => {
        const original = state();
        const action = response(original.rooms[0]);
        const other = { ...room(), id: 'other' };
        const next = calculatorReducer({ ...original, rooms: [...original.rooms, other], activeRoomId: other.id }, action);
        expect(isRoomResultCurrent(next.rooms[0])).toBe(true);
        expect(next.rooms[1]).toBe(other);
        expect(next.rooms[1].activeResults).toBeNull();
    });

    it('zachowuje podgląd przy poprawnej edycji, ale nie pozwala eksportować starego wyniku', () => {
        const original = state();
        const calculated = calculatorReducer(original, response(original.rooms[0]));
        const pending = calculatorReducer(calculated, { type: 'SET_INPUT', payload: { ...calculated.rooms[0].input, projectName: 'Test', roomArea: '30' } });
        expect(displayed(pending.rooms[0])).toBe(calculated.rooms[0].activeResults);
        expect(pending.rooms[0].activeResults).toBeNull();
        expect(isRoomResultCurrent(pending.rooms[0])).toBe(false);
        const finished = calculatorReducer(pending, response(pending.rooms[0]));
        expect(isRoomResultCurrent(finished.rooms[0])).toBe(true);
    });

    it('nie pokazuje starego podglądu po błędnych danych lub błędzie silnika', () => {
        const original = state();
        const calculated = calculatorReducer(original, response(original.rooms[0]));
        const invalid = calculatorReducer(calculated, { type: 'SET_INPUT', payload: { ...calculated.rooms[0].input, projectName: 'Test', roomArea: '' } });
        expect(displayed(invalid.rooms[0])).toBeNull();
        const failed = calculatorReducer(calculated, { type: 'SET_CALCULATION_ERROR', payload: {
            ticket: response(calculated.rooms[0]).payload.ticket, error: 'Błąd obliczeń.',
        } });
        expect(displayed(failed.rooms[0])).toBeNull();
    });

    it('odrzuca błąd dotyczący poprzednich danych', () => {
        const original = state();
        const ticket = response(original.rooms[0]).payload.ticket;
        const edited = calculatorReducer(original, { type: 'SET_INPUT', payload: { ...original.rooms[0].input, projectName: 'Test', roomArea: '30' } });
        const result = calculatorReducer(edited, { type: 'SET_CALCULATION_ERROR', payload: { ticket, error: 'Stary błąd.' } });
        expect(result.rooms[0].calculationError).toBeUndefined();
    });

    it('zmiana miesiąca i osłon oczekuje na worker bez kasowania podglądu', () => {
        const original = state();
        const calculated = calculatorReducer(original, response(original.rooms[0]));
        for (const action of [{ type: 'RECALCULATE_VIEW' as const, payload: '8' }, { type: 'SET_SHADING_VIEW' as const, payload: false }]) {
            const pending = calculatorReducer(calculated, action);
            expect(pending.rooms[0].activeResults).toBeNull();
            expect(pending.rooms[0].results).toBe(calculated.rooms[0].results);
            expect(isRoomResultCurrent(pending.rooms[0])).toBe(false);
        }
    });
});
