import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createInitialRoomState } from '../data/defaults';
import { calculateGainsForMonth, calculateWorstMonth, generateTemperatureProfile } from '../services/calculationService';
import { coolingDemand, coolingProfile, isHourActive, scheduleLabel, summarizeResult } from '../services/resultModel';
import { assertRoomValid, parseNumber, roomInputKey, validateRoom } from '../services/validationService';
import { createProjectSnapshot, sanitizeProjectData } from '../services/projectDataService';
import { aggregateResults } from '../services/aggregateResults';
import { acknowledgeSave, mergeProjects, parseCloudProjects } from '../services/projectSyncService';
import { getRecommendedUnitCapacity, generateHVACExportPayload } from '../lib/exportUtils';
import { calculatorReducer } from '../contexts/CalculatorContext';
import { ADVANCED_APPLIANCES } from '../data/advancedAppliances';
import type { AllData, RoomState, SavedProject, State, Window } from '../types';
import LZString from 'lz-string';
import { decompressProjectLink } from '../services/shareDataService';

const json = (name: string) => JSON.parse(readFileSync(new URL('../public/data/' + name, import.meta.url), 'utf8'));
const parseSolar = (v: any): any => typeof v === 'string' ? JSON.parse(v) : Array.isArray(v) ? v : Object.fromEntries(Object.entries(v).map(([k, child]) => [k, parseSolar(child)]));
const data: AllData = { nsrdb: parseSolar(json('baza_danych_NSRDB.json')), rts: json('rts_factors.json'), shading: json('shading_database.json'), warsaw_weather: json('warsaw_weather.json'), cts: json('cts_factors.json') };
const room = (id = 'room-1') => { const r = createInitialRoomState(id); r.input.roomArea = '20'; return r; };
const project = (rooms = [room()]) => ({ projectName: 'Test', rooms, systems: [], activeRoomId: rooms[0].id });
const state = (rooms = [room()]): State => ({ ...project(rooms), allData: data, isShadingViewActive: true, toasts: [] } as State);
const calc = (r: RoomState, month = '7') => calculateGainsForMonth(r.windows, r.walls, r.input, generateTemperatureProfile(month, data), month, data, r.accumulation, r.internalGains, false);
const withResults = (r: RoomState) => {
    const result = calc(r);
    return { ...r, results: { withShading: result, withoutShading: result }, activeResults: result, calculatedInputKey: roomInputKey(r), ...calculateWorstMonth(r.windows, r.walls, data, r.input, r.accumulation, r.internalGains) };
};
const window: Window = { id: 1, type: 'modern', direction: 'S', tilt: 90, width: 2, height: 2, u: 0.9, shgc: 0.5, shading: { enabled: false, type: 'louvers', location: 'indoor', color: 'light', setting: 'tilted_45', material: 'open' } };

