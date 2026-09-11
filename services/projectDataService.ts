import {
    AccumulationSettings,
    AdvancedApplianceState,
    EquipmentGains,
    HVACSystem,
    InternalGains,
    RoomState,
    SavedProject,
    Shading,
    State,
    VentilationGains,
    Wall,
    Window,
} from '../types';
import { createInitialRoomState } from '../data/defaults';
import { CTS_PRESET_IDS, CTS_PRESETS } from '../data/ctsPresets';

export type ProjectData = Pick<State, 'projectName' | 'rooms' | 'activeRoomId' | 'systems'>;

export const MAX_SHARE_PAYLOAD_LENGTH = 250_000;
const MAX_PROJECT_JSON_LENGTH = 20_000_000;
const MAX_ROOMS = 100;
const MAX_WINDOWS_PER_ROOM = 200;
const MAX_WALLS_PER_ROOM = 200;
const MAX_INTERNAL_ITEMS_PER_ROOM = 200;
const MAX_SYSTEMS = 100;
const MAX_GRAPH_DEPTH = 20;
const MAX_GRAPH_NODES = 1_000_000;
const FORBIDDEN_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord =>
    value !== null && typeof value === 'object' && !Array.isArray(value);

function assertSafeJsonGraph(value: unknown): void {
    let nodeCount = 0;

    const visit = (current: unknown, depth: number): void => {
        nodeCount += 1;
        if (nodeCount > MAX_GRAPH_NODES || depth > MAX_GRAPH_DEPTH) {
            throw new Error('Projekt ma zbyt złożoną strukturę.');
        }

        if (typeof current === 'number' && !Number.isFinite(current)) {
            throw new Error('Projekt zawiera nieprawidłową wartość liczbową.');
        }
        if (typeof current === 'string' && current.length > 20_000) {
            throw new Error('Projekt zawiera zbyt długi tekst.');
        }
        if (Array.isArray(current)) {
            if (current.length > MAX_GRAPH_NODES) {
                throw new Error('Projekt zawiera zbyt dużą tablicę danych.');
            }
            current.forEach(item => visit(item, depth + 1));
            return;
        }
        if (isRecord(current)) {
            for (const [key, child] of Object.entries(current)) {
                if (FORBIDDEN_KEYS.has(key)) {
                    throw new Error('Projekt zawiera niedozwolone pole.');
                }
                visit(child, depth + 1);
            }
        }
    };

    visit(value, 0);
}

function recordOrEmpty(value: unknown): UnknownRecord {
    return isRecord(value) ? value : {};
}

function text(value: unknown, fallback: string, maxLength = 120): string {
    return typeof value === 'string' ? value.trim().slice(0, maxLength) || fallback : fallback;
}

function booleanValue(value: unknown, fallback: boolean): boolean {
    return typeof value === 'boolean' ? value : fallback;
}

function numberValue(value: unknown, fallback: number, min: number, max: number): number {
    const parsed = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : fallback;
}

function numberOrBlank(
    value: unknown,
    fallback: number | '',
    min: number,
    max: number
): number | '' {
    if (value === '') return '';
    const parsed = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : fallback;
}

function numericText(value: unknown, fallback: string, min: number, max: number, allowBlank = false): string {
    if (allowBlank && value === '') return '';
    const parsed = typeof value === 'string' || typeof value === 'number' ? Number(value) : Number.NaN;
    return Number.isFinite(parsed) && parsed >= min && parsed <= max ? String(value) : fallback;
}

function enumValue<T extends string | number>(value: unknown, allowed: readonly T[], fallback: T): T {
    return typeof value === 'string' && allowed.includes(value as T) ? value as T : fallback;
}

function limitedArray(value: unknown, limit: number, fieldName: string): unknown[] {
    if (value === undefined) return [];
    if (!Array.isArray(value) || value.length > limit) {
        throw new Error(`Nieprawidłowe pole projektu: ${fieldName}.`);
    }
    return value;
}

