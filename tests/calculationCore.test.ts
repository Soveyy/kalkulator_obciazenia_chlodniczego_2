import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ANALYSIS_MONTHS } from '../constants';
import { applyRTS, generateAshraeTemperatureProfile } from '../services/calculationService';

describe('podstawowe niezmienniki silnika obliczeniowego', () => {
    it('ogranicza automatyczny wybór miesiąca do kwietnia–września', () => {
        expect(ANALYSIS_MONTHS).toEqual({
            START: 4,
            END: 9,
            ARRAY: [4, 5, 6, 7, 8, 9],
        });
    });

    it('generuje 24-godzinny profil temperatury z zadanym maksimum i zakresem dobowym', () => {
        const profile = generateAshraeTemperatureProfile(35, 10);

        expect(profile).toHaveLength(24);
        expect(Math.max(...profile)).toBe(35);
        expect(Math.min(...profile)).toBe(25);
        expect(profile[12]).toBe(35);
        expect(profile[13]).toBe(35);
    });

    it('stosuje RTS jako cykliczny splot godzinowy', () => {
        const gains = Array(24).fill(0);
        gains[5] = 100;
        const factors = [0.6, 0.3, 0.1, ...Array(21).fill(0)];

        const load = applyRTS(gains, factors);

        expect(load[5]).toBeCloseTo(60, 10);
        expect(load[6]).toBeCloseTo(30, 10);
        expect(load[7]).toBeCloseTo(10, 10);
        expect(load.reduce((sum, value) => sum + value, 0)).toBeCloseTo(100, 10);
    });

    it('chroni format docelowego presetu very_heavy oraz tabel CTS', () => {
        const rts = JSON.parse(readFileSync(new URL('../public/data/rts_factors.json', import.meta.url), 'utf8'));
        const cts = JSON.parse(readFileSync(new URL('../public/data/cts_factors.json', import.meta.url), 'utf8'));

        for (const floorType of Object.values(rts.very_heavy) as Record<string, { solar: number[]; nonsolar: number[] }>[]) {
            for (const series of Object.values(floorType)) {
                expect(series.solar).toHaveLength(24);
                expect(series.nonsolar).toHaveLength(24);
                expect(series.solar.reduce((sum, value) => sum + value, 0)).toBeCloseTo(1, 2);
                expect(series.nonsolar.reduce((sum, value) => sum + value, 0)).toBeCloseTo(1, 2);
            }
        }

        for (const series of Object.values(cts.cts_coefficients) as number[][]) {
            expect(series).toHaveLength(24);
            expect(series.reduce((sum, value) => sum + value, 0)).toBeCloseTo(1, 2);
        }
    });
});