describe('obciążenie chłodnicze i prezentacja', () => {
    it('zachowuje ujemny bilans wilgoci bez obniżania zapotrzebowania jawnego', () => {
        const r = room(); r.input.rhInternal = '70'; r.accumulation.include = false;
        r.internalGains.equipment = [{ id: 1, name: 'Sprzęt', quantity: 1, power: 1000, startHour: 0, endHour: 24 }];
        Object.assign(r.internalGains.ventilation, { enabled: true, type: 'mechanical', airflow: 150, heatRecoveryEfficiency: 0, moistureRecoveryEfficiency: 0 });
        const result = calc(r).finalGains.clearSky;
        expect(result.latent[12]).toBeLessThan(0);
        expect(result.total[12]).toBeLessThan(result.sensible[12]);
        expect(coolingProfile(result)[12]).toBeCloseTo(result.sensible[12], 8);
        expect(summarizeResult(result).coolingEnergyKWh).toBeGreaterThan(summarizeResult(result).netEnergyKWh);
    });
    it('sumuje bilans wilgoci przed obcięciem, bez dodawania różnych godzin szczytu', () => {
        expect(coolingDemand(1440, 200 - 300)).toBe(1440);
        expect(coolingDemand(1440, 300)).toBe(1740);
        const result = { sensible: [1000, 100], latent: [0, 500], total: [1000, 600] };
        expect(summarizeResult(result)).toMatchObject({ peak: 1000, hour: 0, latent: 0 });
    });
    it.each([[8, 8, 24], [0, 24, 24], [24, 0, 24], [22, 6, 8], [8, 16, 8]])('harmonogram %s–%s ma %s h', (start, end, hours) => {
        expect(Array.from({ length: 24 }, (_, h) => isHourActive(h, start, end)).filter(Boolean)).toHaveLength(hours);
        if (hours === 24) expect(scheduleLabel(start, end)).toContain('24 h');
    });
    it('nie przypisuje wilgoci urządzeń do nieobecnych ludzi', () => {
        const appliance = ADVANCED_APPLIANCES.find(a => a.qLatW > 0)!;
        const r = room(); r.internalGains.advancedAppliances = [{ id: 'a', catalogId: appliance.id, quantity: 1, startHour: 0, endHour: 24 }];
        const result = calc(r).finalGains.clearSky;
        expect(result.peopleLatent!.every(n => n === 0)).toBe(true);
        expect(result.equipmentLatent!.some(n => n > 0)).toBe(true);
    });
    it('sumuje zapotrzebowania osobnych pomieszczeń, bez kompensowania ich wilgocią innych pokoi', () => {
        const a = withResults(room('a')); const b = withResults(room('b'));
        a.activeResults.finalGains.clearSky = { sensible: Array(24).fill(1000), latent: Array(24).fill(-500), total: Array(24).fill(500), coolingTotal: Array(24).fill(1000) };
        b.activeResults.finalGains.clearSky = { sensible: Array(24).fill(1000), latent: Array(24).fill(300), total: Array(24).fill(1300), coolingTotal: Array(24).fill(1300) };
        const aggregate = aggregateResults(state([a, b]))!;
        expect(aggregate.aggregatePeak).toBe(2300);
        expect(aggregate.aggregateFinalGains.clearSky.total[0]).toBe(1800);
        expect(aggregate.roomProfiles.reduce((sum, r) => sum + r.area, 0)).toBe(40);
    });
    it('odczyt dwóch pomieszczeń daje numeryczne powierzchnie do PDF i nie zaokrągla przed sumowaniem', () => {
        const saved = createProjectSnapshot(project([room('a'), room('b')]));
        const rooms = sanitizeProjectData(JSON.parse(JSON.stringify(saved))).rooms.map(withResults);
        const aggregate = aggregateResults(state(rooms))!;
        expect(aggregate.roomProfiles[0].area.toFixed(1)).toBe('20.0');
        rooms[0].activeResults!.finalGains.clearSky.coolingTotal = Array(24).fill(1004);
        rooms[1].activeResults!.finalGains.clearSky.coolingTotal = Array(24).fill(1004);
        expect(aggregateResults(state(rooms))!.aggregatePeak).toBe(2008);
    });
    it('nie eksportuje fikcyjnego SHR ani urządzenia mniejszego od wymagania', () => {
        expect(getRecommendedUnitCapacity(20000)).toBeNull();
        expect(getRecommendedUnitCapacity(0)).toBe(0);
        const r = room(); r.internalGains.equipment = [{ id: 1, name: 'Test', quantity: 1, power: 1000, startHour: 0, endHour: 24 }];
        const exported = generateHVACExportPayload(state([withResults(r)]));
        expect(exported.unassignedRooms[0].sensibleHeatRatio).toBe(1);
    });
});

