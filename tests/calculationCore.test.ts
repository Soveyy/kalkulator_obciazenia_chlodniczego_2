import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ANALYSIS_MONTHS } from '../constants';
import { RTS_PRESET_IDS } from '../data/rtsPresets';
import { CTS_PRESET_IDS } from '../data/ctsPresets';
import { applyRTS, generateAshraeTemperatureProfile, getOpaqueSurfaceSolarGeometry } from '../services/calculationService';
import type { Wall } from '../types';

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

    it('dobiera promieniowanie i poprawkę długofalową do nachylenia przegrody', () => {
        const base: Pick<Wall, 'id' | 'u' | 'area' | 'material'> = {
            id: 1,
            u: 0.15,
            area: 20,
            material: 'metal_new',
        };
        const flatRoof = getOpaqueSurfaceSolarGeometry({
            ...base,
            type: 'stropodach_zelbetowy_ocieplony',
            direction: 'W',
            tilt: 0,
        });
        const pitchedRoof = getOpaqueSurfaceSolarGeometry({
            ...base,
            type: 'dach_skosny_drewniany',
            direction: 'SW',
            tilt: 45,
        });
        const wall = getOpaqueSurfaceSolarGeometry({
            ...base,
            type: 'sciana_murowana_ocieplona',
            direction: 'E',
            tilt: 90,
        });

        expect(flatRoof).toMatchObject({ isRoof: true, direction: 'S', tilt: 0, tiltKey: '0' });
        expect(flatRoof.longwaveCorrection).toBeCloseTo(63, 10);
        expect(pitchedRoof).toMatchObject({ isRoof: true, direction: 'SW', tilt: 45, tiltKey: '45' });
        expect(pitchedRoof.longwaveCorrection).toBeCloseTo(63 * Math.SQRT1_2, 10);
        expect(wall).toMatchObject({ isRoof: false, direction: 'E', tilt: 90, tiltKey: '90', longwaveCorrection: 0 });
    });

    it('chroni kompletną bibliotekę dziewięciu presetów RTS oraz tabele CTS', () => {
        const rts = JSON.parse(readFileSync(new URL('../public/data/rts_factors.json', import.meta.url), 'utf8'));
        const cts = JSON.parse(readFileSync(new URL('../public/data/cts_factors.json', import.meta.url), 'utf8'));

        expect(Object.keys(rts).sort()).toEqual([...RTS_PRESET_IDS].sort());
        for (const presetId of RTS_PRESET_IDS) {
            expect(Object.keys(rts[presetId])).toEqual(['panels', 'tiles', 'carpet']);
            for (const floorType of ['panels', 'tiles', 'carpet']) {
                expect(Object.keys(rts[presetId][floorType])).toEqual(['10', '50', '90']);
                for (const glassPercentage of ['10', '50', '90']) {
                    const series = rts[presetId][floorType][glassPercentage];
                    for (const values of [series.solar, series.nonsolar] as number[][]) {
                        expect(values).toHaveLength(24);
                        expect(values.every(value => Number.isFinite(value) && value >= 0)).toBe(true);
                        expect(values.reduce((sum, value) => sum + value, 0)).toBeCloseTo(1, 10);
                    }
                }
            }
        }

        expect(Object.keys(cts.cts_coefficients).sort()).toEqual([...CTS_PRESET_IDS].sort());
        expect(Object.keys(cts.metadata.presets).sort()).toEqual([...CTS_PRESET_IDS].sort());
        for (const series of Object.values(cts.cts_coefficients) as number[][]) {
            expect(series).toHaveLength(24);
            expect(series.every(value => Number.isFinite(value) && value >= 0)).toBe(true);
            expect(series.reduce((sum, value) => sum + value, 0)).toBeCloseTo(1, 8);
        }
    });
});
