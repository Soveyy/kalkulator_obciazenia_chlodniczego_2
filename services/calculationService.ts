
import { Window, AccumulationSettings, InternalGains, AllData, InputState, CalculationResults, Shading, CalculationResultData } from '../types';
import { PEOPLE_ACTIVITY_LEVELS, LIGHTING_TYPES, VENTILATION_EXCHANGER_TYPES, EQUIPMENT_PRESETS } from '../constants';
import { SHGC_DIFFUSE_MULTIPLIERS, SHGC_DIRECT_CORRECTION_CURVES } from '../src/config/shgcConfig';


const ASHRAE_TEMPERATURE_FRACTIONS = [
    0.88, 0.92, 0.95, 0.98, 1.00, 0.98, 0.91, 0.74, 0.55, 0.38, 0.23, 0.13,
    0.05, 0.00, 0.00, 0.06, 0.14, 0.24, 0.39, 0.50, 0.59, 0.68, 0.75, 0.82
];

export function generateAshraeTemperatureProfile(peakTemp: number, dailyRange: number): number[] {
    return ASHRAE_TEMPERATURE_FRACTIONS.map(fraction => {
        // T_hour = T_peak - (Fraction * DailyRange)
        const temp = peakTemp - (fraction * dailyRange);
        return Number(temp.toFixed(2));
    });
}

function interpolate(x: number, x0: number, y0: number, x1: number, y1: number): number {
    if (x1 === x0) return y0;
    return y0 + (x - x0) * (y1 - y0) / (x1 - x0);
}

function getCorrectedSHGC(window: Window, nsrdbDirData: any, hour: number): { shgc_direct: number, shgc_diffuse: number } {
    const angleOfIncidence = nsrdbDirData.theta?.[hour] ?? 90;
    const baseSHGC = window.shgc;
    const windowTypeKey = window.type as keyof typeof SHGC_DIFFUSE_MULTIPLIERS;
    const diffuseMultiplier = SHGC_DIFFUSE_MULTIPLIERS[windowTypeKey] || 1.0;
    const shgc_diffuse = baseSHGC * diffuseMultiplier;

    if (angleOfIncidence >= 90) {
        return { shgc_direct: 0, shgc_diffuse };
    }

    const curve = SHGC_DIRECT_CORRECTION_CURVES[windowTypeKey];
    const angles = Object.keys(curve).map(Number).sort((a, b) => a - b);
    
    let x0 = angles.filter(a => a <= angleOfIncidence).pop();
    if (x0 === undefined) x0 = 0;

    let x1 = angles.find(a => a >= angleOfIncidence);
    if (x1 === undefined) x1 = 90;

    const y0 = curve[x0 as keyof typeof curve];
    const y1 = curve[x1 as keyof typeof curve];

    const correctionFactor = interpolate(angleOfIncidence, x0, y0, x1, y1);
    
    return { shgc_direct: baseSHGC * correctionFactor, shgc_diffuse };
}

function getShadingFactors(window: Window, allData: AllData, hour: number, month: string, forceDisableShading = false): { iac_beam: number, iac_diff: number, fr: number, is_indoor: boolean } {
    const fallback = { iac_beam: 1.0, iac_diff: 1.0, fr: 1.0, is_indoor: false };
    const { shading, type: windowType, direction } = window;

    if (forceDisableShading || !shading.enabled) {
        return fallback;
    }

    const db = allData.shading[windowType as keyof typeof allData.shading] || allData.shading.standard;
    if (!db) return fallback;

    const { type, location, color, setting, material } = shading;
    const is_indoor = location === 'indoor';
    let factors;

    switch (type) {
        case 'louvers':
            factors = db.louvers?.[location]?.[color]?.[setting];
            if (!factors) return { ...fallback, is_indoor };
            
            const tiltStr = (window.tilt ?? 90).toString();
            const nsrdbDirData = allData.nsrdb[month]?.[direction]?.[tiltStr];
            const omega = nsrdbDirData?.omega?.[hour] ?? 0;
            const profileAngle = Math.abs(omega);

            const iac_beam = interpolate(profileAngle, 0, factors.iac0, 60, factors.iac60);
            return { iac_beam, iac_diff: factors.iac_diff, fr: factors.fr, is_indoor };
        case 'draperies':
            const draperyKey = material === 'sheer' ? 'sheer' : `${material}_${color}`;
            factors = db.draperies?.[draperyKey];
            break;
        case 'roller_shades':
            factors = db.roller_shades?.[setting];
            break;
        case 'insect_screens':
            factors = db.insect_screens?.[location];
            break;
        default:
            return fallback;
    }

    if (!factors) return { ...fallback, is_indoor };
    const iac = factors.iac || 1.0;
    return { iac_beam: iac, iac_diff: iac, fr: factors.fr, is_indoor };
}

