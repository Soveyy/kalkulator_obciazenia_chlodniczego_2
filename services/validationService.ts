import type { RoomState, Window, Wall, AllData } from '../types';
import { WINDOW_DIRECTIONS, PEOPLE_ACTIVITY_LEVELS, LIGHTING_TYPES, WALL_MATERIALS } from '../constants';
import { CTS_PRESETS } from '../data/ctsPresets';
import { RTS_PRESET_IDS } from '../data/rtsPresets';
import { UNCONDITIONED_PARTITION_PRESETS } from '../data/unconditionedPresets';
import { ADVANCED_APPLIANCES } from '../data/advancedAppliances';

export const MAX_ROOMS = 10;
export type ValidationIssue = { path: string; message: string; severity: 'error' | 'warning'; missing?: boolean };
type Rule = { min: number; max: number; positive?: boolean; integer?: boolean };
export const NUMBER_RULES = {
    area: { min: 0, max: 100_000, positive: true },
    dimension: { min: 0, max: 100, positive: true },
    u: { min: 0, max: 20, positive: true },
    fraction: { min: 0, max: 1 }, percent: { min: 0, max: 100 },
    temperature: { min: -50, max: 80 }, adjacentTemperature: { min: -50, max: 100 },
    power: { min: 0, max: 1_000_000 }, count: { min: 0, max: 10_000, integer: true },
    airflow: { min: 0, max: 1_000_000 }, wind: { min: 0, max: 100 },
    length: { min: 0, max: 10_000 }, overhang: { min: 0, max: 100 },
    hour: { min: 0, max: 24, integer: true },
} satisfies Record<string, Rule>;

export function parseNumber(value: unknown): number | null {
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    if (typeof value !== 'string' || !value.trim()) return null;
    const normalized = value.trim().replace(',', '.');
    if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(normalized)) return null;
    const number = Number(normalized);
    return Number.isFinite(number) ? number : null;
}

/** Keep incomplete text in the form; never turn a missing/invalid entry into zero. */
export function inputNumber(value: string): number | '' {
    return (value === '' ? '' : parseNumber(value) ?? value) as number | '';
}

export function numberIssue(value: unknown, rule: Rule): string | undefined {
    if (value === '' || value === undefined || value === null) return 'Uzupełnij wartość.';
    const n = parseNumber(value);
    if (n === null) return 'Wpisz poprawną, skończoną liczbę.';
    if (rule.positive && n <= 0) return 'Wartość musi być większa od zera.';
    if (n < rule.min || n > rule.max) return `Dozwolony zakres programu: ${rule.min}–${rule.max}.`;
    if (rule.integer && !Number.isInteger(n)) return 'Podaj całkowitą liczbę.';
}

function checker() {
    const issues: ValidationIssue[] = [];
    const number = (path: string, value: unknown, rule: Rule, label: string) => {
        const message = numberIssue(value, rule);
        if (message) issues.push({ path, message: `${label}: ${message}`, severity: 'error', missing: value === '' || value == null });
    };
    const choice = (path: string, value: unknown, allowed: readonly unknown[], label: string) => {
        if (!allowed.includes(value)) issues.push({ path, message: `${label}: brak obsługiwanej wartości (${String(value)}).`, severity: 'error' });
    };
    return { issues, number, choice };
}

export function validateWindow(window: Window): ValidationIssue[] {
    const { issues, number, choice } = checker();
    for (const key of ['width', 'height'] as const) number(key, window[key], NUMBER_RULES.dimension, key === 'width' ? 'Szerokość' : 'Wysokość');
    number('u', window.u, NUMBER_RULES.u, 'U');
    number('shgc', window.shgc, NUMBER_RULES.fraction, 'SHGC');
    choice('type', window.type, ['custom', 'modern', 'standard', 'older_double', 'historic'], 'Preset okna');
    choice('direction', window.direction, WINDOW_DIRECTIONS.map(d => d.value), 'Kierunek');
    choice('tilt', window.tilt, [0, 15, 30, 45, 60, 75, 90], 'Pochylenie');
    if (window.shading?.enabled) {
        choice('shading.type', window.shading.type, ['louvers', 'draperies', 'roller_shades', 'insect_screens'], 'Typ osłony');
        choice('shading.location', window.shading.location, ['indoor', 'outdoor'], 'Położenie osłony');
    }
    if (window.overhang?.enabled) {
        number('overhang.depth', window.overhang.depth, NUMBER_RULES.overhang, 'Głębokość daszku');
        number('overhang.distanceAbove', window.overhang.distanceAbove, NUMBER_RULES.overhang, 'Odległość daszku');
    }
    return issues;
}

