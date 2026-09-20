import type { State } from '../types';
import { coolingProfile } from './resultModel';
import { isRoomResultCurrent, parseNumber } from './validationService';
export function aggregateResults(state: State) {
        const roomsWithResults = state.rooms.every(isRoomResultCurrent) ? state.rooms : [];
        if (roomsWithResults.length === 0 || roomsWithResults.some(r => r.currentMonth !== roomsWithResults[0].currentMonth)) return null;

        const hourlyTotal = Array(24).fill(0);
        let sumOfPeaks = 0;
        
        const aggregateFinalGains = {
            clearSky: {
                total: Array(24).fill(0),
                coolingTotal: Array(24).fill(0),
                sensible: Array(24).fill(0),
                latent: Array(24).fill(0),
                equipmentLatent: Array(24).fill(0),
                windows: Array(24).fill(0),
                walls: Array(24).fill(0),
                people: Array(24).fill(0),
                lighting: Array(24).fill(0),
                equipment: Array(24).fill(0),
                ventilationSensible: Array(24).fill(0),
                infiltrationSensible: Array(24).fill(0),
                peopleLatent: Array(24).fill(0),
                ventilationLatent: Array(24).fill(0),
                infiltrationLatent: Array(24).fill(0),
            }
        };

        const aggregateYearlyMatrix: number[][] = Array(12).fill(0).map(() => Array(24).fill(0));
        const aggregateSolarMatrix: number[][] = Array(12).fill(0).map(() => Array(24).fill(0));
        const aggregateSolarInstantMatrix: number[][] = Array(12).fill(0).map(() => Array(24).fill(0));
        
        let weightedTSum = 0;
        let weightedRhSum = 0;
        let totalArea = 0;

        const roomProfiles = roomsWithResults.map(room => {
            const clearSky = room.activeResults!.finalGains.clearSky;
            const profile = coolingProfile(clearSky);
            const roundedProfile = profile; // Round only for display, never before summing.
            const peak = Math.max(...roundedProfile);
            
            let worstPeakVal = peak;
            let worstMonthStr = '7';
            if (room.monthlyPeaks && room.monthlyPeaks.length > 0) {
                const maxObj = room.monthlyPeaks.reduce((prev: any, curr: any) => (prev.peak > curr.peak) ? prev : curr);
                worstPeakVal = maxObj.peak;
                worstMonthStr = maxObj.month;
            }
            sumOfPeaks += worstPeakVal;
            
            const area = parseNumber(room.input.roomArea)!;
            const tInt = parseNumber(room.input.tInternal)!;
            const rhInt = parseNumber(room.input.rhInternal)!;
            
            if (area > 0) {
                totalArea += area;
                weightedTSum += (tInt * area);
                weightedRhSum += (rhInt * area);
            }
            
            for (let i = 0; i < 24; i++) {
                const roundedHourW = roundedProfile[i];
                hourlyTotal[i] += roundedHourW;
                aggregateFinalGains.clearSky.total[i] += clearSky.total[i];
                aggregateFinalGains.clearSky.coolingTotal[i] += roundedHourW;
                aggregateFinalGains.clearSky.sensible[i] += clearSky.sensible[i];
                aggregateFinalGains.clearSky.latent[i] += clearSky.latent[i];
                aggregateFinalGains.clearSky.equipmentLatent[i] += clearSky.equipmentLatent?.[i] ?? 0;
                aggregateFinalGains.clearSky.windows[i] += clearSky.windows?.[i] || 0;
                aggregateFinalGains.clearSky.walls[i] += clearSky.walls?.[i] || 0;
                aggregateFinalGains.clearSky.people[i] += clearSky.people?.[i] || 0;
                aggregateFinalGains.clearSky.lighting[i] += clearSky.lighting?.[i] || 0;
                aggregateFinalGains.clearSky.equipment[i] += clearSky.equipment?.[i] || 0;
                aggregateFinalGains.clearSky.ventilationSensible[i] += clearSky.ventilationSensible?.[i] || 0;
                aggregateFinalGains.clearSky.infiltrationSensible[i] += clearSky.infiltrationSensible?.[i] || 0;
                aggregateFinalGains.clearSky.peopleLatent[i] += clearSky.peopleLatent?.[i] || 0;
                aggregateFinalGains.clearSky.ventilationLatent[i] += clearSky.ventilationLatent?.[i] || 0;
                aggregateFinalGains.clearSky.infiltrationLatent[i] += clearSky.infiltrationLatent?.[i] || 0;
            }

            // sum matrices
            if (room.yearlyMatrix) {
                for (let m = 0; m < 12; m++) {
                    if (room.yearlyMatrix[m]) {
                        for (let h = 0; h < 24; h++) {
                            aggregateYearlyMatrix[m][h] += room.yearlyMatrix[m][h] || 0;
                        }
                    }
                }
            }
            if (room.solarMatrix) {
                for (let m = 0; m < 12; m++) {
                    if (room.solarMatrix[m]) {
                        for (let h = 0; h < 24; h++) {
                            aggregateSolarMatrix[m][h] += room.solarMatrix[m][h] || 0;
                        }
                    }
                }
            }
            if (room.solarInstantMatrix) {
                for (let m = 0; m < 12; m++) {
                    if (room.solarInstantMatrix[m]) {
                        for (let h = 0; h < 24; h++) {
                            aggregateSolarInstantMatrix[m][h] += room.solarInstantMatrix[m][h] || 0;
                        }
                    }
                }
            }
            
            return {
                id: room.id,
                name: room.name,
                area: parseNumber(room.input.roomArea)!,
                profile: roundedProfile,
                peak,
                worstPeak: worstPeakVal,
                worstMonthStr
            };
        });

        const aggregatePeak = roomsWithResults.length > 0 ? Math.max(...hourlyTotal) : 0;
        const peakHour = roomsWithResults.length > 0 ? hourlyTotal.indexOf(aggregatePeak) : 0;

        const diversityFactor = sumOfPeaks > 0 ? aggregatePeak / sumOfPeaks : 1;
        
        const weightedT = totalArea > 0 ? weightedTSum / totalArea : 24;
        const weightedRh = totalArea > 0 ? weightedRhSum / totalArea : 50;

        return {
            roomsWithResults,
            hourlyTotal,
            aggregatePeak,
            peakHour,
            sumOfPeaks,
            diversityFactor,
            weightedT,
            weightedRh,
            roomProfiles,
            aggregateFinalGains,
            aggregateYearlyMatrix,
            aggregateSolarMatrix,
            aggregateSolarInstantMatrix
        };

}