function applyRTS(radiantGains: number[], rtsFactors: number[]): number[] {
    const coolingLoad = Array(24).fill(0);
    for (let n = 0; n < 24; n++) {
        let currentLoad = 0;
        for (let k = 0; k < 24; k++) {
            currentLoad += (rtsFactors[k] || 0) * (radiantGains[(n - k + 24) % 24] || 0);
        }
        coolingLoad[n] = currentLoad;
    }
    return coolingLoad;
}

function getRtsFactors(accumulation: AccumulationSettings, allData: AllData, solar: boolean): number[] {
    const { thermalMass, floorType, glassPercentage } = accumulation;
    const rtsSeriesType = solar ? 'solar' : 'nonsolar';
    
    const fallbackFactors = allData.rts['medium']['panels']['50'][rtsSeriesType];
    
    try {
        let selectedGlassP: 10 | 50 | 90 = 50;
        if (glassPercentage <= 30) selectedGlassP = 10;
        else if (glassPercentage <= 70) selectedGlassP = 50;
        else selectedGlassP = 90;

        const factors = allData.rts[thermalMass]?.[floorType]?.[selectedGlassP]?.[rtsSeriesType];
        return factors || fallbackFactors;
    } catch(e) {
        console.error("Could not find RTS factors, using fallback.", e);
        return fallbackFactors;
    }
}

function isHourActive(hour: number, startHour: number, endHour: number): boolean {
    if (startHour < endHour) {
        return hour >= startHour && hour < endHour;
    } else if (startHour > endHour) {
        return hour >= startHour || hour < endHour;
    } else {
        return true;
    }
}

export function generateTemperatureProfile(month: string, allData: AllData): number[] {
    const monthData = allData.warsaw_weather?.monthly_data?.[month];
    if (monthData) {
        return generateAshraeTemperatureProfile(monthData.peakTemp, monthData.dailyRange);
    }
    
    // Fallback if data is missing
    const tProfile: number[] = [];
    const tExternalMax = 32;
    const tMin = tExternalMax - 10;
    for (let i = 0; i < 24; i++) {
        const temp = (tExternalMax + tMin) / 2 + ((tExternalMax - tMin) / 2) * Math.cos((2 * Math.PI * (i - 14)) / 24);
        tProfile.push(temp);
    }
    return tProfile;
}

export function calculateWorstMonth(
    windows: Window[], 
    allData: AllData,
    input: InputState,
    accumulation: AccumulationSettings,
    internalGains: InternalGains
): { worstMonth: string, monthlyPeaks: { month: string, peak: number }[], yearlyMatrix: number[][], solarMatrix: number[][], solarInstantMatrix: number[][] } {
    const monthlyPeaks: { month: string, peak: number }[] = [];
    const yearlyMatrix: number[][] = [];
    const solarMatrix: number[][] = [];
    const solarInstantMatrix: number[][] = [];
    let maxPeakLoad = -Infinity;
    let worstMonth = '7';

    for (let month = 1; month <= 12; month++) {
        const monthStr = month.toString();
        
        // Generate temp profile for this month
        const tExtProfile = generateTemperatureProfile(monthStr, allData);
        
        // Calculate gains for this month
        const results = calculateGainsForMonth(
            windows,
            input,
            tExtProfile,
            monthStr,
            allData,
            accumulation,
            internalGains,
            false // with shading
        );
        
        const totalLoads = results.finalGains.clearSky.total;
        const solarLoads = results.loadComponents.solar;
        const solarInstant = results.components.solarGainsClearSky;
        
        // Heat map matrices (all 12 months)
        yearlyMatrix.push(totalLoads);
        solarMatrix.push(solarLoads);
        solarInstantMatrix.push(solarInstant);

        // Peak analysis (only April to September)
        const mNum = parseInt(monthStr, 10);
        if (mNum >= 4 && mNum <= 9) {
            const peakLoad = Math.max(...totalLoads);
            monthlyPeaks.push({ month: monthStr, peak: peakLoad });

            if (peakLoad > maxPeakLoad) {
                maxPeakLoad = peakLoad;
                worstMonth = monthStr;
            }
        }
    }

    return { worstMonth, monthlyPeaks, yearlyMatrix, solarMatrix, solarInstantMatrix };
}