describe('wspólne zasady danych', () => {
    it('nie zastępuje bieżącego projektu po odrzuceniu nieprawidłowej struktury', () => {
        const previous = state();
        const next = calculatorReducer(previous, { type: 'SET_STATE', payload: { rooms: [room('duplicate'), room('duplicate')] } });
        expect(next.rooms).toBe(previous.rooms);
        expect(next.toasts.at(-1)?.type).toBe('danger');
    });
    it('szybkie duplikowanie nadaje unikalne ID, a widok zbiorczy nadal jest dostępny', () => {
        let current = state();
        for (let i = 0; i < 9; i++) current = calculatorReducer(current, { type: 'DUPLICATE_ROOM', payload: 'room-1' });
        expect(current.rooms).toHaveLength(10);
        expect(new Set(current.rooms.map(r => r.id)).size).toBe(10);
        expect(calculatorReducer(current, { type: 'SWITCH_ROOM', payload: 'aggregate' }).activeRoomId).toBe('aggregate');
    });
    it('usunięcie pomieszczenia usuwa jego przypisanie w układzie', () => {
        const previous = state([room('a'), room('b')]);
        previous.systems = [{ id: 's', name: 'S', type: 'multi', outdoorModel: '', applyTempCorrection: false, indoorUnits: [{ roomId: 'a', index: 20 }, { roomId: 'b', index: 25 }] }];
        const next = calculatorReducer(previous, { type: 'DELETE_ROOM', payload: 'a' });
        expect(next.systems[0].indoorUnits).toEqual([{ roomId: 'b', index: 25 }]);
    });
    it('odczytuje dotychczasowe linki i ogranicza rozmiar w trakcie dekompresji', () => {
        for (const text of [JSON.stringify(createProjectSnapshot(project())), 'żółć 🙂'.repeat(1000), 'abcdef'.repeat(10000)]) {
            expect(decompressProjectLink(LZString.compressToEncodedURIComponent(text))).toBe(text);
        }
        expect(() => decompressProjectLink(LZString.compressToEncodedURIComponent('x'.repeat(20000)), 10000)).toThrow(/zbyt duży|limit/);
        expect(() => decompressProjectLink('!!invalid')).toThrow();
    });
    it.each([10, 50, 90])('zachowuje RTS %s po zapisie, JSON i odczycie', value => {
        const r = room(); r.accumulation.glassPercentage = value as 10 | 50 | 90;
        const restored = sanitizeProjectData(JSON.parse(JSON.stringify(createProjectSnapshot(project([r])))));
        expect(restored.rooms[0].accumulation.glassPercentage).toBe(value);
    });
    it('odróżnia zero, brak, przecinek i niepoprawny tekst', () => {
        expect(parseNumber('20,5')).toBe(20.5);
        expect(parseNumber(0)).toBe(0);
        for (const value of ['', '20abc', '1e309', Infinity, NaN, null, true]) expect(parseNumber(value)).toBeNull();
    });
    it.each(['', '0', '-1', '1e309', '20abc'])('silnik odrzuca powierzchnię %s zamiast używać 20 m²', value => {
        const r = room(); r.input.roomArea = value;
        expect(() => calc(r)).toThrow();
    });
    it('zero RH, przepływu i wiatru nie jest zastępowane wartością domyślną', () => {
        const r = room(); r.input.rhInternal = '0';
        Object.assign(r.internalGains.ventilation, { includeInfiltration: true, windSpeed: 0, exteriorWallPerimeter: 10, roomHeight: 2.7 });
        assertRoomValid(r);
        const calm = calc(r).infiltrationLoad.sensible;
        r.internalGains.ventilation.windSpeed = 3.4;
        const wind = calc(r).infiltrationLoad.sensible;
        expect(calm[12]).toBeLessThan(wind[12]);
    });
    it('odrzuca sprawność 120%, ułamkową liczbę sztuk i puste pole temperatury poddasza', () => {
        const r = room(); Object.assign(r.internalGains.ventilation, { enabled: true, type: 'mechanical', heatRecoveryEfficiency: 120 });
        expect(() => calc(r)).toThrow(/Odzysk ciepła/);
        r.internalGains.ventilation.enabled = false;
        r.internalGains.equipment = [{ id: 1, name: 'Test', power: 100, quantity: 0.5, startHour: 8, endHour: 8 }];
        expect(() => calc(r)).toThrow(/całkowitą/);
        r.internalGains.equipment = [];
        r.walls = [{ id: 1, type: 'stropodach_zelbetowy_ocieplony', boundaryType: 'unconditioned', unconditionedType: 'ceiling_hot_attic', adjacentTemperature: '' as any, u: .15, area: 20, direction: 'S', tilt: 0 }];
        expect(() => calc(r)).toThrow(/Temperatura sąsiedniej/);
        r.walls[0].adjacentTemperature = 0;
        expect(calc(r).wallGainsLoad.clearSky.sensible[0]).toBe(-72);
    });
    it('szkic zachowuje brak i niepoprawny wpis bez cichej naprawy', () => {
        const r = room(); r.input.roomArea = ''; r.input.rhInternal = '120';
        const saved = createProjectSnapshot(project([r]));
        expect(saved.draft).toBe(true);
        const restored = sanitizeProjectData(saved);
        expect(restored.rooms[0].input).toMatchObject({ roomArea: '', rhInternal: '120' });
        expect(() => calc(restored.rooms[0])).toThrow();
    });
    it('import brakującej geometrii okna tworzy szkic, nie okno o wymiarach domyślnych', () => {
        const r = room(); r.windows = [{ ...window, width: undefined as any }];
        const imported = sanitizeProjectData(project([r]));
        expect(imported.draft).toBe(true);
        expect(imported.rooms[0].windows[0].width).toBe('');
        expect(() => calc(imported.rooms[0])).toThrow(/Szerokość/);
    });
    it('nieznany tryb osłony i tekst zamiast przełącznika nie stają się cichym fallbackiem', () => {
        const r = room(); r.windows = [{ ...window, shading: { ...window.shading, enabled: true, type: 'wrong' as any } }];
        expect(() => calc(r)).toThrow(/Typ osłony/);
        r.windows = []; r.internalGains.people.enabled = 'false' as any;
        expect(() => sanitizeProjectData(project([r]))).toThrow(/włącz\/wyłącz/);
    });
    it('brak rekordu solar/CTS/RTS lub osłony zatrzymuje obliczenia', () => {
        const r = room(); r.windows = [{ ...window, direction: 'BAD' }];
        expect(() => calc(r)).toThrow(/Kierunek/);
        r.windows = [window];
        const broken = { ...data, nsrdb: {} };
        expect(() => calculateGainsForMonth(r.windows, [], r.input, Array(24).fill(32), '7', broken, r.accumulation, r.internalGains, false)).toThrow(/Okno 1/);
        expect(() => calculateGainsForMonth([], [], r.input, Array(24).fill(32), '7', { ...data, rts: {} }, r.accumulation, r.internalGains, false)).toThrow(/RTS/);
        const w = { ...window, shading: { ...window.shading, enabled: true, setting: 'bad' } };
        expect(() => calculateGainsForMonth([w], [], r.input, Array(24).fill(32), '7', data, r.accumulation, r.internalGains, false)).toThrow(/osłony/);
    });
    it('egzekwuje limit 10 w imporcie i bezpośrednich akcjach dodawania/duplikowania', () => {
        const ten = Array.from({ length: 10 }, (_, i) => room(String(i)));
        expect(() => sanitizeProjectData(project([...ten, room('11')]))).toThrow();
        for (const action of [{ type: 'ADD_ROOM' }, { type: 'DUPLICATE_ROOM', payload: '0' }] as const) {
            expect(calculatorReducer(state(ten), action).rooms).toHaveLength(10);
        }
    });
    it('odrzuca duplikaty urządzeń i wielokrotne/niewłaściwe powiązania układów', () => {
        const r = room(); const item = { id: 1, name: 'Test', quantity: 1, power: 100, startHour: 0, endHour: 24 }; r.internalGains.equipment = [item, item];
        expect(() => sanitizeProjectData(project([r]))).toThrow(/identyfikatory/);
        const system = { id: 's', name: 'S', type: 'multi', indoorUnits: [{ roomId: 'room-1', index: 20 }, { roomId: 'room-1', index: 20 }] };
        expect(() => sanitizeProjectData({ ...project(), systems: [system] })).toThrow(/wielokrotnie/);
        expect(() => sanitizeProjectData({ ...project(), systems: [{ ...system, indoorUnits: [{ roomId: 'deleted' }] }] })).toThrow(/nieistniejącego/);
    });
    it('zmiana danych od razu unieważnia stary wynik, nie dopiero po debounce', () => {
        const previous = state([withResults(room())]);
        const next = calculatorReducer(previous, { type: 'SET_INPUT', payload: { projectName: 'Test', ...previous.rooms[0].input, roomArea: '' } });
        expect(next.rooms[0].activeResults).toBeNull();
        expect(aggregateResults(next)).toBeNull();
    });
});

