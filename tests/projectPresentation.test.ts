import { describe, expect, it } from 'vitest';
import { createInitialRoomState } from '../data/defaults';
import { aggregateResults } from '../services/aggregateResults';
import { projectPresentationData } from '../services/projectPresentation';
import { roomInputKey } from '../services/validationService';
import type { CalculationResults, RoomState, State } from '../types';

const profile = (hour: number, value: number) => Array.from({ length: 24 }, (_, h) => h === hour ? value : 0);
function room(id: string, sensible: number[], latent = Array(24).fill(0)): RoomState {
    const room = createInitialRoomState(id);
    room.name = id;
    room.input.roomArea = '20';
    room.currentMonth = '7';
    room.activeResults = { finalGains: { clearSky: { sensible, latent, total: sensible.map((value, h) => value + latent[h]) } } } as CalculationResults;
    room.calculatedInputKey = roomInputKey(room);
    room.yearlyMatrix = Array.from({ length: 12 }, () => sensible.map((value, h) => Math.max(0, value) + Math.max(0, latent[h])));
    return room;
}
const aggregate = (rooms: RoomState[]) => aggregateResults({ rooms } as State)!;

describe('dane prezentacji projektu', () => {
    it('pokazuje udział w wspólnym szczycie, a nie sumę szczytów z różnych godzin', () => {
        const result = aggregate([room('Rano', profile(10, 1000)), room('Wieczorem', profile(15, 2000))]);
        const data = projectPresentationData(result, 7);
        expect(result.sumOfPeaks).toBe(3000);
        expect(result.aggregatePeak).toBe(2000);
        expect(data.localPeakHour).toBe(17);
        expect(data.ranking.map(item => [item.name, item.coincidentLoad, item.share])).toEqual([['Wieczorem', 2000, 1], ['Rano', 0, 0]]);
        expect(data.coolingEnergyKWh).toBe(3);
        expect(data.loadDensity).toBe(50);
        expect(result.roomProfiles.map(item => item.name)).toEqual(['Rano', 'Wieczorem']);
    });
    it('podział jawne/utajone nie kompensuje wilgocią chłodzenia innych pomieszczeń', () => {
        const result = aggregate([room('Suche', profile(12, 1000), profile(12, -500)), room('Wilgotne', profile(12, 1000), profile(12, 300))]);
        const data = projectPresentationData(result, 7);
        expect(data.sensible).toBe(2000);
        expect(data.latent).toBe(300);
        expect(data.sensible + data.latent).toBe(result.aggregatePeak);
    });
    it('przesuwa pełny profil z UTC do czasu lokalnego, w tym przez północ', () => {
        const result = aggregate([room('Pokój', profile(23, 1000))]);
        expect(projectPresentationData(result, 7).hourly[1]).toBe(1000);
        expect(projectPresentationData(result, 7).localPeakHour).toBe(1);
        expect(projectPresentationData(result, 1).hourly[0]).toBe(1000);
    });
    it('wyznacza sezonowe maksimum z jednoczesnych obciążeń całego projektu', () => {
        const a = room('A', profile(10, 1000));
        const b = room('B', profile(15, 2000));
        a.yearlyMatrix![5] = profile(15, 2000);
        const data = projectPresentationData(aggregate([a, b]), 7);
        expect(data.season).toHaveLength(6);
        expect(data.season[0]).toEqual({ month: 4, peak: 2000 });
        expect(data.season[2]).toEqual({ month: 6, peak: 4000 });
        expect(data.criticalMonth).toBe(6);
    });
    it('obsługuje zerowe obciążenie bez fikcyjnych udziałów i krytycznego miesiąca', () => {
        const data = projectPresentationData(aggregate([room('Pusty', Array(24).fill(0))]), 7);
        expect(data.ranking[0].share).toBe(0);
        expect(data.coolingEnergyKWh).toBe(0);
        expect(data.criticalMonth).toBeNull();
    });
    it('nie przedstawia brakujących danych sezonowych jako zerowego obciążenia', () => {
        const a = room('A', profile(10, 1000));
        a.yearlyMatrix = undefined;
        expect(projectPresentationData(aggregate([a]), 7).season).toEqual([]);
    });
});
