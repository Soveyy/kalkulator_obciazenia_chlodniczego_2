import type { CalculationResultData } from '../types';

/** Signed balances remain available; cooling demand is clipped only after each balance is summed. */
export function coolingDemand(sensible: number, latent: number): number {
    return Math.max(0, sensible) + Math.max(0, latent);
}

export function coolingProfile(data: CalculationResultData): number[] {
    return data.coolingTotal ?? data.sensible.map((s, h) => coolingDemand(s, data.latent[h]));
}

export function summarizeResult(data: CalculationResultData) {
    const profile = coolingProfile(data);
    const peak = Math.max(...profile);
    const hour = profile.indexOf(peak);
    return {
        peak, hour, sensible: Math.max(0, data.sensible[hour]), latent: Math.max(0, data.latent[hour]),
        sensibleNet: data.sensible[hour], latentNet: data.latent[hour], net: data.total[hour],
        coolingEnergyKWh: profile.reduce((sum, v) => sum + v, 0) / 1000,
        netEnergyKWh: data.total.reduce((sum, v) => sum + v, 0) / 1000,
    };
}

export function scheduleIsFullDay(start: number, end: number) {
    return start === end || (start === 0 && end === 24) || (start === 24 && end === 0);
}
export function isHourActive(hour: number, start: number, end: number): boolean {
    if (scheduleIsFullDay(start, end)) return true;
    return start < end ? hour >= start && hour < end : hour >= start || hour < end;
}
export function scheduleLabel(start: number, end: number): string {
    return scheduleIsFullDay(start, end) ? 'Całą dobę — 24 h' : `${start}:00–${end}:00${start > end ? ' (przez północ)' : ''}`;
}