function sanitizeShading(value: unknown, fallback: Shading): Shading {
    const source = recordOrEmpty(value);
    return {
        enabled: booleanValue(source.enabled, fallback.enabled),
        type: enumValue(source.type, ['louvers', 'draperies', 'roller_shades', 'insect_screens'] as const, fallback.type),
        location: enumValue(source.location, ['indoor', 'outdoor'] as const, fallback.location),
        color: enumValue(source.color, ['light', 'medium', 'dark'] as const, fallback.color),
        setting: text(source.setting, fallback.setting, 60),
        material: enumValue(source.material, ['open', 'semiopen', 'closed', 'sheer'] as const, fallback.material),
    };
}

function sanitizeWindows(value: unknown): Window[] {
    const source = limitedArray(value, MAX_WINDOWS_PER_ROOM, 'okna');
    const seenIds = new Set<number>();

    return source.map((item, index) => {
        if (!isRecord(item)) throw new Error('Nieprawidłowy zapis okna.');
        const id = Math.trunc(numberValue(item.id, index + 1, 0, Number.MAX_SAFE_INTEGER));
        if (seenIds.has(id)) throw new Error('Projekt zawiera zduplikowane identyfikatory okien.');
        seenIds.add(id);

        const defaultShading: Shading = {
            enabled: false,
            type: 'louvers',
            location: 'indoor',
            color: 'light',
            setting: 'tilted_45',
            material: 'open',
        };
        const overhang = recordOrEmpty(item.overhang);

        return {
            id,
            type: enumValue(item.type, ['custom', 'modern', 'standard', 'older_double', 'historic'] as const, 'modern'),
            direction: text(item.direction, '', 8),
            tilt: numberValue(item.tilt, 90, 0, 180),
            u: numberValue(item.u, 0.9, 0.01, 20),
            shgc: numberValue(item.shgc, 0.5, 0, 1),
            width: numberValue(item.width, 1, 0.01, 100),
            height: numberValue(item.height, 1, 0.01, 100),
            shading: sanitizeShading(item.shading, defaultShading),
            overhang: {
                enabled: booleanValue(overhang.enabled, false),
                depth: numberValue(overhang.depth, 1, 0, 100),
                distanceAbove: numberValue(overhang.distanceAbove, 0.2, 0, 100),
            },
        };
    });
}

function sanitizeWalls(value: unknown): Wall[] {
    const source = limitedArray(value, MAX_WALLS_PER_ROOM, 'przegrody');
    const seenIds = new Set<number>();

    return source.map((item, index) => {
        if (!isRecord(item)) throw new Error('Nieprawidłowy zapis przegrody.');
        const id = Math.trunc(numberValue(item.id, index + 1, 0, Number.MAX_SAFE_INTEGER));
        if (seenIds.has(id)) throw new Error('Projekt zawiera zduplikowane identyfikatory przegród.');
        seenIds.add(id);

        const legacyTypeMap: Record<string, Wall['type']> = {
            sciana_ocieplona: 'sciana_murowana_ocieplona',
            sciana_nieocieplona: 'sciana_murowana_nieocieplona',
            stropodach_ocieplony: 'stropodach_zelbetowy_ocieplony',
        };
        const rawType = typeof item.type === 'string' ? item.type : '';
        const migratedType = legacyTypeMap[rawType] || rawType;
        const type = enumValue(migratedType, CTS_PRESET_IDS, 'sciana_murowana_ocieplona');
        const preset = CTS_PRESETS[type];
        const requestedTilt = numberValue(item.tilt, preset.defaultTilt, 0, 90);
        const tilt = preset.allowedTilts.includes(requestedTilt) ? requestedTilt : preset.defaultTilt;

        return {
            id,
            type,
            direction: tilt === 0 ? preset.defaultDirection : text(item.direction, preset.defaultDirection, 8),
            tilt,
            u: numberValue(item.u, preset.defaultU, 0.01, 20),
            area: numberValue(item.area, 1, 0.01, 10_000),
            material: text(item.material, preset.defaultMaterial, 60),
        };
    });
}

