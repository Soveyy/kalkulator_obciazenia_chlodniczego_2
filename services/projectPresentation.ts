import type { aggregateResults } from './aggregateResults';
import { ANALYSIS_MONTHS } from '../constants';

export type AggregateData = NonNullable<ReturnType<typeof aggregateResults>>;

export const ROOM_PRESENTATION_COLORS = [
    '#3b82f6', '#14b8a6', '#f59e0b', '#a78bfa', '#f472b6',
    '#06b6d4', '#f97316', '#84cc16', '#818cf8', '#fb7185',
];

export function projectPresentationData(aggregate: AggregateData, month: number) {
    const offset = month >= 4 && month <= 10 ? 2 : 1;
    const localProfile = (profile: number[]) => Array.from({ length: 24 }, (_, hour) => profile[(hour - offset + 24) % 24]);
    const totalArea = aggregate.roomProfiles.reduce((sum, room) => sum + room.area, 0);
    const rooms = aggregate.roomProfiles.map((room, index) => ({
        ...room,
        color: ROOM_PRESENTATION_COLORS[index % ROOM_PRESENTATION_COLORS.length],
        localProfile: localProfile(room.profile),
        coincidentLoad: room.profile[aggregate.peakHour],
        share: aggregate.aggregatePeak > 0 ? room.profile[aggregate.peakHour] / aggregate.aggregatePeak : 0,
    }));

    // Clip within each room, then sum: humidity in one room cannot offset another room's demand.
    const sensible = aggregate.roomsWithResults.reduce((sum, room) => sum + Math.max(0, room.activeResults!.finalGains.clearSky.sensible[aggregate.peakHour]), 0);
    const latent = aggregate.roomsWithResults.reduce((sum, room) => sum + Math.max(0, room.activeResults!.finalGains.clearSky.latent[aggregate.peakHour]), 0);
    const hasSeason = aggregate.roomsWithResults.every(room => room.yearlyMatrix?.length === 12 && room.yearlyMatrix.every(row => row.length === 24));
    const season = hasSeason ? Array.from({ length: ANALYSIS_MONTHS.END - ANALYSIS_MONTHS.START + 1 }, (_, index) => {
        const value = index + ANALYSIS_MONTHS.START;
        return { month: value, peak: Math.max(...aggregate.aggregateYearlyMatrix[value - 1]) };
    }) : [];
    const criticalMonth = season.reduce<(typeof season)[number] | null>((best, item) => !best || item.peak > best.peak ? item : best, null);

    return {
        rooms,
        ranking: [...rooms].sort((a, b) => b.coincidentLoad - a.coincidentLoad),
        hourly: localProfile(aggregate.hourlyTotal),
        totalArea,
        localPeakHour: (aggregate.peakHour + offset) % 24,
        coolingEnergyKWh: aggregate.hourlyTotal.reduce((sum, value) => sum + value, 0) / 1000,
        loadDensity: totalArea > 0 ? aggregate.aggregatePeak / totalArea : 0,
        sensible,
        latent,
        season,
        criticalMonth: criticalMonth && criticalMonth.peak > 0 ? criticalMonth.month : null,
    };
}
