import type { RoomState } from '../types';
import { ANALYSIS_MONTHS, MONTH_NAMES } from '../constants';
import { coolingProfile, summarizeResult } from './resultModel';
import { parseNumber } from './validationService';

/** Formatting only: reports use the same, unrounded results as the application. */
export function formatNumber(value: unknown, decimals = 1): string {
    const number = parseNumber(value);
    if (number === null) return '-';
    const rounded = Number(number.toFixed(decimals));
    return new Intl.NumberFormat('pl-PL', {
        minimumFractionDigits: decimals, maximumFractionDigits: decimals,
    }).format(Object.is(rounded, -0) ? 0 : rounded).replace(/\u00a0/g, ' ');
}
export const kw = (watts: number) => formatNumber(watts / 1000, 2);
export const monthName = (month: string) => MONTH_NAMES[Number(month) - 1];
export const localOffset = (month: string) => Number(month) >= 4 && Number(month) <= 10 ? 2 : 1;
export const timeZone = (month: string) => 'UTC+' + localOffset(month);
export const localHour = (utcHour: number, month: string) => String((utcHour + localOffset(month)) % 24).padStart(2, '0') + ':00';
export const localSeries = (values: number[], month: string) => Array.from({ length: 24 }, (_, h) => values[(h - localOffset(month) + 24) % 24]);

export const REPORT_SOURCE_LABELS = {
    solar: 'Nasłonecznienie przez okna',
    conduction: 'Przenikanie ciepła przez przegrody',
    internal: 'Ludzie, oświetlenie i urządzenia',
    ventilation: 'Wentylacja',
    infiltration: 'Napływ powietrza przez nieszczelności (infiltracja)',
} as const;
export const BALANCE_NOTE = 'Bilans netto uwzględnia wartości dodatnie i ujemne. Obciążenie chłodnicze do pokrycia jest sumą dodatniego bilansu jawnego i dodatniego bilansu utajonego. Ujemny bilans wilgoci nie zmniejsza obciążenia chłodniczego jawnego. Sumy obliczono przed zaokrągleniem.';
export const componentsNote = (month: string) => 'Obciążenie chłodnicze utajone obejmuje wilgoć ze wszystkich źródeł; pozostałe składowe są jawne. Wartości ujemne oznaczają odpływ ciepła lub wilgoci. Czas lokalny (' + timeZone(month) + ').';

export function seasonalPeak(room: RoomState) {
    // Never label a partial/stale monthly list as a complete April-September search.
    if (!ANALYSIS_MONTHS.ARRAY.every(m => room.monthlyPeaks?.some(p => Number(p.month) === m && Number.isFinite(p.peak)))) return null;
    return room.monthlyPeaks.reduce((best, p) => p.peak >= best.peak ? p : best);
}

export function roomReportData(room: RoomState) {
    if (!room.activeResults) throw new Error('Brak wyników pomieszczenia.');
    const result = room.activeResults;
    const summary = summarizeResult(result.finalGains.clearSky);
    const h = summary.hour;
    const source = [
        { label: REPORT_SOURCE_LABELS.solar, sensible: result.loadComponents.solar[h], latent: 0, color: '#e9a028' },
        { label: REPORT_SOURCE_LABELS.conduction, sensible: result.loadComponents.conduction[h], latent: 0, color: '#ef7b37' },
        { label: REPORT_SOURCE_LABELS.internal, sensible: result.loadComponents.internalSensible[h], latent: result.components.internalGainsLatent[h], color: '#df535a' },
        { label: REPORT_SOURCE_LABELS.ventilation, sensible: result.loadComponents.ventilationSensible[h], latent: result.ventilationLoad.latent[h], color: '#9166c3' },
        { label: REPORT_SOURCE_LABELS.infiltration, sensible: result.loadComponents.infiltrationSensible[h], latent: result.infiltrationLoad.latent[h], color: '#249e8c' },
    ];
    const positive = source.map(s => ({ ...s, value: Math.max(0, s.sensible) + Math.max(0, s.latent) })).filter(s => s.value > 0);
    return { summary, source, positive, profile: coolingProfile(result.finalGains.clearSky), season: seasonalPeak(room) };
}

export function ventilationLabel(room: RoomState): string {
    const v = room.internalGains.ventilation;
    if (!v.enabled || v.type === 'none') return 'Nie uwzględniono';
    return (v.type === 'mechanical' ? 'Mechaniczna · ' + formatNumber(v.airflow, 0) : 'Grawitacyjna · ' + formatNumber(v.naturalVentilationAirflow, 0)) + ' m³/h';
}

export function reportFileName(prefix: string, ...names: string[]): string {
    // Bound download names independently from the full, wrapped names inside the PDF.
    const parts = names.map(name => (name || 'Bez nazwy').replace(/[<>:"/\\|?*\x00-\x1f]/g, '').trim().replace(/\s+/g, '_').slice(0, 65));
    return [prefix, ...parts].join('_') + '.pdf';
}

export const REPORT_SCOPE = 'Raport służy do doboru klimatyzacji w pomieszczeniach, mieszkaniach, domach i niewielkich obiektach usługowych. Nie jest pełną symulacją energetyczną budynku.';
export const WEATHER_ASSUMPTIONS = 'Przyjęto silne nasłonecznienie przy całkowicie bezchmurnym niebie (model Clear Sky) i dane pogodowe dla Warszawy. Obliczenia nie uwzględniają cienia od sąsiednich budynków, drzew ani innych obiektów w otoczeniu.';
export const shadingAssumptions = (includeShading: boolean) => includeShading
    ? 'Osłony okienne i daszki rozpatrzono zgodnie z danymi wprowadzonymi do projektu.'
    : 'W tym wariancie pominięto osłony okienne; wprowadzone daszki rozpatrzono zgodnie z danymi projektu.';
export const ENERGY_NOTE = '* Faktyczny pobór energii elektrycznej przez klimatyzator będzie ok. 3-5 razy mniejszy (zależnie od EER/SEER).';
export const DISCLAIMER = 'Niniejszy raport jest wynikiem symulacji komputerowej opartej na wprowadzonych danych oraz statystycznych modelach klimatycznych. Rzeczywiste zapotrzebowanie na chłód może różnić się w zależności od dokładności danych wejściowych, jakości wykonania budynku, sposobu użytkowania oraz lokalnych warunków mikroklimatycznych. Autor aplikacji nie ponosi odpowiedzialności za ewentualne błędy w doborze urządzeń na podstawie tego raportu. Zaleca się weryfikację wyników przez uprawnionego projektanta HVAC.';