export function calculateGainsForMonth(
    windows: Window[],
    input: InputState,
    tExtProfile: number[],
    month: string,
    allData: AllData,
    accumulation: AccumulationSettings,
    internalGains: InternalGains,
    isWithoutShading: boolean
): CalculationResults {
    const tInternal = parseFloat(input.tInternal) || 24;
    const roomArea = parseFloat(input.roomArea) || 20;
    const rhInternal = (parseFloat(input.rhInternal) || 50) / 100;
    
    const monthInt = parseInt(month, 10);
    const isSummerTime = (monthInt >= 4 && monthInt <= 10);
    const offset = isSummerTime ? 2 : 1;

    const ventilationLoadSensible = Array(24).fill(0);
    const ventilationLoadLatent = Array(24).fill(0);
    const infiltrationLoadSensible = Array(24).fill(0);
    const infiltrationLoadLatent = Array(24).fill(0);

    const getHumidityRatioWithRH = (temp: number, rh: number) => {
        const SVP = 611.2 * Math.exp(17.67 * temp / (temp + 243.5));
        const VP = SVP * rh;
        const P = 101325;
        return 0.622 * VP / (P - VP);
    };

    const wInternal = getHumidityRatioWithRH(tInternal, rhInternal);
    
    if (internalGains.ventilation) {
        const { 
            enabled, type, airflow, exchangerType, naturalVentilationAirflow,
            includeInfiltration, exteriorWallPerimeter, roomHeight, buildingStories, tightnessClass, shieldingClass, windSpeed
        } = internalGains.ventilation;

        const monthData = allData.warsaw_weather?.monthly_data?.[month];
        let wExternal = 0.0125; // fallback
        if (monthData) {
            wExternal = getHumidityRatioWithRH(monthData.peakTemp, monthData.mcrh / 100);
        }

        const Q_mech_h = Array(24).fill(0);
        const Q_nat_h = Array(24).fill(0);
        const Q_inf_h = Array(24).fill(0);

        if (enabled) {
            if (type === 'mechanical') {
                const mechAirflow = Number(airflow) || 0;
                for (let h = 0; h < 24; h++) {
                    Q_mech_h[h] = mechAirflow;
                }
            } else if (type === 'natural') {
                const natAirflow = Number(naturalVentilationAirflow) || 0;
                for (let h = 0; h < 24; h++) {
                    Q_nat_h[h] = natAirflow;
                }
            }
        }

        if (includeInfiltration) {
            const perimeter = Number(exteriorWallPerimeter) || 0;
            const height = Number(roomHeight) || 0;
            const wallArea = perimeter * height;

            let tightnessFactor = 2.0; // average
            if (tightnessClass === 'tight') tightnessFactor = 0.7;
            if (tightnessClass === 'leaky') tightnessFactor = 4.0;
            
            const A_L = wallArea * tightnessFactor; // cm2

            let C_s = 0.000145; // 1 story
            if (buildingStories === '2') C_s = 0.000290;
            if (buildingStories === '3+') C_s = 0.000435;

            const C_w_table: Record<string, number[]> = {
                '1': [0.000319, 0.000420, 0.000494],
                '2': [0.000246, 0.000325, 0.000382],
                '3': [0.000174, 0.000231, 0.000271],
                '4': [0.000104, 0.000137, 0.000161],
                '5': [0.000032, 0.000042, 0.000049],
            };

            let storyIndex = 0;
            if (buildingStories === '2') storyIndex = 1;
            if (buildingStories === '3+') storyIndex = 2;

            const C_w = C_w_table[shieldingClass]?.[storyIndex] || 0.000174;
            const U = Number(windSpeed) || 3.4;

            for (let h = 0; h < 24; h++) {
                const tExt = tExtProfile[h];
                const deltaT = Math.abs(tExt - tInternal);
                
                // Q in m3/s
                const Q_m3_s = (A_L / 1000) * Math.sqrt(C_s * deltaT + C_w * U * U);
                Q_inf_h[h] = Q_m3_s * 3600;
            }
        }

        for (let h = 0; h < 24; h++) {
            const tExt = tExtProfile[h];
            
            // Obliczanie dynamicznej gęstości powietrza (równanie stanu gazu doskonałego)
            const rho = 101325 / (287.058 * (tExt + 273.15));
            
            // Dynamiczne współczynniki zgodnie z instrukcją
            const C_s_air_dynamic = (rho * 1006) / 3600; // Wh/(m3*K)
            
            // Ciepło utajone parowania wody zależne od temperatury: h_we = 2501 - 2.36 * t [kJ/kg]
            const h_we = 2501000 - 2360 * tExt;
            const C_l_air_dynamic = (rho * h_we) / 3600; // Wh/(m3*(kg/kg))
            
            if (type === 'mechanical' && enabled) {
                const exchanger = VENTILATION_EXCHANGER_TYPES[exchangerType];
                ventilationLoadSensible[h] = C_s_air_dynamic * Q_mech_h[h] * (tExt - tInternal) * (1 - exchanger.eta_s);
                ventilationLoadLatent[h] = C_l_air_dynamic * Q_mech_h[h] * (wExternal - wInternal) * (1 - exchanger.eta_l);
                
                if (includeInfiltration) {
                    infiltrationLoadSensible[h] = C_s_air_dynamic * Q_inf_h[h] * (tExt - tInternal);
                    infiltrationLoadLatent[h] = C_l_air_dynamic * Q_inf_h[h] * (wExternal - wInternal);
                }
            } else if (type === 'natural' && enabled) {
                if (includeInfiltration) {
                    const Q_combined = Math.sqrt(Q_nat_h[h] * Q_nat_h[h] + Q_inf_h[h] * Q_inf_h[h]);
                    ventilationLoadSensible[h] = C_s_air_dynamic * Q_combined * (tExt - tInternal);
                    ventilationLoadLatent[h] = C_l_air_dynamic * Q_combined * (wExternal - wInternal);
                } else {
                    ventilationLoadSensible[h] = C_s_air_dynamic * Q_nat_h[h] * (tExt - tInternal);
                    ventilationLoadLatent[h] = C_l_air_dynamic * Q_nat_h[h] * (wExternal - wInternal);
                }
            } else {
                if (includeInfiltration) {
                    infiltrationLoadSensible[h] = C_s_air_dynamic * Q_inf_h[h] * (tExt - tInternal);
                    infiltrationLoadLatent[h] = C_l_air_dynamic * Q_inf_h[h] * (wExternal - wInternal);
                }
            }
        }
    }

    const ventilationLoad: CalculationResultData = {
        sensible: ventilationLoadSensible,
        latent: ventilationLoadLatent,
        total: ventilationLoadSensible.map((s, i) => s + ventilationLoadLatent[i]),
    };

    const infiltrationLoad: CalculationResultData = {
        sensible: infiltrationLoadSensible,
        latent: infiltrationLoadLatent,
        total: infiltrationLoadSensible.map((s, i) => s + infiltrationLoadLatent[i]),
    };

    const incidentSolarPower = Array(24).fill(0);
    if(windows.length > 0) {
        windows.forEach(win => {
            const area = win.width * win.height;
            const tiltStr = (win.tilt ?? 90).toString();
            const nsrdbDirData = allData.nsrdb[month]?.[win.direction]?.[tiltStr];
            if (nsrdbDirData?.Gcs) {
                for (let h = 0; h < 24; h++) {
                    incidentSolarPower[h] += (nsrdbDirData.Gcs[h] || 0) * area;
                }
            }
        });
    }

    const internalGainsSensibleRadiant = Array(24).fill(0);
    const internalGainsSensibleConvective = Array(24).fill(0);
    const internalGainsLatent = Array(24).fill(0);

    const peopleSensibleRadiant = Array(24).fill(0);
    const peopleSensibleConvective = Array(24).fill(0);
    const lightingSensibleRadiant = Array(24).fill(0);
    const lightingSensibleConvective = Array(24).fill(0);
    const equipmentSensibleRadiant = Array(24).fill(0);
    const equipmentSensibleConvective = Array(24).fill(0);

    if (internalGains.people.enabled) {
        const activity = PEOPLE_ACTIVITY_LEVELS[internalGains.people.activityLevel];
        if (activity) {
            const peopleCount = Number(internalGains.people.count) || 0;
            const startHourUTC = (internalGains.people.startHour - offset + 24) % 24;
            const endHourUTC = (internalGains.people.endHour - offset + 24) % 24;

            let sensibleGain = activity.sensible;
            let latentGain = activity.latent;

            if (tInternal >= 27) {
                const sensibleReduction = sensibleGain * 0.20;
                sensibleGain -= sensibleReduction;
                latentGain += sensibleReduction;
            }

            for (let hour = 0; hour < 24; hour++) {
                if(isHourActive(hour, startHourUTC, endHourUTC)) {
                    const rad = peopleCount * sensibleGain * activity.radiantFraction;
                    const conv = peopleCount * sensibleGain * (1 - activity.radiantFraction);
                    internalGainsSensibleRadiant[hour] += rad;
                    internalGainsSensibleConvective[hour] += conv;
                    peopleSensibleRadiant[hour] += rad;
                    peopleSensibleConvective[hour] += conv;
                    internalGainsLatent[hour] += peopleCount * latentGain;
                }
            }
        }
    }

    if (internalGains.lighting.enabled && roomArea > 0) {
        const lightingType = LIGHTING_TYPES[internalGains.lighting.type];
        const powerDensity = Number(internalGains.lighting.powerDensity) || 0;
        if (lightingType) {
            const startHourUTC = (internalGains.lighting.startHour - offset + 24) % 24;
            const endHourUTC = (internalGains.lighting.endHour - offset + 24) % 24;
            for (let h = 0; h < 24; h++) {
                if(isHourActive(h, startHourUTC, endHourUTC)) {
                    const totalHeat = powerDensity * roomArea;
                    const heatToSpace = totalHeat * lightingType.spaceFraction;
                    const rad = heatToSpace * lightingType.radiativeFraction;
                    const conv = heatToSpace * (1 - lightingType.radiativeFraction);
                    internalGainsSensibleRadiant[h] += rad;
                    internalGainsSensibleConvective[h] += conv;
                    lightingSensibleRadiant[h] += rad;
                    lightingSensibleConvective[h] += conv;
                }
            }
        }
    }
    
    internalGains.equipment.forEach(item => {
        const startHourUTC = (item.startHour - offset + 24) % 24;
        const endHourUTC = (item.endHour - offset + 24) % 24;
        const power = Number(item.power) || 0;
        const quantity = Number(item.quantity) || 0;
        
        // Find if it matches a preset to get its radiant fraction
        let radiantFraction = 0.4; // Default 40% radiant / 60% convective
        const preset = Object.values(EQUIPMENT_PRESETS).find(p => p.label === item.name);
        if (preset) {
            radiantFraction = preset.radiantFraction;
        }

        for (let hour = 0; hour < 24; hour++) {
            if (isHourActive(hour, startHourUTC, endHourUTC)) {
                const rad = power * quantity * radiantFraction;
                const conv = power * quantity * (1 - radiantFraction);
                internalGainsSensibleRadiant[hour] += rad;
                internalGainsSensibleConvective[hour] += conv;
                equipmentSensibleRadiant[hour] += rad;
                equipmentSensibleConvective[hour] += conv;
            }
        }
    });

    const rtsFactorsSolar = getRtsFactors(accumulation, allData, true);
    const rtsFactorsNonSolar = getRtsFactors(accumulation, allData, false);

    const solarConvectiveGains = Array(24).fill(0);
    const solarRadiantGains_SolarRTS = Array(24).fill(0);
    const solarRadiantGains_NonSolarRTS = Array(24).fill(0);
    const conductionGainsConvective = Array(24).fill(0);
    const conductionRadiantGains_NonSolarRTS = Array(24).fill(0);
    
    const componentSolarGains = Array(24).fill(0);
    const componentConductionGains = Array(24).fill(0);

    windows.forEach(win => {
        const area = win.width * win.height;
        const tiltStr = (win.tilt ?? 90).toString();
        const nsrdbDirData = allData.nsrdb[month]?.[win.direction]?.[tiltStr];

        if (nsrdbDirData) {
            for (let h = 0; h < 24; h++) {
                const tExt = tExtProfile[h];
                const conductiveTotal = win.u * area * (tExt - tInternal);
                componentConductionGains[h] += conductiveTotal;
                
                const radiativeFractionCond = win.shgc <= 0.55 ? 0.46 : 0.33;
                conductionRadiantGains_NonSolarRTS[h] += conductiveTotal * radiativeFractionCond;
                conductionGainsConvective[h] += conductiveTotal * (1 - radiativeFractionCond);

                const shadingFactors = getShadingFactors(win, allData, h, month, isWithoutShading);
                const correctedSHGC = getCorrectedSHGC(win, nsrdbDirData, h);

                // Use only Clear Sky (NSRDB) data
                const beamIrradiance_raw = nsrdbDirData.Gb?.[h] || 0;
                const diffuseIrradiance = (nsrdbDirData.Gcs?.[h] || 0) - beamIrradiance_raw;

                // Overhang Shading Logic (ASHRAE)
                // Applied only to beam irradiance (direct solar)
                let overhangShadingFactor = 0;
                if (win.overhang?.enabled && win.tilt === 90) {
                    const beta = nsrdbDirData.solar_altitude?.[h] || 0;
                    const gamma = nsrdbDirData.gamma?.[h] || 0;

                    if (beta > 0 && Math.cos(gamma * Math.PI / 180) > -0.01) {
                        const betaRad = beta * Math.PI / 180;
                        const gammaRad = gamma * Math.PI / 180;
                        const tanOmega = Math.tan(betaRad) / Math.cos(gammaRad);
                        
                        if (tanOmega > 0) {
                            const shadowLength = win.overhang.depth * tanOmega;
                            const shadowOnGlass = shadowLength - win.overhang.distanceAbove;
                            const shadedHeight = Math.max(0, Math.min(win.height, shadowOnGlass));
                            overhangShadingFactor = shadedHeight / win.height;
                        }
                    }
                }

                const beamIrradiance = beamIrradiance_raw * (1 - overhangShadingFactor);

                const attenuatedBeamGain = (beamIrradiance * correctedSHGC.shgc_direct * area) * shadingFactors.iac_beam;
                const attenuatedDiffuseGain = (diffuseIrradiance * correctedSHGC.shgc_diffuse * area) * shadingFactors.iac_diff;
                componentSolarGains[h] += attenuatedBeamGain + attenuatedDiffuseGain;

                const radiantGain = (attenuatedBeamGain + attenuatedDiffuseGain) * shadingFactors.fr;
                const convectiveGain = (attenuatedBeamGain + attenuatedDiffuseGain) * (1 - shadingFactors.fr);
                solarConvectiveGains[h] += convectiveGain;
                
                if (shadingFactors.is_indoor) solarRadiantGains_NonSolarRTS[h] += radiantGain;
                else solarRadiantGains_SolarRTS[h] += radiantGain;
            }
        }
    });

    const solarLoadFromSolarRTS = accumulation.include ? applyRTS(solarRadiantGains_SolarRTS, rtsFactorsSolar) : solarRadiantGains_SolarRTS;
    const nonSolarRadiantTotal = Array(24).fill(0).map((_, h) => 
        internalGainsSensibleRadiant[h] + conductionRadiantGains_NonSolarRTS[h] + solarRadiantGains_NonSolarRTS[h]
    );
    const nonSolarCoolingLoad = accumulation.include ? applyRTS(nonSolarRadiantTotal, rtsFactorsNonSolar) : nonSolarRadiantTotal;

    const totalConvectiveLoad = Array(24).fill(0).map((_, h) => 
        internalGainsSensibleConvective[h] + solarConvectiveGains[h] + conductionGainsConvective[h] + ventilationLoadSensible[h] + infiltrationLoadSensible[h]
    );
    
    const sensibleLoad = Array(24).fill(0).map((_, h) => solarLoadFromSolarRTS[h] + nonSolarCoolingLoad[h] + totalConvectiveLoad[h]);
    const instantaneousSensibleLoad = Array(24).fill(0).map((_, h) => solarRadiantGains_SolarRTS[h] + nonSolarRadiantTotal[h] + totalConvectiveLoad[h]);
    const totalLatentLoad = internalGainsLatent.map((l, i) => l + ventilationLoad.latent[i] + infiltrationLoad.latent[i]);

    // Breakdown for final load
    const windowsLoad = Array(24).fill(0).map((_, h) => {
        const solarRad = accumulation.include ? applyRTS(solarRadiantGains_SolarRTS, rtsFactorsSolar)[h] : solarRadiantGains_SolarRTS[h];
        const solarRadNonSolar = accumulation.include ? applyRTS(solarRadiantGains_NonSolarRTS, rtsFactorsNonSolar)[h] : solarRadiantGains_NonSolarRTS[h];
        const condRad = accumulation.include ? applyRTS(conductionRadiantGains_NonSolarRTS, rtsFactorsNonSolar)[h] : conductionRadiantGains_NonSolarRTS[h];
        return solarRad + solarRadNonSolar + condRad + solarConvectiveGains[h] + conductionGainsConvective[h];
    });

    const peopleLoad = Array(24).fill(0).map((_, h) => {
        const rad = accumulation.include ? applyRTS(peopleSensibleRadiant, rtsFactorsNonSolar)[h] : peopleSensibleRadiant[h];
        return rad + peopleSensibleConvective[h];
    });

    const lightingLoad = Array(24).fill(0).map((_, h) => {
        const rad = accumulation.include ? applyRTS(lightingSensibleRadiant, rtsFactorsNonSolar)[h] : lightingSensibleRadiant[h];
        return rad + lightingSensibleConvective[h];
    });

    const equipmentLoad = Array(24).fill(0).map((_, h) => {
        const rad = accumulation.include ? applyRTS(equipmentSensibleRadiant, rtsFactorsNonSolar)[h] : equipmentSensibleRadiant[h];
        return rad + equipmentSensibleConvective[h];
    });

    const finalGains = {
        clearSky: {
            sensible: sensibleLoad,
            latent: totalLatentLoad,
            total: sensibleLoad.map((s, h) => s + totalLatentLoad[h]),
            windows: windowsLoad,
            people: peopleLoad,
            lighting: lightingLoad,
            equipment: equipmentLoad,
            ventilationSensible: ventilationLoadSensible,
            infiltrationSensible: infiltrationLoadSensible,
            peopleLatent: internalGainsLatent,
            ventilationLatent: ventilationLoadLatent,
            infiltrationLatent: infiltrationLoadLatent
        }
    };

    const instantaneousGains = {
        clearSky: {
            sensible: instantaneousSensibleLoad,
            latent: totalLatentLoad,
            total: instantaneousSensibleLoad.map((s, h) => s + totalLatentLoad[h])
        }
    };

    const clearSkyConductionRadiant = [...conductionRadiantGains_NonSolarRTS];
    const clearSkySolarRadiant_Solar = [...solarRadiantGains_SolarRTS];
    const clearSkySolarRadiant_NonSolar = [...solarRadiantGains_NonSolarRTS];

    const conductionConvectiveTotal = Array(24).fill(0).map((_, h) => {
        let sum = 0;
        windows.forEach(win => {
            const area = win.width * win.height;
            const tExt = tExtProfile[h];
            const conductiveTotal = win.u * area * (tExt - tInternal);
            const radiativeFractionCond = win.shgc <= 0.55 ? 0.46 : 0.33;
            sum += conductiveTotal * (1 - radiativeFractionCond);
        });
        return sum;
    });

    const conductionLoadFromRadiant = accumulation.include ? applyRTS(clearSkyConductionRadiant, rtsFactorsNonSolar) : clearSkyConductionRadiant;
    const loadComponents_conduction = Array(24).fill(0).map((_, h) => conductionConvectiveTotal[h] + conductionLoadFromRadiant[h]);
    
    const internalLoadFromRadiant = accumulation.include ? applyRTS(internalGainsSensibleRadiant, rtsFactorsNonSolar) : internalGainsSensibleRadiant;
    const loadComponents_internalSensible = Array(24).fill(0).map((_, h) => internalGainsSensibleConvective[h] + internalLoadFromRadiant[h]);
    
    const solarLoadFromNonSolarRTS = accumulation.include ? applyRTS(clearSkySolarRadiant_NonSolar, rtsFactorsNonSolar) : clearSkySolarRadiant_NonSolar;
    const solarConvectiveTotal = Array(24).fill(0).map((_, h) => {
        let sum = 0;
        windows.forEach(win => {
            const area = win.width * win.height;
            const tiltStr = (win.tilt ?? 90).toString();
            const nsrdbDirData = allData.nsrdb[month]?.[win.direction]?.[tiltStr];
            if(nsrdbDirData) {
                const shadingFactors = getShadingFactors(win, allData, h, month, isWithoutShading);
                const correctedSHGC = getCorrectedSHGC(win, nsrdbDirData, h);
                
                // Apply overhang shading factor here too for component calculation
                let beamIrradiance = nsrdbDirData.Gb?.[h] || 0;
                
                if (win.overhang?.enabled) {
                    const beta = nsrdbDirData.solar_altitude?.[h] || 0;
                    const gamma = nsrdbDirData.gamma?.[h] || 0;
                    if (beta > 0 && Math.cos(gamma * Math.PI / 180) > -0.01) {
                         const betaRad = beta * Math.PI / 180;
                         const gammaRad = gamma * Math.PI / 180;
                         const tanOmega = Math.tan(betaRad) / Math.cos(gammaRad);
                         if (tanOmega > 0) {
                             const shadowLength = win.overhang.depth * tanOmega;
                             const shadowOnGlass = shadowLength - win.overhang.distanceAbove;
                             const shadedHeight = Math.max(0, Math.min(win.height, shadowOnGlass));
                             const factor = shadedHeight / win.height;
                             beamIrradiance = beamIrradiance * (1 - factor);
                         }
                    }
                }

                const diffuseIrradiance = (nsrdbDirData.Gcs?.[h] || 0) - (nsrdbDirData.Gb?.[h] || 0); // Original beam for diffuse calc
                const attenuatedBeamGain = (beamIrradiance * correctedSHGC.shgc_direct * area) * shadingFactors.iac_beam;
                const attenuatedDiffuseGain = (diffuseIrradiance * correctedSHGC.shgc_diffuse * area) * shadingFactors.iac_diff;
                sum += (attenuatedBeamGain + attenuatedDiffuseGain) * (1 - shadingFactors.fr);
            }
        });
        return sum;
    });

    const loadComponents_solar = Array(24).fill(0).map((_, h) => solarConvectiveTotal[h] + solarLoadFromSolarRTS[h] + solarLoadFromNonSolarRTS[h]);

    const windowGainsSensible = windowsLoad;

    return {
        finalGains,
        internalGainsLoad: {
            sensible: loadComponents_internalSensible,
            latent: internalGainsLatent,
            total: loadComponents_internalSensible.map((g,i) => g + internalGainsLatent[i])
        },
        windowGainsLoad: {
            clearSky: { 
                sensible: windowGainsSensible, 
                latent: Array(24).fill(0), 
                total: windowGainsSensible 
            },
        },
        ventilationLoad,
        infiltrationLoad,
        components: {
            solarGainsClearSky: componentSolarGains,
            conductionGainsRadiant: clearSkyConductionRadiant,
            conductionGainsConvective: Array(24).fill(0).map((_, h) => componentConductionGains[h] - clearSkyConductionRadiant[h]),
            internalGainsSensibleRadiant,
            internalGainsSensibleConvective,
            internalGainsLatent
        },
        loadComponents: {
            solar: loadComponents_solar,
            conduction: loadComponents_conduction,
            internalSensible: loadComponents_internalSensible,
            ventilationSensible: ventilationLoad.sensible,
            infiltrationSensible: infiltrationLoad.sensible
        },
        instantaneousGains,
        incidentSolarPower
    };
}