function sanitizeAccumulation(value: unknown, fallback: AccumulationSettings): AccumulationSettings {
    const source = recordOrEmpty(value);
    const rawPreset = source.rtsPreset ?? source.thermalMass;
    const migratedPreset = rawPreset === 'very_heavy' ? 'heavy' : rawPreset;
    return {
        include: booleanValue(source.include, fallback.include),
        rtsPreset: enumValue(migratedPreset, ['heavy', 'medium', 'attic', 'single_storey', 'office', 'light', 'large_panel', 'tenement', 'warehouse'] as const, fallback.rtsPreset),
        floorType: enumValue(source.floorType, ['panels', 'tiles', 'carpet'] as const, fallback.floorType),
        glassPercentage: enumValue(source.glassPercentage, [10, 50, 90] as const, fallback.glassPercentage),
    };
}

function sanitizeEquipment(value: unknown): EquipmentGains[] {
    return limitedArray(value, MAX_INTERNAL_ITEMS_PER_ROOM, 'urządzenia').map((item, index) => {
        if (!isRecord(item)) throw new Error('Nieprawidłowy zapis urządzenia.');
        return {
            id: Math.trunc(numberValue(item.id, index + 1, 0, Number.MAX_SAFE_INTEGER)),
            name: text(item.name, `Urządzenie ${index + 1}`, 120),
            power: numberOrBlank(item.power, '', 0, 1_000_000),
            quantity: numberOrBlank(item.quantity, 1, 0, 10_000),
            startHour: numberValue(item.startHour, 8, 0, 24),
            endHour: numberValue(item.endHour, 16, 0, 24),
        };
    });
}

function sanitizeAdvancedAppliances(value: unknown): AdvancedApplianceState[] {
    return limitedArray(value, MAX_INTERNAL_ITEMS_PER_ROOM, 'urządzenia zaawansowane').map((item, index) => {
        if (!isRecord(item)) throw new Error('Nieprawidłowy zapis urządzenia zaawansowanego.');
        const radiantFraction = item.radiantFractionOverride === undefined
            ? undefined
            : numberValue(item.radiantFractionOverride, 0.3, 0, 1);
        return {
            id: text(item.id, `appliance-${index + 1}`, 120),
            catalogId: text(item.catalogId, '', 120),
            quantity: numberValue(item.quantity, 1, 0, 10_000),
            ...(radiantFraction !== undefined ? { radiantFractionOverride: radiantFraction } : {}),
            ...(typeof item.isHoodedOverride === 'boolean' ? { isHoodedOverride: item.isHoodedOverride } : {}),
            startHour: numberValue(item.startHour, 8, 0, 24),
            endHour: numberValue(item.endHour, 16, 0, 24),
        };
    });
}

function sanitizeVentilation(value: unknown, fallback: VentilationGains): VentilationGains {
    const source = recordOrEmpty(value);
    return {
        enabled: booleanValue(source.enabled, fallback.enabled),
        type: enumValue(source.type, ['none', 'mechanical', 'natural'] as const, fallback.type),
        airflow: numberOrBlank(source.airflow, fallback.airflow, 0, 1_000_000),
        exchangerType: enumValue(source.exchangerType, ['counterflow_hrv', 'counterflow_erv', 'rotary_condensing', 'rotary_sorption'] as const, fallback.exchangerType),
        heatRecoveryEfficiency: numberOrBlank(source.heatRecoveryEfficiency, fallback.heatRecoveryEfficiency, 0, 100),
        moistureRecoveryEfficiency: numberOrBlank(source.moistureRecoveryEfficiency, fallback.moistureRecoveryEfficiency, 0, 100),
        naturalVentilationAirflow: numberOrBlank(source.naturalVentilationAirflow, fallback.naturalVentilationAirflow, 0, 1_000_000),
        includeInfiltration: booleanValue(source.includeInfiltration, fallback.includeInfiltration),
        exteriorWallPerimeter: numberOrBlank(source.exteriorWallPerimeter, fallback.exteriorWallPerimeter, 0, 10_000),
        roomHeight: numberOrBlank(source.roomHeight, fallback.roomHeight, 0, 1_000),
        buildingStories: enumValue(source.buildingStories, ['1', '2', '3+'] as const, fallback.buildingStories),
        tightnessClass: enumValue(source.tightnessClass, ['tight', 'average', 'leaky'] as const, fallback.tightnessClass),
        shieldingClass: enumValue(source.shieldingClass, ['1', '2', '3', '4', '5'] as const, fallback.shieldingClass),
        windSpeed: numberOrBlank(source.windSpeed, fallback.windSpeed, 0, 100),
    };
}