export function validateWall(wall: Wall): ValidationIssue[] {
    const { issues, number, choice } = checker();
    number('area', wall.area, NUMBER_RULES.area, 'Powierzchnia');
    number('u', wall.u, NUMBER_RULES.u, 'U');
    choice('boundaryType', wall.boundaryType ?? 'external', ['external', 'unconditioned'], 'Warunki po drugiej stronie przegrody');
    if (wall.boundaryType === 'unconditioned') {
        choice('unconditionedType', wall.unconditionedType, Object.keys(UNCONDITIONED_PARTITION_PRESETS), 'Typ przegrody');
        number('adjacentTemperature', wall.adjacentTemperature, NUMBER_RULES.adjacentTemperature, 'Temperatura sąsiedniej przestrzeni');
    } else {
        choice('type', wall.type, Object.keys(CTS_PRESETS), 'Preset CTS');
        const preset = CTS_PRESETS[wall.type];
        choice('tilt', wall.tilt, preset?.allowedTilts ?? [], 'Pochylenie');
        choice('direction', wall.direction, WINDOW_DIRECTIONS.map(d => d.value), 'Kierunek');
        choice('material', wall.material, Object.keys(WALL_MATERIALS), 'Wykończenie');
    }
    return issues;
}

type RoomInput = Pick<RoomState, 'input' | 'internalGains' | 'accumulation' | 'windows' | 'walls'>;
export function validateRoom(room: RoomInput): ValidationIssue[] {
    const { issues, number, choice } = checker();
    number('input.roomArea', room.input.roomArea, NUMBER_RULES.area, 'Powierzchnia pomieszczenia');
    number('input.tInternal', room.input.tInternal, NUMBER_RULES.temperature, 'Temperatura pomieszczenia');
    number('input.rhInternal', room.input.rhInternal, NUMBER_RULES.percent, 'Wilgotność');
    const temp = parseNumber(room.input.tInternal);
    if (temp !== null && (temp < 16 || temp > 30)) issues.push({ path: 'input.tInternal', severity: 'warning', message: 'Nietypowa temperatura pomieszczenia — sprawdź założenia i zakres pracy urządzenia.' });
    const schedule = (path: string, item: { startHour: number; endHour: number }) => {
        number(`${path}.startHour`, item.startHour, NUMBER_RULES.hour, 'Początek harmonogramu');
        number(`${path}.endHour`, item.endHour, NUMBER_RULES.hour, 'Koniec harmonogramu');
    };
    const g = room.internalGains;
    if (g.people.enabled) {
        number('internalGains.people.count', g.people.count, NUMBER_RULES.count, 'Liczba osób');
        choice('internalGains.people.activityLevel', g.people.activityLevel, Object.keys(PEOPLE_ACTIVITY_LEVELS), 'Aktywność ludzi');
        schedule('internalGains.people', g.people);
    }
    if (g.lighting.enabled) {
        number('internalGains.lighting.powerDensity', g.lighting.powerDensity, NUMBER_RULES.power, 'Moc oświetlenia');
        choice('internalGains.lighting.type', g.lighting.type, Object.keys(LIGHTING_TYPES), 'Typ oświetlenia');
        schedule('internalGains.lighting', g.lighting);
    }
    g.equipment.forEach((item, i) => {
        number(`internalGains.equipment.${i}.power`, item.power, NUMBER_RULES.power, `${item.name}: moc`);
        number(`internalGains.equipment.${i}.quantity`, item.quantity, NUMBER_RULES.count, `${item.name}: liczba sztuk`);
        schedule(`internalGains.equipment.${i}`, item);
    });
    g.advancedAppliances.forEach((item, i) => {
        number(`internalGains.advancedAppliances.${i}.quantity`, item.quantity, NUMBER_RULES.count, 'Liczba urządzeń katalogowych');
        choice(`internalGains.advancedAppliances.${i}.catalogId`, item.catalogId, ADVANCED_APPLIANCES.map(a => a.id), 'Urządzenie katalogowe');
        if (item.radiantFractionOverride !== undefined) number(`internalGains.advancedAppliances.${i}.radiantFractionOverride`, item.radiantFractionOverride, NUMBER_RULES.fraction, 'Udział radiacyjny');
        schedule(`internalGains.advancedAppliances.${i}`, item);
    });
    const v = g.ventilation;
    if (v.enabled) choice('internalGains.ventilation.type', v.type, ['none', 'mechanical', 'natural'], 'Typ wentylacji');
    if (v.enabled && v.type === 'mechanical') {
        choice('internalGains.ventilation.exchangerType', v.exchangerType, ['counterflow_hrv', 'counterflow_erv', 'rotary_condensing', 'rotary_sorption'], 'Typ wymiennika');
        number('internalGains.ventilation.airflow', v.airflow, NUMBER_RULES.airflow, 'Przepływ wentylacji');
        number('internalGains.ventilation.heatRecoveryEfficiency', v.heatRecoveryEfficiency, NUMBER_RULES.percent, 'Odzysk ciepła');
        number('internalGains.ventilation.moistureRecoveryEfficiency', v.moistureRecoveryEfficiency, NUMBER_RULES.percent, 'Odzysk wilgoci');
    }
    if (v.enabled && v.type === 'natural') number('internalGains.ventilation.naturalVentilationAirflow', v.naturalVentilationAirflow, NUMBER_RULES.airflow, 'Przepływ wentylacji');
    if (v.includeInfiltration) {
        choice('internalGains.ventilation.buildingStories', v.buildingStories, ['1', '2', '3+'], 'Liczba kondygnacji');
        choice('internalGains.ventilation.tightnessClass', v.tightnessClass, ['tight', 'average', 'leaky'], 'Szczelność');
        choice('internalGains.ventilation.shieldingClass', v.shieldingClass, ['1', '2', '3', '4', '5'], 'Osłonięcie od wiatru');
        number('internalGains.ventilation.exteriorWallPerimeter', v.exteriorWallPerimeter, NUMBER_RULES.length, 'Obwód ścian');
        number('internalGains.ventilation.roomHeight', v.roomHeight, NUMBER_RULES.dimension, 'Wysokość pomieszczenia');
        number('internalGains.ventilation.windSpeed', v.windSpeed, NUMBER_RULES.wind, 'Prędkość wiatru');
    }
    if (room.accumulation.include) {
        choice('accumulation.rtsPreset', room.accumulation.rtsPreset, RTS_PRESET_IDS, 'Preset RTS');
        choice('accumulation.floorType', room.accumulation.floorType, ['tiles', 'panels', 'carpet'], 'Podłoga');
        choice('accumulation.glassPercentage', room.accumulation.glassPercentage, [10, 50, 90], 'Przeszklenie RTS');
    }
    room.windows.forEach((w, i) => issues.push(...validateWindow(w).map(e => ({ ...e, path: `windows.${i}.${e.path}`, message: `Okno ${i + 1}: ${e.message}` }))));
    room.walls.forEach((w, i) => issues.push(...validateWall(w).map(e => ({ ...e, path: `walls.${i}.${e.path}`, message: `Przegroda ${i + 1}: ${e.message}` }))));
    return issues;
}

