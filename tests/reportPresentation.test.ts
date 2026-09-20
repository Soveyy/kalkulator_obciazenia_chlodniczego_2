import { describe, expect, it } from 'vitest';
import { createInitialRoomState } from '../data/defaults';
import { formatNumber, localHour, localSeries, roomReportData, seasonalPeak, reportFileName } from '../services/reportPresentation';
import type { CalculationResults } from '../types';

describe('prezentacja raportów bez zmiany obliczeń', () => {
    it('zachowuje jawne obciążenie i osobno pokazuje ujemny bilans wilgoci', () => {
        const room = createInitialRoomState();
        const series = (v: number) => Array(24).fill(v);
        room.activeResults = {
            finalGains: { clearSky: { sensible: series(1440), latent: series(-335), total: series(1105), coolingTotal: series(1440) } },
            loadComponents: { solar: series(0), conduction: series(0), internalSensible: series(1000), ventilationSensible: series(440), infiltrationSensible: series(0) },
            components: { internalGainsLatent: series(0) },
            ventilationLoad: { latent: series(-335) }, infiltrationLoad: { latent: series(0) },
        } as CalculationResults;
        const model = roomReportData(room);
        expect(model.summary).toMatchObject({ peak: 1440, sensible: 1440, latent: 0, latentNet: -335, net: 1105 });
        expect(model.source.find(s => s.label === 'Wentylacja')).toMatchObject({ sensible: 440, latent: -335 });
        expect(model.positive.reduce((sum, s) => sum + s.value, 0)).toBe(1440);
    });
    it('nie nazywa częściowej listy wyników maksimum kwiecień-wrzesień', () => {
        const room = createInitialRoomState();
        room.monthlyPeaks = [{ month: '7', peak: 1400 }];
        expect(seasonalPeak(room)).toBeNull();
        room.monthlyPeaks = [4, 5, 6, 7, 8, 9].map(month => ({ month: String(month), peak: month === 5 ? 1800 : 1400 }));
        expect(seasonalPeak(room)).toEqual({ month: '5', peak: 1800 });
    });
    it('utrzymuje zgodność opisu szczytu i osi czasu po zmianie doby UTC na lokalną', () => {
        const values = Array.from({ length: 24 }, (_, h) => h);
        expect(localHour(23, '7')).toBe('01:00');
        expect(localSeries(values, '7')[1]).toBe(23);
        expect(localHour(23, '1')).toBe('00:00');
        expect(localSeries(values, '1')[0]).toBe(23);
    });
    it('odróżnia brak wartości od zera i zachowuje polski zapis liczb', () => {
        expect(formatNumber('0', 2)).toBe('0,00');
        expect(formatNumber('', 2)).toBe('-');
        expect(formatNumber('23,5')).toBe('23,5');
        expect(formatNumber(-0.001, 2)).toBe('0,00');
        expect(formatNumber(Infinity)).toBe('-');
    });
    it('ogranicza nazwę pobieranego pliku bez znaków ścieżki', () => {
        const name = reportFileName('Raport', 'Projekt/'.repeat(50), 'Salon: <test>');
        expect(name.length).toBeLessThan(150);
        expect(name).not.toMatch(/[<>:"/\\|?*]/);
        expect(name).toMatch(/\.pdf$/);
    });
});