describe('ochrona wersji zapisanych projektów', () => {
    const saved = (revision: string, baseRevision: string | null, area = '20'): SavedProject => ({ id: 'uuid', name: 'Dom A', date: '2026-09-17', revision, baseRevision, syncStatus: 'pending', isLocal: true, data: { ...project(), rooms: [{ ...room(), input: { ...room().input, roomArea: area } }] } });
    it('starszy snapshot chmury nie zastępuje lokalnej zmiany', () => {
        const local = saved('local-new', 'cloud-old', '30'); const cloud = { ...saved('cloud-old', 'cloud-old'), isCloud: true, syncStatus: 'synced' as const };
        const merged = mergeProjects([local], [cloud]);
        expect(merged[0].data.rooms[0].input.roomArea).toBe('30');
        expect(merged[0].syncStatus).toBe('pending');
    });
    it('równoległe zmiany zachowują obie kopie i wymagają rozstrzygnięcia', () => {
        const merged = mergeProjects([saved('local', 'base', '30')], [saved('remote', 'remote', '40')]);
        expect(merged[0].syncStatus).toBe('conflict');
        expect(merged[0].data.rooms[0].input.roomArea).toBe('30');
        expect(merged[0].cloudCopy!.data.rooms[0].input.roomArea).toBe('40');
    });
    it('opóźnione potwierdzenie starszej wysyłki nie oznacza nowszych zmian jako zsynchronizowanych', () => {
        expect(acknowledgeSave(saved('v3', 'v1', '30'), saved('v2', 'v1'))).toMatchObject({ revision: 'v3', baseRevision: 'v2', syncStatus: 'pending' });
    });
    it('nazwy Dom A oraz Dom.A nie łączą projektów o odrębnych ID', () => {
        const a = saved('a', null); const b = { ...saved('b', 'b'), id: 'different', name: 'Dom.A' };
        expect(mergeProjects([a], [b])).toHaveLength(2);
    });
    it('niezgodny stary dokument nie ukrywa pozostałych projektów chmurowych', () => {
        const valid = {
            name: 'Poprawny projekt', date: '2026-09-20T12:00:00.000Z',
            data: JSON.stringify(createProjectSnapshot(project())), userId: 'user-1',
            createdAt: { seconds: 1 }, updatedAt: { seconds: 2 },
        };
        const result = parseCloudProjects([
            { id: 'valid', data: () => valid },
            { id: 'legacy-broken', data: () => ({ ...valid, name: 'Stary projekt', data: '{' }) },
        ]);

        expect(result.projects.map(item => item.name)).toEqual(['Poprawny projekt']);
        expect(result.rejected).toMatchObject([{ id: 'legacy-broken', name: 'Stary projekt' }]);
    });
});
