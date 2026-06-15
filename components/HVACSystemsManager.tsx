import React, { useState, useEffect, useMemo } from 'react';
import { useCalculator } from '../contexts/CalculatorContext';
import Card from './ui/Card';
import { Plus, Trash2, Info, ChevronDown, CheckCircle2, AlertTriangle } from 'lucide-react';
import Tooltip from './ui/Tooltip';
import { HVACSystem } from '../types';

interface Combination {
    indoorUnits: number[];
    indoorCapacities: number[];
}

interface OutdoorUnit {
    model: string;
    maxPorts: number;
    combinations: Combination[];
}

// Stull WB Calculation
const calculateWBStull = (t: number, rh: number): number => {
    const tw = t * Math.atan(0.151977 * Math.pow(rh + 8.313659, 0.5)) + 
               Math.atan(t + rh) - 
               Math.atan(rh - 1.676331) + 
               0.00391838 * Math.pow(rh, 1.5) * Math.atan(0.023101 * rh) - 
               4.686035;
    return Number(tw.toFixed(2));
};

const calculateCorrectionFactor = (outdoorModel: string, tExtVal: number, wbVal: number): number => {
    const outdoorModelLower = outdoorModel.toLowerCase();
    const isSmall = outdoorModelLower.includes('2f33') || outdoorModelLower.includes('2f42') || outdoorModelLower.includes('2f53');
    
    const wbClamped = Math.max(18, Math.min(20, wbVal));

    const getSmallValue = (wbCur: number, tExtCur: number): number => {
        const t = Math.min(40, tExtCur);
        if (wbCur === 18) {
            if (t <= 27) return 1.08;
            const slope = -0.11 / 8; // (0.97 - 1.08) / (35 - 27)
            return 1.08 + slope * (t - 27);
        } else if (wbCur === 20) {
            if (t <= 27) return 1.13;
            const slope = -0.11 / 8; // (1.02 - 1.13) / (35 - 27)
            return 1.13 + slope * (t - 27);
        }
        return 1.0;
    };

    const getValueSmall = (w: number, t: number) => {
        if (w <= 18) return getSmallValue(18, t);
        if (w >= 20) return getSmallValue(20, t);
        const val18 = getSmallValue(18, t);
        const val20 = getSmallValue(20, t);
        const fraction = (w - 18) / 2;
        return val18 + fraction * (val20 - val18);
    };

    const getLargeValue = (wbCur: number, tExtCur: number): number => {
        const t = Math.min(40, tExtCur);
        if (wbCur === 18) {
            return 0.90;
        } else if (wbCur === 19) {
            if (t <= 35) return 1.00;
            const slope = -0.05 / 5; // (0.95 - 1.00) / (40 - 35)
            return 1.00 + slope * (t - 35);
        } else if (wbCur === 20) {
            if (t <= 35) return 1.03;
            const slope = -0.05 / 5; // (0.98 - 1.03) / (40 - 35)
            return 1.03 + slope * (t - 35);
        }
        return 1.0;
    };

    const getValueLarge = (w: number, t: number) => {
        if (w <= 18) return getLargeValue(18, t);
        if (w >= 20) return getLargeValue(20, t);
        if (w <= 19) {
            const val18 = getLargeValue(18, t);
            const val19 = getLargeValue(19, t);
            const fraction = w - 18;
            return val18 + fraction * (val19 - val18);
        } else {
            const val19 = getLargeValue(19, t);
            const val20 = getLargeValue(20, t);
            const fraction = w - 19;
            return val19 + fraction * (val20 - val19);
        }
    };

    if (isSmall) {
        return getValueSmall(wbClamped, tExtVal);
    } else {
        return getValueLarge(wbClamped, tExtVal);
    }
};

