
import { ChartType } from 'chart.js';

export type AppTab = 'internal' | 'windows' | 'ventilation' | 'summary';

export interface Shading {
  enabled: boolean;
  type: 'louvers' | 'draperies' | 'roller_shades' | 'insect_screens';
  location: 'indoor' | 'outdoor';
  color: 'light' | 'medium' | 'dark';
  setting: string; // Specific to type, e.g., 'open_0', 'tilted_45', 'light_translucent'
  material: 'open' | 'semiopen' | 'closed' | 'sheer';
}

export interface Overhang {
    enabled: boolean;
    depth: number;       // Głębokość daszku (PH)
    distanceAbove: number; // Odległość pionowa nad oknem
}

export interface Window {
  id: number;
  type: 'custom' | 'modern' | 'standard' | 'older_double' | 'historic';
  direction: string;
  u: number;
  shgc: number;
  width: number;
  height: number;
  shading: Shading;
  overhang?: Overhang;
}

export interface AccumulationSettings {
    include: boolean;
    thermalMass: 'light' | 'medium' | 'heavy' | 'very_heavy';
    floorType: 'panels' | 'tiles' | 'carpet';
    glassPercentage: 10 | 50 | 90;
}

export interface PeopleGains {
    enabled: boolean;
    count: number | '';
    activityLevel: 'seated_very_light' | 'standing_light' | 'walking_moderate' | 'heavy_sport';
    startHour: number;
    endHour: number;
}

export interface LightingGains {
    enabled: boolean;
    type: string;
    powerDensity: number | '';
    startHour: number;
    endHour: number;
}

export interface EquipmentGains {
    id: number;
    name: string;
    power: number | '';
    quantity: number | '';
    startHour: number;
    endHour: number;
}

export interface InternalGains {
    people: PeopleGains;
    lighting: LightingGains;
    equipment: EquipmentGains[];
    ventilation: VentilationGains;
}

export interface VentilationGains {
    enabled: boolean;
    airflow: number | ''; // m3/h
    exchangerType: 'counterflow_hrv' | 'counterflow_erv' | 'rotary_condensing' | 'rotary_sorption';
}

export interface InputState {
    projectName: string;
    tInternal: string;
    rhInternal: string;
    tExternal: string;
    roomArea: string;
    tDewPoint: string;
}

export interface CalculationResultData {
    sensible: number[];
    latent: number[];
    total: number[];
}

export interface CalculationComponents {
    solarGainsGlobal: number[];
    solarGainsClearSky: number[];
    conductionGainsRadiant: number[];
    conductionGainsConvective: number[];
    internalGainsSensibleRadiant: number[];
    internalGainsSensibleConvective: number[];
    internalGainsLatent: number[];
}

export interface WindowCalculationResult {
    global: CalculationResultData;
    clearSky: CalculationResultData;
    incidentSolarPower: number[];
}

export interface CalculationLoadComponents {
    solar: number[];
    conduction: number[];
    internalSensible: number[];
    ventilationSensible: number[];
}

export interface CalculationResults {
    finalGains: {
        global: CalculationResultData;
        clearSky: CalculationResultData;
    };
    internalGainsLoad: CalculationResultData;
    windowGainsLoad: {
        global: CalculationResultData;
        clearSky: CalculationResultData;
    },
    ventilationLoad: CalculationResultData;
    components: CalculationComponents;
    loadComponents: {
      solar: number[],
      conduction: number[],
      internalSensible: number[],
      ventilationSensible: number[],
    };
    incidentSolarPower: number[];
}

export interface AllData {
    pvgis: any;
    nsrdb: any;
    rts: any;
    shading: any;
}

export type ToastType = 'info' | 'success' | 'danger';

export interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

export type ChartViewType = ChartType;