function sanitizeInternalGains(value: unknown, fallback: InternalGains): InternalGains {
    const source = recordOrEmpty(value);
    const people = recordOrEmpty(source.people);
    const lighting = recordOrEmpty(source.lighting);

    return {
        people: {
            enabled: booleanValue(people.enabled, fallback.people.enabled),
            count: numberOrBlank(people.count, fallback.people.count, 0, 10_000),
            activityLevel: enumValue(
                people.activityLevel,
                ['seated_very_light', 'standing_light', 'restaurant_eating', 'light_exercise', 'walking_moderate', 'heavy_work', 'heavy_sport'] as const,
                fallback.people.activityLevel
            ),
            startHour: numberValue(people.startHour, fallback.people.startHour, 0, 24),
            endHour: numberValue(people.endHour, fallback.people.endHour, 0, 24),
        },
        lighting: {
            enabled: booleanValue(lighting.enabled, fallback.lighting.enabled),
            type: text(lighting.type, fallback.lighting.type, 80),
            powerDensity: numberOrBlank(lighting.powerDensity, fallback.lighting.powerDensity, 0, 1_000_000),
            startHour: numberValue(lighting.startHour, fallback.lighting.startHour, 0, 24),
            endHour: numberValue(lighting.endHour, fallback.lighting.endHour, 0, 24),
        },
        equipment: sanitizeEquipment(source.equipment),
        advancedAppliances: sanitizeAdvancedAppliances(source.advancedAppliances),
        ventilation: sanitizeVentilation(source.ventilation, fallback.ventilation),
    };
}