const getConnectionRatioColor = (ratio: number) => {
    if (ratio === 0) return '';
    if (ratio <= 130) return 'rgb(34, 197, 94)'; // green-500
    
    if (ratio <= 150) {
        const t = (ratio - 130) / (150 - 130);
        const r = Math.round(34 + (132 - 34) * t);
        const g = Math.round(197 + (204 - 197) * t);
        const b = Math.round(94 + (22 - 94) * t);
        return `rgb(${r}, ${g}, ${b})`;
    }
    
    if (ratio <= 160) {
        const t = (ratio - 150) / (160 - 150);
        const r = Math.round(132 + (245 - 132) * t);
        const g = Math.round(204 + (158 - 204) * t);
        const b = Math.round(22 + (11 - 22) * t);
        return `rgb(${r}, ${g}, ${b})`;
    }

    if (ratio <= 175) {
        const t = (ratio - 160) / (175 - 160);
        const r = Math.round(245 + (185 - 245) * t);
        const g = Math.round(158 + (28 - 158) * t);
        const b = Math.round(11 + (28 - 11) * t);
        return `rgb(${r}, ${g}, ${b})`;
    }
    
    return 'rgb(185, 28, 28)'; // red-700
};

export const HVACSystemsManager: React.FC = () => {
    const { state, dispatch } = useCalculator();
    const [db, setDb] = useState<Record<string, OutdoorUnit> | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetch(`/data/combination_database.json?v=${Date.now()}`)
            .then(res => {
                if (!res.ok) throw new Error(`Status: ${res.status}`);
                return res.json();
            })
            .then(data => {
                setDb(data);
                setIsLoading(false);
            })
            .catch(err => {
                console.error("Failed to load combination database:", err);
                setIsLoading(false);
            });
    }, []);

    const outdoorModels = useMemo(() => {
        if (!db) return [];
        return Object.keys(db);
    }, [db]);

    const availableIndices = useMemo(() => {
        const indices = new Set<number>();
        if (!db) return [];
        Object.values(db).forEach((unit) => {
            (unit as OutdoorUnit).combinations.forEach(comb => {
                comb.indoorUnits.forEach(u => indices.add(u));
            });
        });
        return Array.from(indices).sort((a, b) => a - b);
    }, [db]);

    // Handle adding system safely
    const addSystem = (type: 'split' | 'multi') => {
        const id = `sys-${Date.now()}`;
        const newSys: HVACSystem = {
            id,
            name: `Układ ${state.systems.length + 1}`,
            type,
            outdoorModel: '',
            indoorUnits: [],
            applyTempCorrection: false
        };
        dispatch({ type: 'ADD_SYSTEM', payload: newSys });
    };

    // Calculate peaks per system
    const systemAnalyses = useMemo(() => {
        return state.systems.map(sys => {
            // Check connected rooms
            const roomsInSystem = sys.indoorUnits
                .map(unit => state.rooms.find(r => r.id === unit.roomId))
                .filter(r => r !== undefined) as any[]; // Need the RoomState object

            const selectedMonthVal = state.rooms[0]?.currentMonth || '7';
            const selectedMonthIndex = parseInt(selectedMonthVal, 10) - 1; // 0-indexed monthly index

            // Calculate peak for the whole system within the selected month
            let maxSystemPeak = 0;
            let peakMonth = selectedMonthIndex; // Use selected month
            let peakHour = 0; // 0-23
            
            if (roomsInSystem.length > 0) {
                // Determine system peak from yearly matrices for the selected month
                for (let h = 0; h < 24; h++) {
                    let sum = 0;
                    for (const r of roomsInSystem) {
                        if (r.yearlyMatrix) {
                            sum += r.yearlyMatrix[selectedMonthIndex][h];
                        }
                    }
                    if (sum > maxSystemPeak) {
                        maxSystemPeak = sum;
                        peakHour = h;
                    }
                }
                
                // Now round the total maxSystemPeak properly
                let roundedSumAtPeak = 0;
                for (const r of roomsInSystem) {
                    if (r.yearlyMatrix) {
                        roundedSumAtPeak += Number((r.yearlyMatrix[selectedMonthIndex][peakHour] / 1000).toFixed(2));
                    }
                }
                maxSystemPeak = roundedSumAtPeak * 1000;
            }

            // Derive TExt for the system's peak hour
            let tExtAtPeak = 35; // Fallback
            if (state.allData) {
                const monthStr = (peakMonth + 1).toString();
                // Find hour temperature in allData
                // This is a simplified fetch, we can use the existing generateTemperatureProfile
                const tExtProfile = state.rooms[0]?.tExtProfile;
                if (tExtProfile && tExtProfile[peakHour]) {
                    tExtAtPeak = tExtProfile[peakHour]; // Just an approximation using room 0's profile for that hour
                }
            }

            // Averages for Temp correction
            let weightedT = 24;
            let weightedRh = 50;
            let totalArea = 0;
            let tIntSum = 0;
            let rhSum = 0;

            roomsInSystem.forEach(r => {
                const area = parseFloat(r.input.roomArea) || 0;
                const t = parseFloat(r.input.tInternal) || 24;
                const rh = parseFloat(r.input.rhInternal) || 50;
                if (area > 0) {
                    totalArea += area;
                    tIntSum += t * area;
                    rhSum += rh * area;
                }
            });
            if (totalArea > 0) {
                weightedT = tIntSum / totalArea;
                weightedRh = rhSum / totalArea;
            }

            const calculatedWB = sys.applyTempCorrection ? calculateWBStull(weightedT, weightedRh) : null;
            const correctionFactor = (sys.applyTempCorrection && sys.outdoorModel && calculatedWB !== null)
                ? calculateCorrectionFactor(sys.outdoorModel, tExtAtPeak, calculatedWB)
                : 1;

            const isWbWarning = calculatedWB !== null && calculatedWB < 17;

            // Prepare room results
            let finalResults = roomsInSystem.map(r => {
                const configUnit = sys.indoorUnits.find(u => u.roomId === r.id);
                // peakLoad at the system's hour using rounded value
                const rawPeakVal = r.yearlyMatrix ? r.yearlyMatrix[peakMonth][peakHour] : 0;
                const requiredPeakW = Number((rawPeakVal / 1000).toFixed(2)) * 1000;
                const individualWorstW = r.monthlyPeaks ? Math.max(...r.monthlyPeaks.map((p: any) => p.peak)) : 0;
                
                return {
                    id: r.id,
                    name: r.name,
                    index: configUnit ? configUnit.index : 0,
                    requiredPeakKw: requiredPeakW / 1000,
                    individualPeakKw: individualWorstW / 1000,
                    realCapacityKw: 0,
                    ratio: 0,
                    colorClass: 'text-slate-500',
                    bgClass: ''
                };
            });

            // Match Multi-Split Combination
            let matchRatioStr = '-';
            let outdoorIndex = 0;
            let sumOfIndices = 0;
            
            if (sys.type === 'multi' && sys.outdoorModel && db && db[sys.outdoorModel]) {
                const activeOutdoorUnit = db[sys.outdoorModel];
                outdoorIndex = parseInt(sys.outdoorModel.match(/(\d+)[^\d]*$/)?.[1] || '0', 10);
                
                const selectedIndicesSorted = finalResults.filter(r => r.index > 0).map(r => r.index).sort((a, b) => a - b);
                sumOfIndices = selectedIndicesSorted.reduce((a, b) => a + b, 0);
                matchRatioStr = (outdoorIndex > 0 && sumOfIndices > 0) ? ((sumOfIndices / outdoorIndex) * 100).toFixed(1) + '%' : '-';

                const match = activeOutdoorUnit.combinations.find(comb => {
                    if (comb.indoorUnits.length !== selectedIndicesSorted.length) return false;
                    const combIndicesSorted = [...comb.indoorUnits].sort((a, b) => a - b);
                    return combIndicesSorted.every((val, idx) => val === selectedIndicesSorted[idx]);
                });

                const capacityPool: Record<number, number[]> = {};
                if (match) {
                    match.indoorUnits.forEach((unit, idx) => {
                        if (!capacityPool[unit]) capacityPool[unit] = [];
                        capacityPool[unit].push(match.indoorCapacities[idx]);
                    });
                }

                finalResults = finalResults.map(r => {
                    let realCapacityKw = 0;
                    if (match && r.index > 0) {
                        const caps = capacityPool[r.index];
                        if (caps && caps.length > 0) {
                            realCapacityKw = caps.shift()! * correctionFactor;
                        }
                    }

                    let ratio = 0;
                    if (r.requiredPeakKw > 0) {
                        ratio = (realCapacityKw / r.requiredPeakKw) * 100;
                    }

                    let colorClass = 'text-slate-500';
                    let bgClass = '';
                    
                    if (r.index > 0 && r.requiredPeakKw > 0) {
                        if (ratio >= 90 && ratio <= 150) {
                            colorClass = 'text-green-600 font-bold';
                            bgClass = 'bg-green-50 dark:bg-green-900/10';
                        } else if (ratio >= 75 && ratio < 90) {
                            colorClass = 'text-orange-500 font-bold';
                            bgClass = 'bg-orange-50 dark:bg-orange-900/10';
                        } else if (ratio > 150) {
                            colorClass = 'text-blue-600 font-bold';
                            bgClass = 'bg-blue-50 dark:bg-blue-900/10';
                        } else {
                            colorClass = 'text-red-600 font-bold';
                            bgClass = 'bg-red-50 dark:bg-red-900/10';
                        }
                    }

                    return { ...r, realCapacityKw, ratio, colorClass, bgClass };
                });
            } else if (sys.type === 'split') {
                // Split logic: Just one room, standard calculations from user input
                if (finalResults.length === 1) {
                    const r = finalResults[0];
                    // We don't have a rigid DB for split, so index serves as raw capacity kW approximation if the user set it (not ideal, maybe just skip real capacity logic or provide manual override, for now we just show required).
                }
            }

            return {
                ...sys,
                peakMonth,
                peakHour,
                maxSystemPeakKw: maxSystemPeak / 1000,
                results: finalResults,
                correctionFactor,
                calculatedWB,
                isWbWarning,
                tExtAtPeak,
                outdoorIndex,
                sumOfIndices,
                matchRatioStr
            };
        });
    }, [state.systems, state.rooms, state.allData, db]);

    const unassignedRooms = useMemo(() => {
        const assignedIds = new Set<string>();
        state.systems.forEach(s => s.indoorUnits.forEach(u => assignedIds.add(u.roomId)));
        return state.rooms.filter(r => r.activeResults && !assignedIds.has(r.id)).map(r => {
            const worstW = r.monthlyPeaks ? Math.max(...r.monthlyPeaks.map((p: any) => p.peak)) : 0;
            return {
                id: r.id,
                name: r.name,
                worstKw: worstW / 1000
            };
        });
    }, [state.systems, state.rooms]);

    if (isLoading) {
        return <Card className="p-8 text-center">Ładowanie bazy urządzeń...</Card>;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-3">
                <button
                    onClick={() => addSystem('split')}
                    className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 px-4 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-all hover:shadow-md hover:-translate-y-[2px] active:scale-95 flex items-center gap-2 font-medium"
                >
                    <Plus size={16} /> Dodaj układ Split (RAC/PAC)
                </button>
                <button
                    onClick={() => addSystem('multi')}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-all hover:shadow-md hover:-translate-y-[2px] active:scale-95 flex items-center gap-2 font-medium shadow-sm"
                >
                    <Plus size={16} /> Dodaj układ Multi-Split (MXZ)
                </button>
            </div>

            {systemAnalyses.map((sys) => {
                const isMulti = sys.type === 'multi';
                const hasMissingCombination = isMulti && sys.outdoorModel && sys.results.some(r => r.index > 0 && r.realCapacityKw === 0);

                return (
                    <Card key={sys.id} className="p-0 overflow-hidden border-2 border-indigo-100 dark:border-indigo-900">
                        {/* Header */}
                        <div className="bg-indigo-50 dark:bg-indigo-900/30 p-4 border-b border-indigo-100 dark:border-indigo-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                                <input
                                    type="text"
                                    value={sys.name}
                                    onChange={(e) => dispatch({ type: 'UPDATE_SYSTEM', payload: { ...sys, name: e.target.value } })}
                                    className="text-lg font-bold bg-transparent border-b border-transparent hover:border-indigo-300 focus:border-indigo-500 focus:outline-none transition-colors dark:text-white mb-1"
                                />
                                <div className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                                    {isMulti ? 'System Multi-Split' : 'Klasyczny Split (1:1)'}
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-4 items-center">
                                <div className="text-right">
                                    <div className="text-xs text-slate-500 mb-1">Miesiąc wymiarujący</div>
                                    <div className="font-medium text-slate-800 dark:text-white">
                                        {sys.results.length > 0 ? (() => {
                                            const monthVal = sys.peakMonth + 1;
                                            const isSummerTime = monthVal >= 4 && monthVal <= 10;
                                            const offset = isSummerTime ? 2 : 1;
                                            const localPeakHour = (sys.peakHour + offset) % 24;
                                            return `${monthVal} (${String(localPeakHour).padStart(2, '0')}:00)`;
                                        })() : '-'}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs text-slate-500 mb-1">Obciążenie układu</div>
                                    <div className="text-lg font-bold text-slate-800 dark:text-white">
                                        {sys.maxSystemPeakKw > 0 ? sys.maxSystemPeakKw.toFixed(2) : '-'} <span className="text-sm font-normal">kW</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => dispatch({ type: 'DELETE_SYSTEM', payload: sys.id })}
                                    className="p-2 text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-900/30 rounded-lg transition-colors ml-2"
                                    title="Usuń ten układ"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Configuration */}
                        <div className="p-4 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
                            <div className="flex flex-col md:flex-row gap-6">
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        Agregat zewnętrzny
                                    </label>
                                    {isMulti ? (
                                        <select
                                            value={sys.outdoorModel}
                                            onChange={(e) => dispatch({ type: 'UPDATE_SYSTEM', payload: { ...sys, outdoorModel: e.target.value } })}
                                            className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white rounded-lg block w-full p-2.5"
                                        >
                                            <option value="">Wybierz jednostkę MXZ</option>
                                            {outdoorModels.map(model => (
                                                <option key={model} value={model}>{model}</option>
                                            ))}
                                        </select>
                                    ) : (
                                        <input 
                                            type="text" 
                                            value={sys.outdoorModel} 
                                            onChange={(e) => dispatch({ type: 'UPDATE_SYSTEM', payload: { ...sys, outdoorModel: e.target.value } })}
                                            placeholder="Nazwa jednostki zewn." 
                                            className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white rounded-lg block w-full p-2.5"
                                        />
                                    )}
                                </div>
                                {isMulti && (
                                    <>
                                        <div className="flex-1">
                                            <div className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Suma indeksów</div>
                                            <div className="text-xl font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 px-4 h-11 flex items-center justify-center">
                                                {sys.sumOfIndices} / {sys.outdoorIndex}
                                            </div>
                                        </div>
                                        <div className="flex-1">
                                            <div className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Przewymiarowanie</div>
                                            <div className="text-xl font-bold rounded-lg border flex items-center justify-center h-11" style={{ color: sys.outdoorModel && sys.sumOfIndices > 0 ? getConnectionRatioColor(parseFloat(sys.matchRatioStr)) : undefined, borderColor: 'var(--tw-colors-slate-200, #e2e8f0)', backgroundColor: 'var(--tw-colors-slate-50, #f8fafc)' }}>
                                                {sys.matchRatioStr}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>

                            {isMulti && (
                                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                                    <label className="flex items-center gap-2 cursor-pointer mb-2">
                                        <input 
                                            type="checkbox" 
                                            checked={sys.applyTempCorrection}
                                            onChange={(e) => dispatch({ type: 'UPDATE_SYSTEM', payload: { ...sys, applyTempCorrection: e.target.checked } })}
                                            className="rounded"
                                        />
                                        <span className="text-sm text-slate-700 dark:text-slate-300">Korekcja moc/temp (agregat i T.zewn = {sys.tExtAtPeak.toFixed(1)}°C)</span>
                                    </label>
                                    {sys.applyTempCorrection && sys.outdoorModel && sys.calculatedWB !== null && (
                                        <div className="mt-2 text-xs bg-slate-50 dark:bg-slate-800 p-2 rounded flex gap-4">
                                            <span>Mnożnik: {(sys.correctionFactor * 100).toFixed(1)}%</span>
                                            <span>WB: {sys.calculatedWB.toFixed(1)}°C</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Rooms Table */}
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                                <thead className="bg-slate-50 dark:bg-slate-800">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Pomieszczenie</th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">
                                            <div className="inline-flex items-center justify-end gap-1 w-full">
                                                <span>Obciążenie max</span>
                                                <Tooltip text="Najwyższe możliwe obciążenie dla tego pomieszczenia w jego własnym najgorszym miesiącu" position="bottom" />
                                            </div>
                                        </th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">
                                            <div className="inline-flex items-center justify-end gap-1 w-full">
                                                <span>Obciążenie jednoczesne</span>
                                                <Tooltip text="Obciążenie chłodnicze w miesiącu i godzinie szczytu dla całego wybranego układu (obciążenie z uwzględnieniem jednoczesności na podstawie globalnego max układu)" position="bottom" />
                                            </div>
                                        </th>
                                        {isMulti && (
                                            <>
                                                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase py-3.5">Indeks jw</th>
                                                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">
                                                    <div className="inline-flex items-center justify-end gap-1 w-full font-medium">
                                                        <span>Moc jednoczesna</span>
                                                        <Tooltip text="Rzeczywista docierająca moc chłodnicza jednostki w momencie wystąpienia piku układu" position="bottom" />
                                                    </div>
                                                </th>
                                                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">
                                                    <div className="inline-flex items-center justify-end gap-1 w-full font-medium">
                                                        <span>Pokrycie %</span>
                                                        <Tooltip text="Stosunek mocy jednoczesnej z agregatu do obciążenia jednoczesnego pomieszczenia" position="bottom" />
                                                    </div>
                                                </th>
                                                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">
                                                    <div className="inline-flex items-center justify-end gap-1 w-full font-medium">
                                                        <span>Pokrycie % (max)</span>
                                                        <Tooltip text="Stosunek mocy nominalnej jednostki wew. z typoszeregu do maksymalnego obciążenia pomieszczenia" position="bottom" />
                                                    </div>
                                                </th>
                                            </>
                                        )}
                                        <th className="px-4 py-3 w-10"></th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800">
                                    {sys.results.map((r, i) => (
                                        <tr key={r.id}>
                                            <td className="px-4 py-3 text-sm font-medium text-slate-900 dark:text-white">{r.name}</td>
                                            <td className="px-4 py-3 text-sm text-right text-slate-600 dark:text-slate-400">
                                                {r.individualPeakKw.toFixed(2)} kW
                                            </td>
                                            <td className="px-4 py-3 text-sm text-right font-bold text-slate-700 dark:text-slate-300">
                                                {r.requiredPeakKw > 0 ? r.requiredPeakKw.toFixed(2) : '-'} kW
                                            </td>
                                            {isMulti && (
                                                <>
                                                    <td className="px-4 py-3 text-right">
                                                        <select
                                                            value={r.index}
                                                            onChange={(e) => {
                                                                const newUnits = [...sys.indoorUnits];
                                                                const idx = newUnits.findIndex(u => u.roomId === r.id);
                                                                if (idx > -1) newUnits[idx].index = Number(e.target.value);
                                                                dispatch({ type: 'UPDATE_SYSTEM', payload: { ...sys, indoorUnits: newUnits } });
                                                            }}
                                                            className="bg-slate-50 border border-slate-200 text-sm rounded block w-20 ml-auto p-1"
                                                        >
                                                            <option value="0">-</option>
                                                            {availableIndices.map(idx => <option key={idx} value={idx}>{idx}</option>)}
                                                        </select>
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-right text-slate-600 dark:text-slate-400">
                                                        {r.index > 0 ? (r.realCapacityKw > 0 ? r.realCapacityKw.toFixed(2) + ' kW' : 'Brak w DB') : '-'}
                                                    </td>
                                                    <td className={`px-4 py-3 text-sm text-right ${r.colorClass}`}>
                                                        {r.index > 0 && r.requiredPeakKw > 0 && r.realCapacityKw > 0 ? r.ratio.toFixed(1) + '%' : '-'}
                                                    </td>
                                                    <td className={`px-4 py-3 text-sm text-right ${r.index > 0 && r.individualPeakKw > 0 ? (((r.index / 10) / r.individualPeakKw) * 100 >= 100 ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-rose-500 font-bold') : ''}`}>
                                                        {r.index > 0 && r.individualPeakKw > 0 ? (((r.index / 10) / r.individualPeakKw) * 100).toFixed(1) + '%' : '-'}
                                                    </td>
                                                </>
                                            )}
                                            <td className="px-4 py-3 text-right">
                                                <button 
                                                    onClick={() => {
                                                        const newUnits = sys.indoorUnits.filter(u => u.roomId !== r.id);
                                                        dispatch({ type: 'UPDATE_SYSTEM', payload: { ...sys, indoorUnits: newUnits } });
                                                    }}
                                                    className="text-slate-400 hover:text-rose-500 p-1" title="Odłącz pokój"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {sys.results.length === 0 && (
                                        <tr><td colSpan={isMulti ? 8 : 4} className="px-4 py-4 text-center text-sm text-slate-500">Brak przypisanych pomieszczeń do tego układu.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Assignment dropdown for adding rooms */}
                        {unassignedRooms.length > 0 && !(sys.type === 'split' && sys.indoorUnits.length >= 1) && (
                            <div className="p-3 bg-slate-50/50 dark:bg-slate-800/20 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                                <select 
                                    className="text-sm bg-white border border-slate-300 rounded-md p-1.5 focus:border-indigo-500"
                                    onChange={(e) => {
                                        if(e.target.value) {
                                            const newUnits = [...sys.indoorUnits, { roomId: e.target.value, index: 0 }];
                                            dispatch({ type: 'UPDATE_SYSTEM', payload: { ...sys, indoorUnits: newUnits } });
                                            e.target.value = ''; // reset select
                                        }
                                    }}
                                    value=""
                                >
                                    <option value="" disabled>+ Dodaj pomieszczenie do układu</option>
                                    {unassignedRooms.map(r => (
                                        <option key={r.id} value={r.id}>{r.name} (Max: {r.worstKw.toFixed(2)} kW)</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        
                        {hasMissingCombination && (
                            <div className="m-4 bg-red-50 text-red-700 p-3 rounded-lg text-sm flex gap-2 items-center">
                                <AlertTriangle size={16} /> Zbyt duża moc jednostek / zła konfiguracja portów - brak dopuszczalnej kombinacji producenta w wybranym agregacie!
                            </div>
                        )}
                    </Card>
                );
            })}

            {unassignedRooms.length > 0 && (
                <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/50 rounded-xl p-5">
                    <div className="flex items-center gap-2 text-amber-800 dark:text-amber-500 mb-3 font-semibold text-lg">
                        <AlertTriangle /> Pomieszczenia nieprzypisane do żadnego układu ({unassignedRooms.length})
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {unassignedRooms.map(r => (
                            <div key={r.id} className="bg-white dark:bg-slate-800 border border-amber-100 dark:border-amber-800/30 p-3 rounded-lg shadow-sm">
                                <div className="font-medium text-slate-800 dark:text-slate-200 truncate" title={r.name}>{r.name}</div>
                                <div className="text-amber-600 dark:text-amber-400 font-bold mt-1 max-w-full">Max: {r.worstKw.toFixed(2)} kW</div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-4 pt-3 border-t border-amber-200 text-amber-700 text-sm font-medium">
                        Suma szczytów nieprzypisanych: {unassignedRooms.reduce((a, b) => a + b.worstKw, 0).toFixed(2)} kW
                    </div>
                </div>
            )}
            
            {state.systems.length === 0 && unassignedRooms.length === 0 && (
                 <Card className="p-8 text-center bg-slate-50 opacity-70">
                    <p className="text-slate-500 mb-2">Brak wyników doboru. Przelicz pomieszczenia najpierw.</p>
                </Card>
            )}
        </div>
    );
};

export default HVACSystemsManager;
