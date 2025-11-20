
import { Window, AccumulationSettings, InternalGains, AllData, InputState, CalculationResults, Shading, CalculationResultData } from '../types';
import { PEOPLE_ACTIVITY_LEVELS, LIGHTING_TYPES, VENTILATION_EXCHANGER_TYPES } from '../constants';
import { SHGC_DIFFUSE_MULTIPLIERS, SHGC_DIRECT_CORRECTION_CURVES } from '../src/config/shgcConfig';


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
    const angles = Object.keys(curve).map(Number);
    
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
            
            const nsrdbDirData = allData.nsrdb[month]?.[direction];
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

export function generateTemperatureProfile(tExternalMax: number, month: string, allData: AllData): number[] {
    const tProfile: number[] = [];
    const monthData = allData.pvgis[month] || allData.pvgis['7'];
    if (!monthData || !monthData.T2m || monthData.T2m.length < 24) {
        const tMin = tExternalMax - 10;
        for (let i = 0; i < 24; i++) {
            const temp = (tExternalMax + tMin) / 2 - ((tExternalMax - tMin) / 2) * Math.cos((2 * Math.PI * (i - 14)) / 24);
            tProfile.push(temp);
        }
        return tProfile;
    }
    
    const hourlyTemps = monthData.T2m;
    const maxTempInProfile = Math.max(...hourlyTemps);
    const delta = tExternalMax - maxTempInProfile;
    
    return hourlyTemps.map((t: number) => t + delta);
}