function sanitizeRoom(value: unknown, index: number): RoomState {
    if (!isRecord(value)) throw new Error('Nieprawidłowy zapis pomieszczenia.');
    const fallback = createInitialRoomState(`room-${index + 1}`, `Pomieszczenie ${index + 1}`);
    const input = recordOrEmpty(value.input);

    return {
        id: text(value.id, fallback.id, 120),
        name: text(value.name, fallback.name, 160),
        windows: sanitizeWindows(value.windows),
        walls: sanitizeWalls(value.walls),
        input: {
            tInternal: numericText(input.tInternal, fallback.input.tInternal, -50, 100),
            rhInternal: numericText(input.rhInternal, fallback.input.rhInternal, 0, 100),
            roomArea: numericText(input.roomArea, fallback.input.roomArea, 0, 100_000, true),
        },
        accumulation: sanitizeAccumulation(value.accumulation, fallback.accumulation),
        internalGains: sanitizeInternalGains(value.internalGains, fallback.internalGains),
        results: null,
        activeResults: null,
        currentMonth: enumValue(value.currentMonth, ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'] as const, '7'),
        resultMessage: '',
        tExtProfile: [],
        monthlyPeaks: [],
        yearlyMatrix: null,
        solarMatrix: null,
        solarInstantMatrix: null,
    };
}

function sanitizeSystems(value: unknown, roomIds: Set<string>): HVACSystem[] {
    return limitedArray(value, MAX_SYSTEMS, 'systemy HVAC').map((item, index) => {
        if (!isRecord(item)) throw new Error('Nieprawidłowy zapis systemu HVAC.');
        const indoorUnits = limitedArray(item.indoorUnits, MAX_ROOMS, 'jednostki wewnętrzne')
            .filter(unit => isRecord(unit) && typeof unit.roomId === 'string' && roomIds.has(unit.roomId))
            .map((unit, unitIndex) => {
                const source = unit as UnknownRecord;
                return {
                    roomId: source.roomId as string,
                    index: Math.trunc(numberValue(source.index, unitIndex, 0, 10_000)),
                };
            });

        return {
            id: text(item.id, `system-${index + 1}`, 120),
            name: text(item.name, `System ${index + 1}`, 160),
            type: enumValue(item.type, ['split', 'multi'] as const, 'split'),
            outdoorModel: text(item.outdoorModel, '', 160),
            indoorUnits,
            applyTempCorrection: booleanValue(item.applyTempCorrection, false),
        };
    });
}

function normalizeLegacyProject(source: UnknownRecord): UnknownRecord {
    if (Array.isArray(source.rooms)) return source;
    if (!('windows' in source) && !('walls' in source) && !('input' in source)) {
        throw new Error('Plik nie zawiera danych projektu HVAC.');
    }

    const legacyInput = recordOrEmpty(source.input);
    return {
        projectName: text(legacyInput.projectName, 'Mój Projekt', 160),
        rooms: [{
            ...source,
            id: 'room-1',
            name: 'Pomieszczenie 1',
            input: legacyInput,
        }],
        activeRoomId: 'room-1',
        systems: [],
    };
}

export function sanitizeProjectData(value: unknown): ProjectData {
    assertSafeJsonGraph(value);
    if (!isRecord(value)) throw new Error('Projekt musi być obiektem danych.');

    const source = normalizeLegacyProject(value);
    const roomValues = limitedArray(source.rooms, MAX_ROOMS, 'pomieszczenia');
    if (roomValues.length === 0) throw new Error('Projekt nie zawiera żadnego pomieszczenia.');

    const rooms = roomValues.map(sanitizeRoom);
    const roomIds = new Set(rooms.map(room => room.id));
    if (roomIds.size !== rooms.length || roomIds.has('aggregate')) {
        throw new Error('Projekt zawiera nieprawidłowe identyfikatory pomieszczeń.');
    }

    const requestedActiveRoomId = text(source.activeRoomId, rooms[0].id, 120);
    const activeRoomId = roomIds.has(requestedActiveRoomId) || (requestedActiveRoomId === 'aggregate' && rooms.length > 1)
        ? requestedActiveRoomId
        : rooms[0].id;

    return {
        projectName: text(source.projectName, 'Mój Projekt', 160),
        rooms,
        activeRoomId,
        systems: sanitizeSystems(source.systems, roomIds),
    };
}

export function parseProjectDataJson(json: string): ProjectData {
    if (json.length > MAX_PROJECT_JSON_LENGTH) {
        throw new Error('Plik projektu jest zbyt duży.');
    }
    return sanitizeProjectData(JSON.parse(json));
}

export function sanitizeSavedProject(value: unknown, source: 'local' | 'cloud'): SavedProject {
    if (!isRecord(value)) throw new Error('Nieprawidłowy wpis projektu.');
    const rawData = typeof value.data === 'string' ? parseProjectDataJson(value.data) : sanitizeProjectData(value.data);
    const rawDate = typeof value.date === 'string' ? value.date : '';
    const date = Number.isNaN(Date.parse(rawDate)) ? new Date(0).toISOString() : rawDate;

    return {
        name: text(value.name, rawData.projectName, 160),
        date,
        data: rawData,
        isLocal: source === 'local',
        isCloud: source === 'cloud',
    };
}

export function createProjectSnapshot(project: ProjectData): ProjectData {
    // Calculated hourly matrices are reproducible and can make a saved project
    // unnecessarily large. Persist only inputs; results are recalculated after load.
    const inputOnlyProject: ProjectData = {
        ...project,
        rooms: project.rooms.map(room => ({
            ...room,
            results: null,
            activeResults: null,
            resultMessage: '',
            tExtProfile: [],
            monthlyPeaks: [],
            yearlyMatrix: null,
            solarMatrix: null,
            solarInstantMatrix: null,
        })),
    };
    return sanitizeProjectData(inputOnlyProject);
}
