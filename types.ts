
import { ChartType } from 'chart.js';

export type AppTab = 'internal' | 'windows' | 'ventilation' | 'summary' | 'rts';

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
  tilt: number;
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
    type: 'none' | 'mechanical' | 'natural';
    airflow: number | ''; // m3/h
    exchangerType: 'counterflow_hrv' | 'counterflow_erv' | 'rotary_condensing' | 'rotary_sorption';
    outdoorMoistureContent: number | ''; // kg/kg
    naturalVentilationAirflow: number | ''; // m3/h
    includeInfiltration: boolean;
    exteriorWallPerimeter: number | ''; // m
    roomHeight: number | ''; // m
    buildingStories: '1' | '2' | '3+';
    tightnessClass: 'tight' | 'average' | 'leaky';
    shieldingClass: '1' | '2' | '3' | '4' | '5';
    windSpeed: number | ''; // m/s
}

export interface InputState {
    projectName: string;
    tInternal: string;
    rhInternal: string;
    tExternal: string;
    roomArea: string;
}

export interface CalculationResultData {
    sensible: number[];
    latent: number[];
    total: number[];
}

export interface CalculationComponents {
    solarGainsClearSky: number[];
    conductionGainsRadiant: number[];
    conductionGainsConvective: number[];
    internalGainsSensibleRadiant: number[];
    internalGainsSensibleConvective: number[];
    internalGainsLatent: number[];
}

export interface CalculationLoadComponents {
    solar: number[];
    conduction: number[];
    internalSensible: number[];
    ventilationSensible: number[];
    infiltrationSensible: number[];
}

export interface CalculationResults {
    finalGains: {
        clearSky: CalculationResultData;
    };
    internalGainsLoad: CalculationResultData;
    windowGainsLoad: {
        clearSky: CalculationResultData;
    },
    ventilationLoad: CalculationResultData;
    infiltrationLoad: CalculationResultData;
    components: CalculationComponents;
    loadComponents: CalculationLoadComponents;
    instantaneousGains: {
        clearSky: CalculationResultData;
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

export interface SavedProject {
    name: string;
    date: string;
    data: any;
}

export interface State {
    windows: Window[];
    input: InputState;
    accumulation: AccumulationSettings;
    internalGains: InternalGains;
    allData: AllData | null;
    results: { withShading: CalculationResults, withoutShading: CalculationResults } | null;
    activeResults: CalculationResults | null;
    isShadingViewActive: boolean;
    currentMonth: string;
    resultMessage: string;
    tExtProfile: number[];
    chartType: 'line' | 'bar';
    modal: { isOpen: boolean; type?: string | null; data?: any };
    theme: 'light' | 'dark';
    toasts: { id: number; message: string; type: 'info' | 'success' | 'danger' }[];
    activeTab: AppTab;
    selectedDirection: string | null;
    hoveredDirection: string | null;
    isSidebarOpen: boolean;
    isGeneratingReport: boolean;
    savedProjects: SavedProject[];
}

export type Action = 
    | { type: 'SET_ALL_DATA'; payload: AllData }
    | { type: 'SET_INPUT'; payload: InputState }
    | { type: 'ADD_WINDOW'; payload: Omit<Window, 'id'> }
    | { type: 'UPDATE_WINDOW'; payload: Window }
    | { type: 'DELETE_WINDOW'; payload: number }
    | { type: 'DUPLICATE_WINDOW'; payload: number }
    | { type: 'UPDATE_ALL_SHADING'; payload: Partial<Shading> & { enabled: boolean } }
    | { type: 'SET_ACCUMULATION'; payload: AccumulationSettings }
    | { type: 'SET_INTERNAL_GAINS'; payload: InternalGains }
    | { type: 'SET_VENTILATION_GAINS'; payload: VentilationGains }
    | { type: 'ADD_EQUIPMENT_ITEM'; payload?: { name: string; power: number } }
    | { type: 'DELETE_EQUIPMENT_ITEM'; payload: number }
    | { type: 'SET_RESULTS'; payload: { results: { withShading: CalculationResults, withoutShading: CalculationResults }; month: string; tExtProfile: number[], message: string } }
    | { type: 'CLEAR_RESULTS' }
    | { type: 'SET_ACTIVE_RESULTS'; payload: CalculationResults }
    | { type: 'SET_SHADING_VIEW'; payload: boolean }
    | { type: 'RECALCULATE_VIEW'; payload: string }
    | { type: 'TOGGLE_CHART_TYPE' }
    | { type: 'SET_MODAL'; payload: { isOpen: boolean; type?: string | null; data?: any } }
    | { type: 'ADD_TOAST'; payload: { message: string; type: 'info' | 'success' | 'danger' } }
    | { type: 'REMOVE_TOAST'; payload: number }
    | { type: 'SAVE_PROJECT' } // Legacy single save
    | { type: 'LOAD_PROJECT' } // Legacy single load
    | { type: 'SAVE_PROJECT_AS'; payload: string }
    | { type: 'LOAD_PROJECT_FROM_LIST'; payload: string }
    | { type: 'DELETE_PROJECT'; payload: string }
    | { type: 'SET_SAVED_PROJECTS'; payload: SavedProject[] }
    | { type: 'GENERATE_SHARE_LINK' }
    | { type: 'RESET_PROJECT' }
    | { type: 'SET_STATE'; payload: Partial<State> }
    | { type: 'SET_ACTIVE_TAB'; payload: AppTab }
    | { type: 'SET_SELECTED_DIRECTION', payload: string | null }
    | { type: 'SET_HOVERED_DIRECTION', payload: string | null }
    | { type: 'TOGGLE_SIDEBAR' }
    | { type: 'SET_GENERATING_REPORT', payload: boolean };