export function calculateWorstMonth(windows: Window[], allData: AllData): string {
    if (!windows || windows.length === 0) return '7';

    let maxSolarGain = -Infinity;
    let worstMonth = '7';

    for (let month = 4; month <= 9; month++) {
        let monthSolarGain = 0;
        const monthStr = month.toString();

        if (allData.nsrdb[monthStr]) {
            for (const window of windows) {
                const area = window.width * window.height;
                const dirData = allData.nsrdb[monthStr][window.direction];
                if (dirData && dirData.Gcs) {
                    const dailyIrradiance = dirData.Gcs.reduce((sum: number, val: number) => sum + val, 0);
                    monthSolarGain += dailyIrradiance * area * window.shgc;
                }
            }
        }
        
        if (monthSolarGain > maxSolarGain) {
            maxSolarGain = monthSolarGain;
            worstMonth = monthStr;
        }
    }

    return worstMonth;
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

    if (internalGains.ventilation && internalGains.ventilation.enabled) {
        const airflow = Number(internalGains.ventilation.airflow) || 0;
        const { exchangerType } = internalGains.ventilation;
        const exchanger = VENTILATION_EXCHANGER_TYPES[exchangerType];
        const C_s = 0.342;
        const C_l = 836.1;

        const getHumidityRatioWithRH = (temp: number, rh: number) => {
            const SVP = 611.2 * Math.exp(17.67 * temp / (temp + 243.5));
            const VP = SVP * rh;
            const P = 101325;
            return 0.622 * VP / (P - VP);
        };

        const getHumidityRatioFromDewPoint = (dewPoint: number) => {
            const SVP = 611.2 * Math.exp(17.67 * dewPoint / (dewPoint + 243.5));
            const P_atm = 101325;
            return (0.622 * SVP) / (P_atm - SVP);
        };
        
        const wInternal = getHumidityRatioWithRH(tInternal, rhInternal);
        const wExternal = getHumidityRatioFromDewPoint(parseFloat(input.tDewPoint) || 15);

        for (let h = 0; h < 24; h++) {
            const tExt = tExtProfile[h];
            ventilationLoadSensible[h] = C_s * airflow * (tExt - tInternal) * (1 - exchanger.eta_s);
            ventilationLoadLatent[h] = C_l * airflow * (wExternal - wInternal) * (1 - exchanger.eta_l);
        }
    }

    const ventilationLoad: CalculationResultData = {
        sensible: ventilationLoadSensible,
        latent: ventilationLoadLatent,
        total: ventilationLoadSensible.map((s, i) => s + ventilationLoadLatent[i]),
    };

    const finalGains = { global: { sensible: [], latent: [], total: [] }, clearSky: { sensible: [], latent: [], total: [] } };
    const allComponents: any = {
        clearSky: { solar: [], conduction: [] },
        global: { solar: [], conduction: [] }
    };
    
    const incidentSolarPower = Array(24).fill(0);
    if(windows.length > 0) {
        windows.forEach(win => {
            const area = win.width * win.height;
            const nsrdbDirData = allData.nsrdb[month]?.[win.direction];
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
                    internalGainsSensibleRadiant[hour] += peopleCount * sensibleGain * activity.radiantFraction;
                    internalGainsSensibleConvective[hour] += peopleCount * sensibleGain * (1 - activity.radiantFraction);
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
                    internalGainsSensibleRadiant[h] += heatToSpace * lightingType.radiativeFraction;
                    internalGainsSensibleConvective[h] += heatToSpace * (1 - lightingType.radiativeFraction);
                }
            }
        }
    }
    
    internalGains.equipment.forEach(item => {
        const startHourUTC = (item.startHour - offset + 24) % 24;
        const endHourUTC = (item.endHour - offset + 24) % 24;
        const power = Number(item.power) || 0;
        const quantity = Number(item.quantity) || 0;
        for (let hour = 0; hour < 24; hour++) {
            if (isHourActive(hour, startHourUTC, endHourUTC)) {
                internalGainsSensibleRadiant[hour] += power * quantity * 0.5;
                internalGainsSensibleConvective[hour] += power * quantity * 0.5;
            }
        }
    });

    const rtsFactorsSolar = getRtsFactors(accumulation, allData, true);
    const rtsFactorsNonSolar = getRtsFactors(accumulation, allData, false);

    let clearSkyConductionRadiant: number[] = [];
    let clearSkySolarRadiant_Solar: number[] = [];
    let clearSkySolarRadiant_NonSolar: number[] = [];

    ['clearSky', 'global'].forEach(scenario => {
        const solarConvectiveGains = Array(24).fill(0);
        const solarRadiantGains_SolarRTS = Array(24).fill(0);
        const solarRadiantGains_NonSolarRTS = Array(24).fill(0);
        const conductionGainsConvective = Array(24).fill(0);
        const conductionRadiantGains_NonSolarRTS = Array(24).fill(0);
        
        const componentSolarGains = Array(24).fill(0);
        const componentConductionGains = Array(24).fill(0);

        windows.forEach(win => {
            const area = win.width * win.height;
            const nsrdbDirData = allData.nsrdb[month]?.[win.direction];

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

                    let beamIrradiance, diffuseIrradiance;
                    if (scenario === 'clearSky') {
                        beamIrradiance = nsrdbDirData.Gb?.[h] || 0;
                        diffuseIrradiance = (nsrdbDirData.Gcs?.[h] || 0) - beamIrradiance;
                    } else {
                        const pvgisDirData = allData.pvgis[month]?.[win.direction];
                        beamIrradiance = pvgisDirData?.Gb?.[h] || 0;
                        diffuseIrradiance = (pvgisDirData?.G?.[h] || 0) - beamIrradiance;
                    }

                    // Overhang Shading Logic (ASHRAE)
                    // Applied only to beam irradiance (direct solar)
                    let overhangShadingFactor = 0;
                    if (win.overhang?.enabled) {
                        const beta = nsrdbDirData.solar_altitude?.[h] || 0;
                        const gamma = nsrdbDirData.gamma?.[h] || 0;

                        // Only calculate shadow if sun is "in front" of the wall (cos(gamma) > 0) and above horizon
                        // Gamma in pvlib can be 0-360, so we use cosine to check front/back logic regardless of normalization
                        if (beta > 0 && Math.cos(gamma * Math.PI / 180) > -0.01) {
                            const betaRad = beta * Math.PI / 180;
                            const gammaRad = gamma * Math.PI / 180;
                            
                            // Profile angle (Omega) - vertical angle of sun relative to window plane
                            // tan(Omega) = tan(Beta) / cos(Gamma)
                            // Note: cos(gamma) > 0 because we checked it
                            const tanOmega = Math.tan(betaRad) / Math.cos(gammaRad);
                            
                            // tanOmega > 0 because beta > 0 and cos(gamma) > 0
                            if (tanOmega > 0) {
                                const shadowLength = win.overhang.depth * tanOmega;
                                // Shadow starts at the overhang, must cover the distance above window first
                                const shadowOnGlass = shadowLength - win.overhang.distanceAbove;
                                const shadedHeight = Math.max(0, Math.min(win.height, shadowOnGlass));
                                overhangShadingFactor = shadedHeight / win.height;
                            }
                        }
                    }

                    // Reduce beam irradiance by overhang factor
                    beamIrradiance = beamIrradiance * (1 - overhangShadingFactor);

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
            internalGainsSensibleConvective[h] + solarConvectiveGains[h] + conductionGainsConvective[h] + ventilationLoadSensible[h]
        );
        
        const sensibleLoad = Array(24).fill(0).map((_, h) => solarLoadFromSolarRTS[h] + nonSolarCoolingLoad[h] + totalConvectiveLoad[h]);
        const totalLatentLoad = internalGainsLatent.map((l, i) => l + ventilationLoad.latent[i]);

        finalGains[scenario as 'global' | 'clearSky'] = {
            sensible: sensibleLoad,
            latent: totalLatentLoad,
            total: sensibleLoad.map((s, h) => s + totalLatentLoad[h])
        };

        allComponents[scenario].solar = componentSolarGains;
        allComponents[scenario].conduction = componentConductionGains;

        if (scenario === 'clearSky') {
            clearSkyConductionRadiant = [...conductionRadiantGains_NonSolarRTS];
            clearSkySolarRadiant_Solar = [...solarRadiantGains_SolarRTS];
            clearSkySolarRadiant_NonSolar = [...solarRadiantGains_NonSolarRTS];
        }
    });
    
    const totalIncidentSolarPower = Array(24).fill(0);
    if (windows.length > 0) {
      for (let h = 0; h < 24; h++) {
        let hourlySum = 0;
        windows.forEach(win => {
          const area = win.width * win.height;
          const nsrdbDirData = allData.nsrdb[month]?.[win.direction];
          hourlySum += (nsrdbDirData?.Gcs?.[h] || 0) * area;
        });
        totalIncidentSolarPower[h] = hourlySum;
      }
    }


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
    
    const solarLoadFromSolarRTS = accumulation.include ? applyRTS(clearSkySolarRadiant_Solar, rtsFactorsSolar) : clearSkySolarRadiant_Solar;
    const solarLoadFromNonSolarRTS = accumulation.include ? applyRTS(clearSkySolarRadiant_NonSolar, rtsFactorsNonSolar) : clearSkySolarRadiant_NonSolar;
    const solarConvectiveTotal = Array(24).fill(0).map((_, h) => {
        let sum = 0;
        windows.forEach(win => {
            const area = win.width * win.height;
            const nsrdbDirData = allData.nsrdb[month]?.[win.direction];
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

    return {
        finalGains,
        internalGainsLoad: {
            sensible: loadComponents_internalSensible,
            latent: internalGainsLatent,
            total: loadComponents_internalSensible.map((g,i) => g + internalGainsLatent[i])
        },
        windowGainsLoad: {
            global: { sensible: finalGains.global.sensible.map((g,i) => g - loadComponents_internalSensible[i] - ventilationLoad.sensible[i]), latent: Array(24).fill(0), total: finalGains.global.sensible.map((g,i) => g - loadComponents_internalSensible[i] - ventilationLoad.sensible[i]) },
            clearSky: { sensible: finalGains.clearSky.sensible.map((g,i) => g - loadComponents_internalSensible[i] - ventilationLoad.sensible[i]), latent: Array(24).fill(0), total: finalGains.clearSky.sensible.map((g,i) => g - loadComponents_internalSensible[i] - ventilationLoad.sensible[i]) },
        },
        ventilationLoad,
        components: {
            solarGainsGlobal: allComponents.global.solar,
            solarGainsClearSky: allComponents.clearSky.solar,
            conductionGainsRadiant: clearSkyConductionRadiant,
            conductionGainsConvective: Array(24).fill(0).map((_, h) => allComponents.clearSky.conduction[h] - clearSkyConductionRadiant[h]),
            internalGainsSensibleRadiant,
            internalGainsSensibleConvective,
            internalGainsLatent
        },
        loadComponents: {
            solar: loadComponents_solar,
            conduction: loadComponents_conduction,
            internalSensible: loadComponents_internalSensible,
            ventilationSensible: ventilationLoad.sensible,
        },
        incidentSolarPower: totalIncidentSolarPower,
    };
}
