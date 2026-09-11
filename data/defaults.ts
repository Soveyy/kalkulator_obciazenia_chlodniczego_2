import { RoomState } from '../types';

export const createInitialRoomState = (
    id = 'room-1',
    name = 'Pomieszczenie 1'
): RoomState => ({
    id,
    name,
    windows: [],
    walls: [],
    input: { tInternal: '24', rhInternal: '50', roomArea: '' },
    accumulation: {
        include: true,
        rtsPreset: 'heavy',
        floorType: 'panels',
        glassPercentage: 50
    },
    internalGains: {
        people: {
            enabled: false,
            count: 1,
            activityLevel: 'seated_very_light',
            startHour: 8,
            endHour: 16,
        },
        lighting: {
            enabled: false,
            type: 'led_troffer',
            powerDensity: 8.0,
            startHour: 8,
            endHour: 16,
        },
        equipment: [],
        advancedAppliances: [],
        ventilation: {
            enabled: false,
            type: 'none',
            airflow: 150,
            exchangerType: 'counterflow_hrv',
            heatRecoveryEfficiency: 85,
            moistureRecoveryEfficiency: 0,
            naturalVentilationAirflow: 150,
            includeInfiltration: false,
            exteriorWallPerimeter: '',
            roomHeight: 2.7,
            buildingStories: '1',
            tightnessClass: 'average',
            shieldingClass: '3',
            windSpeed: 3.4,
        },
    },
    results: null,
    activeResults: null,
    currentMonth: '7',
    resultMessage: '',
    tExtProfile: [],
    monthlyPeaks: [],
    yearlyMatrix: null,
    solarMatrix: null,
    solarInstantMatrix: null,
});
