import type { OpaquePartitionType } from '../types';

export type OpaquePartitionGroup = 'wall' | 'roof';

export interface CtsPresetDefinition {
    id: OpaquePartitionType;
    label: string;
    menuDescription: string;
    group: OpaquePartitionGroup;
    defaultU: number;
    defaultDirection: string;
    defaultTilt: number;
    allowedTilts: readonly number[];
    defaultMaterial: string;
    recommendedFor: string;
    layers: string;
    thermalResponse: string;
    note?: string;
}

export const CTS_PRESET_IDS = [
    'sciana_murowana_ocieplona',
    'sciana_murowana_nieocieplona',
    'sciana_szkieletowa_ocieplona',
    'sciana_warstwowa_pir',
    'stropodach_zelbetowy_ocieplony',
    'dach_skosny_drewniany',
    'dach_lekki_pir',
] as const satisfies readonly OpaquePartitionType[];

export const CTS_PRESETS: Record<OpaquePartitionType, CtsPresetDefinition> = {
    sciana_murowana_ocieplona: {
        id: 'sciana_murowana_ocieplona',
        label: 'Ściana murowana ocieplona',
        menuDescription: 'Porotherm 25 cm + EPS 20 cm',
        group: 'wall',
        defaultU: 0.166,
        defaultDirection: 'S',
        defaultTilt: 90,
        allowedTilts: [90],
        defaultMaterial: 'paint_sandstone',
        recommendedFor: 'Współczesne domy i budynki murowane z ociepleniem ETICS.',
        layers: 'Tynk cementowo-wapienny 15 mm, EPS 200 mm, Porotherm 25 P+W 250 mm, tynk gipsowy 15 mm.',
        thermalResponse: 'Mur po wewnętrznej stronie izolacji daje dużą bezwładność i wyraźnie rozciąga zysk przewodzenia w czasie.',
    },
    sciana_murowana_nieocieplona: {
        id: 'sciana_murowana_nieocieplona',
        label: 'Ściana murowana nieocieplona',
        menuDescription: 'cegła pełna 38 cm',
        group: 'wall',
        defaultU: 1.355,
        defaultDirection: 'S',
        defaultTilt: 90,
        allowedTilts: [90],
        defaultMaterial: 'brick_red',
        recommendedFor: 'Starsze budynki ceglane bez termomodernizacji; dla muru 51 cm wpisz jego rzeczywiste U.',
        layers: 'Tynk cementowo-wapienny 20 mm, cegła pełna 380 mm, tynk gipsowy 20 mm.',
        thermalResponse: 'Bardzo duża masa opóźnia odpowiedź, ale wysokie U znacząco zwiększa całkowity strumień ciepła.',
    },
    sciana_szkieletowa_ocieplona: {
        id: 'sciana_szkieletowa_ocieplona',
        label: 'Ściana szkieletowa ocieplona',
        menuDescription: 'drewno + wełna + poszycie',
        group: 'wall',
        defaultU: 0.185,
        defaultDirection: 'S',
        defaultTilt: 90,
        allowedTilts: [90],
        defaultMaterial: 'paint_sandstone',
        recommendedFor: 'Domy o lekkiej konstrukcji drewnianej z dodatkowym ociepleniem elewacyjnym.',
        layers: 'EPS 100 mm, OSB 12 mm, zastępcza warstwa słupków drewnianych i wełny 150 mm (15/85), płyta g-k 12,5 mm.',
        thermalResponse: 'Mała masa od strony wnętrza powoduje szybszą reakcję niż w ścianie murowanej.',
        note: 'Warstwa szkieletowa jest modelem zastępczym; rzeczywisty udział drewna i mostki należy potwierdzić dla konkretnej konstrukcji.',
    },
    sciana_warstwowa_pir: {
        id: 'sciana_warstwowa_pir',
        label: 'Ściana z płyty warstwowej PIR',
        menuDescription: 'blacha + PIR 12 cm + blacha',
        group: 'wall',
        defaultU: 0.178,
        defaultDirection: 'S',
        defaultTilt: 90,
        allowedTilts: [90],
        defaultMaterial: 'metal_new',
        recommendedFor: 'Hale, magazyny i lekkie obudowy przemysłowe wykonane z płyt warstwowych.',
        layers: 'Blacha stalowa 0,5 mm, rdzeń PIR 120 mm, blacha stalowa 0,4 mm.',
        thermalResponse: 'Znikoma masa powierzchniowa daje bardzo szybką odpowiedź CTS.',
        note: 'Dla konkretnej płyty wpisz U z karty producenta; zamki i łączniki nie są modelowane osobno.',
    },
    stropodach_zelbetowy_ocieplony: {
        id: 'stropodach_zelbetowy_ocieplony',
        label: 'Stropodach żelbetowy ocieplony',
        menuDescription: 'papa + EPS 25 cm + żelbet',
        group: 'roof',
        defaultU: 0.136,
        defaultDirection: 'S',
        defaultTilt: 0,
        allowedTilts: [0],
        defaultMaterial: 'roof_membrane_dark',
        recommendedFor: 'Niewentylowane dachy płaskie nad ogrzewanym pomieszczeniem, oparte na płycie żelbetowej.',
        layers: 'Papa wielowarstwowa 9,5 mm, EPS dachowy 250 mm, paroizolacja bitumiczna 4 mm, żelbet 200 mm, tynk gipsowy 15 mm.',
        thermalResponse: 'Ciężka płyta żelbetowa od strony wnętrza mocno opóźnia i spłaszcza odpowiedź cieplną.',
    },
    dach_skosny_drewniany: {
        id: 'dach_skosny_drewniany',
        label: 'Dach skośny drewniany',
        menuDescription: 'krokwie + wełna 35 cm + deskowanie',
        group: 'roof',
        defaultU: 0.118,
        defaultDirection: 'S',
        defaultTilt: 45,
        allowedTilts: [15, 30, 45, 60, 75],
        defaultMaterial: 'metal_weathered',
        recommendedFor: 'Ocieplone połacie nad poddaszem użytkowym, z konstrukcją krokwiową i zabudową g-k.',
        layers: 'Blachodachówka 0,6 mm, membrana 2 mm, pełne deskowanie/OSB 22 mm, krokwie z wełną 200 mm (15/85), wełna podkrokwiowa 150 mm, płyta g-k 12,5 mm.',
        thermalResponse: 'Lekka warstwa wewnętrzna reaguje szybciej niż żelbet, a gruba izolacja i deskowanie przesuwają maksimum odpowiedzi o kilka godzin.',
    },
    dach_lekki_pir: {
        id: 'dach_lekki_pir',
        label: 'Dach lekki z płyty PIR',
        menuDescription: 'płyta dachowa PIR 16 cm',
        group: 'roof',
        defaultU: 0.134,
        defaultDirection: 'S',
        defaultTilt: 15,
        allowedTilts: [0, 15, 30, 45, 60, 75],
        defaultMaterial: 'metal_new',
        recommendedFor: 'Hale i magazyny z lekkim dachem z płyt warstwowych, bez stropu żelbetowego.',
        layers: 'Blacha stalowa 0,5 mm, rdzeń PIR 160 mm, blacha stalowa 0,4 mm.',
        thermalResponse: 'Bardzo mała masa powoduje niemal natychmiastową odpowiedź na zmianę temperatury zastępczej.',
        note: 'Dla połaci o spadku 4–10° wybierz najbliższy dostępny kąt danych promieniowania i wpisz U producenta.',
    },
};

export const getCtsPreset = (type: OpaquePartitionType): CtsPresetDefinition => CTS_PRESETS[type];

export const isRoofPreset = (type: OpaquePartitionType): boolean => CTS_PRESETS[type].group === 'roof';