export function assertRoomValid(room: RoomInput): void {
    const errors = validateRoom(room).filter(e => e.severity === 'error');
    if (errors.length) throw new Error(errors.map(e => e.message).join(' '));
}

export function requireSeries(value: unknown, label: string): asserts value is number[] {
    if (!Array.isArray(value) || value.length !== 24 || !value.every(n => typeof n === 'number' && Number.isFinite(n))) {
        throw new Error(`${label}: brak kompletnego rekordu 24 godzin. Obliczenia zatrzymane.`);
    }
}

export function assertCalculationData(room: RoomInput, data: AllData, month: string, withoutShading = false): void {
    const weather = data.warsaw_weather?.monthly_data?.[month];
    if (!weather || !['peakTemp', 'dailyRange', 'mcrh'].every(key => Number.isFinite(weather[key]))) throw new Error(`Brak danych pogodowych dla miesiąca ${month}.`);
    const solar = (direction: string, tilt: number, label: string, fields: string[]) => {
        const record = data.nsrdb?.[month]?.[direction]?.[String(tilt)];
        fields.forEach(field => requireSeries(record?.[field], `${label}, ${direction}/${tilt}°, miesiąc ${month}, ${field}`));
    };
    room.windows.forEach((w, i) => {
        solar(w.direction, w.tilt, `Okno ${i + 1}`, ['Gcs', 'Gb', 'theta', ...(w.overhang?.enabled ? ['solar_altitude', 'gamma'] : []), ...(w.shading.enabled && !withoutShading && w.shading.type === 'louvers' ? ['omega'] : [])]);
        if (w.shading.enabled && !withoutShading) {
            // Legacy custom windows use the documented standard glazing shading table.
            const db = data.shading?.[w.type === 'custom' ? 'standard' : w.type];
            const s = w.shading;
            const factor = s.type === 'louvers' ? db?.louvers?.[s.location]?.[s.color]?.[s.setting]
                : s.type === 'draperies' ? db?.draperies?.[s.material === 'sheer' ? 'sheer' : `${s.material}_${s.color}`]
                : s.type === 'roller_shades' ? db?.roller_shades?.[s.setting] : db?.insect_screens?.[s.location];
            const keys = s.type === 'louvers' ? ['iac0', 'iac60', 'iac_diff', 'fr'] : ['iac', 'fr'];
            if (!factor || keys.some(k => !Number.isFinite(factor[k]) || factor[k] < 0 || factor[k] > 1)) throw new Error(`Okno ${i + 1}: brak poprawnego rekordu osłony.`);
        }
    });
    room.walls.forEach((w, i) => {
        if (w.boundaryType === 'unconditioned') return;
        solar(w.tilt === 0 ? CTS_PRESETS[w.type].defaultDirection : w.direction, w.tilt, `Przegroda ${i + 1}`, ['Gcs']);
        requireSeries(data.cts?.cts_coefficients?.[w.type], `Przegroda ${i + 1}: CTS ${w.type}`);
    });
    if (room.accumulation.include) {
        const a = room.accumulation;
        for (const kind of ['solar', 'nonsolar']) requireSeries(data.rts?.[a.rtsPreset]?.[a.floorType]?.[a.glassPercentage]?.[kind], `RTS ${a.rtsPreset}/${a.floorType}/${a.glassPercentage}/${kind}`);
    }
}

export function roomInputKey(room: RoomInput): string {
    return JSON.stringify([room.input, room.windows, room.walls, room.accumulation, room.internalGains]);
}
export function isRoomResultCurrent(room: RoomState): boolean {
    return Boolean(room.activeResults && !room.calculationError && room.calculatedInputKey === roomInputKey(room));
}

/** Normalize validated numeric fields at the engine boundary, including decimal commas. */
export function normalizeCalculationInput<T>(value: T): T {
    const numericKeys = new Set(['width', 'height', 'u', 'area', 'shgc', 'tilt', 'adjacentTemperature', 'depth', 'distanceAbove', 'count', 'powerDensity', 'power', 'quantity', 'startHour', 'endHour', 'radiantFractionOverride', 'airflow', 'naturalVentilationAirflow', 'heatRecoveryEfficiency', 'moistureRecoveryEfficiency', 'exteriorWallPerimeter', 'roomHeight', 'windSpeed']);
    const visit = (node: any): any => {
        if (Array.isArray(node)) return node.map(visit);
        if (node && typeof node === 'object') return Object.fromEntries(Object.entries(node).map(([key, child]) => [key, numericKeys.has(key) ? parseNumber(child) ?? child : visit(child)]));
        return node;
    };
    return visit(value);
}
