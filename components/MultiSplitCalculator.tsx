import React, { useState, useMemo, useEffect } from 'react';
import Card from './ui/Card';
import { useCalculator } from '../contexts/CalculatorContext';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

interface RoomData {
    id: string;
    name: string;
    peakLoadAtAggregate: number; // Obciążenie danego pomieszczenia w godzinie szczytu zbiorczego
    individualPeakLoad: number; // Maksymalne obciążenie chłodnicze tego pomieszczenia
}

interface MultiSplitCalculatorProps {
    rooms: RoomData[];
    aggregatePeak: number; // in Watts
    tExt: number;
    tInternal: number;
    rhInternal: number;
}

interface Combination {
    indoorUnits: number[];
    indoorCapacities: number[];
}

interface OutdoorUnit {
    model: string;
    maxPorts: number;
    combinations: Combination[];
}

const MultiSplitCalculator: React.FC<MultiSplitCalculatorProps> = ({ rooms, aggregatePeak, tExt, tInternal, rhInternal }) => {
    const { state, dispatch } = useCalculator();
    const config = state.multiSplitConfig || { selectedOutdoorModel: '', roomIndices: {}, applyTempCorrection: false, deactivatedRoomIds: [] };
    const { selectedOutdoorModel, roomIndices, applyTempCorrection, deactivatedRoomIds = [] } = config;
    
    const [db, setDb] = useState<Record<string, OutdoorUnit> | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [sortConfig, setSortConfig] = useState<{ key: 'individualPeakLoad' | 'requiredPeakKw' | null, direction: 'asc' | 'desc' }>({ key: null, direction: 'desc' });

    // Stull WB Calculation
    const calculateWBStull = (t: number, rh: number): number => {
        const tw = t * Math.atan(0.151977 * Math.pow(rh + 8.313659, 0.5)) + 
                   Math.atan(t + rh) - 
                   Math.atan(rh - 1.676331) + 
                   0.00391838 * Math.pow(rh, 1.5) * Math.atan(0.023101 * rh) - 
                   4.686035;
        return Number(tw.toFixed(2));
    };

    const calculatedWB = applyTempCorrection ? calculateWBStull(tInternal, rhInternal) : null;
    const isWbWarning = calculatedWB !== null && calculatedWB < 17;

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

    const correctionFactor = (applyTempCorrection && selectedOutdoorModel && calculatedWB !== null)
        ? calculateCorrectionFactor(selectedOutdoorModel, tExt, calculatedWB)
        : 1;

    useEffect(() => {
        fetch('/data/combination_database.json')
            .then(res => res.json())
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

    const activeOutdoorUnit = useMemo(() => {
        if (!db || !selectedOutdoorModel) return null;
        return db[selectedOutdoorModel];
    }, [db, selectedOutdoorModel]);

    const availableIndices = useMemo(() => {
        const indices = new Set<number>();
        if (!activeOutdoorUnit) {
            if (!db) return [];
            Object.values(db).forEach((unit) => {
                (unit as OutdoorUnit).combinations.forEach(comb => {
                    comb.indoorUnits.forEach(u => indices.add(u));
                });
            });
        } else {
            activeOutdoorUnit.combinations.forEach(comb => {
                comb.indoorUnits.forEach(u => indices.add(u));
            });
        }
        return Array.from(indices).sort((a, b) => a - b);
    }, [db, activeOutdoorUnit]);

    const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        dispatch({ type: 'UPDATE_MULTI_SPLIT_CONFIG', payload: { selectedOutdoorModel: e.target.value } });
    };

    const handleIndexChange = (roomId: string, value: string) => {
        dispatch({
            type: 'UPDATE_MULTI_SPLIT_CONFIG',
            payload: {
                roomIndices: {
                    ...roomIndices,
                    [roomId]: Number(value) || 0
                }
            }
        });
    };

    const toggleRoomDeactivation = (roomId: string) => {
        const isDeactivated = deactivatedRoomIds.includes(roomId);
        const newDeactivated = isDeactivated 
            ? deactivatedRoomIds.filter(id => id !== roomId)
            : [...deactivatedRoomIds, roomId];
        
        dispatch({
            type: 'UPDATE_MULTI_SPLIT_CONFIG',
            payload: { deactivatedRoomIds: newDeactivated }
        });
    };

    const toggleSort = (key: 'individualPeakLoad' | 'requiredPeakKw') => {
        setSortConfig(prev => {
            if (prev.key === key) {
                return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
            }
            return { key, direction: 'desc' };
        });
    };

    const calculationResults = useMemo(() => {
        const prepareRoomInfo = (room: RoomData) => {
            const index = roomIndices[room.id] || 0;
            const requiredPeakKw = room.peakLoadAtAggregate / 1000;
            const individualPeakKwValue = room.individualPeakLoad / 1000;
            const isDeactivated = deactivatedRoomIds.includes(room.id);
            return { index, requiredPeakKw, individualPeakKwValue, isDeactivated };
        };

        // 1. Calculate base results for ALL rooms first to ensure stable values
        const baseResults = rooms.map(room => {
            const info = prepareRoomInfo(room);
            return {
                ...room,
                ...info,
                realCapacityKw: 0,
                ratio: 0,
                colorClass: 'text-slate-500',
                bgClass: ''
            };
        });

        // 2. Apply rounding adjustment ALWAYS based on all project rooms to keep "Obciążenie jednoczesne" stable
        const totalProjectPeakRounded = Number((aggregatePeak / 1000).toFixed(2));
        const currentSumAll = baseResults.reduce((sum, r) => sum + Number(r.requiredPeakKw.toFixed(2)), 0);
        const projectDiff = Number((totalProjectPeakRounded - currentSumAll).toFixed(2));

        if (projectDiff !== 0 && baseResults.length > 0) {
            // Adjust the first room with non-zero load in the project
            const target = baseResults.find(r => r.requiredPeakKw > 0) || baseResults[0];
            const targetIdx = baseResults.findIndex(r => r.id === target.id);
            if (targetIdx !== -1) {
                baseResults[targetIdx].requiredPeakKw += projectDiff;
            }
        }

        let finalResults;
        if (!activeOutdoorUnit) {
            finalResults = baseResults;
        } else {
            const currentSelection: { roomId: string, index: number }[] = [];
            baseResults.forEach(room => {
                if (room.index > 0 && !room.isDeactivated) {
                    currentSelection.push({ roomId: room.id, index: room.index });
                }
            });

            if (currentSelection.length === 0) {
                finalResults = baseResults;
            } else {
                const selectedIndicesSorted = currentSelection.map(s => s.index).sort((a, b) => a - b);
                const match = activeOutdoorUnit.combinations.find(comb => {
                    if (comb.indoorUnits.length !== selectedIndicesSorted.length) return false;
                    const combIndicesSorted = [...comb.indoorUnits].sort((a, b) => a - b);
                    return combIndicesSorted.every((val, index) => val === selectedIndicesSorted[index]);
                });

                const capacityPool: Record<number, number[]> = {};
                if (match) {
                    match.indoorUnits.forEach((unit, i) => {
                        if (!capacityPool[unit]) capacityPool[unit] = [];
                        capacityPool[unit].push(match.indoorCapacities[i]);
                    });
                }

                finalResults = baseResults.map(room => {
                    let realCapacityKw = 0;
                    if (match && room.index > 0 && !room.isDeactivated) {
                        const caps = capacityPool[room.index];
                        if (caps && caps.length > 0) {
                            realCapacityKw = caps.shift()! * correctionFactor;
                        }
                    }

                    let ratio = 0;
                    if (room.requiredPeakKw > 0) {
                        ratio = (realCapacityKw / room.requiredPeakKw) * 100;
                    }

                    let colorClass = 'text-slate-500';
                    let bgClass = '';
                    
                    if (room.index > 0 && room.requiredPeakKw > 0 && !room.isDeactivated) {
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

                    return {
                        ...room,
                        realCapacityKw,
                        ratio,
                        colorClass,
                        bgClass
                    };
                });
            }
        }

        // Apply sorting
        if (sortConfig.key) {
            const { key, direction } = sortConfig;
            return [...finalResults].sort((a, b) => {
                const valA = a[key];
                const valB = b[key];
                if (direction === 'asc') return valA - valB;
                return valB - valA;
            });
        }

        return finalResults;
    }, [activeOutdoorUnit, rooms, roomIndices, correctionFactor, deactivatedRoomIds, aggregatePeak, sortConfig]);

    const sumOfSelectedIndices = rooms.reduce((sum, room) => {
        if (deactivatedRoomIds.includes(room.id)) return sum;
        return sum + (roomIndices[room.id] || 0);
    }, 0);

    const outdoorIndexMatch = selectedOutdoorModel.match(/(\d+)[^\d]*$/);
    const outdoorIndex = outdoorIndexMatch ? parseInt(outdoorIndexMatch[1], 10) : 0;
    const connectionRatio = outdoorIndex > 0 && sumOfSelectedIndices > 0 
        ? (sumOfSelectedIndices / outdoorIndex) * 100 
        : 0;

    const getConnectionRatioColor = (ratio: number) => {
        if (ratio === 0) return '';
        if (ratio <= 130) return 'rgb(34, 197, 94)'; // green-500
        
        if (ratio <= 150) {
            // 130 to 150: green-500 (34, 197, 94) -> lime-500 (132, 204, 22)
            const t = (ratio - 130) / (150 - 130);
            const r = Math.round(34 + (132 - 34) * t);
            const g = Math.round(197 + (204 - 197) * t);
            const b = Math.round(94 + (22 - 94) * t);
            return `rgb(${r}, ${g}, ${b})`;
        }
        
        if (ratio <= 160) {
            // 150 to 160: lime-500 (132, 204, 22) -> amber-500 (245, 158, 11)
            const t = (ratio - 150) / (160 - 150);
            const r = Math.round(132 + (245 - 132) * t);
            const g = Math.round(204 + (158 - 204) * t);
            const b = Math.round(22 + (11 - 22) * t);
            return `rgb(${r}, ${g}, ${b})`;
        }

        if (ratio <= 175) {
            // 160 to 175: amber-500 (245, 158, 11) -> red-700 (185, 28, 28)
            const t = (ratio - 160) / (175 - 160);
            const r = Math.round(245 + (185 - 245) * t);
            const g = Math.round(158 + (28 - 158) * t);
            const b = Math.round(11 + (28 - 11) * t);
            return `rgb(${r}, ${g}, ${b})`;
        }
        
        return 'rgb(185, 28, 28)'; // red-700
    };

    if (isLoading) {
        return <Card className="p-8 text-center"><div className="animate-spin inline-block w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full mb-2"></div><p>Ładowanie bazy kombinacji...</p></Card>;
    }

    const sumOfSelectedLoadsKw = calculationResults.reduce((sum, room) => {
        if (room.isDeactivated) return sum;
        return sum + room.requiredPeakKw;
    }, 0);

    return (
        <Card className="p-4 mt-6" id="multi-split-calculator">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Dobór układu Multi-Split (Mitsubishi Electric)</h3>
            
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 mb-6">
                <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Szczytowe obciążenie sumaryczne
                        </label>
                        <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                            {sumOfSelectedLoadsKw.toFixed(2)} kW
                        </div>
                        {sumOfSelectedLoadsKw < (aggregatePeak / 1000) - 0.01 && (
                            <div className="text-xs text-slate-400 mt-1">
                                (Pełny szczyt projektu: {(aggregatePeak / 1000).toFixed(2)} kW)
                            </div>
                        )}
                    </div>
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Wybierz agregat zewnętrzny
                        </label>
                        <select
                            value={selectedOutdoorModel}
                            onChange={handleModelChange}
                            className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2.5"
                        >
                            <option value="">-- Wybierz model --</option>
                            {outdoorModels.map(model => (
                                <option key={model} value={model}>{model}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Suma wybranych indeksów
                        </label>
                        <div className="text-2xl font-bold text-slate-700 dark:text-slate-300">
                            {sumOfSelectedIndices}
                        </div>
                    </div>
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1" title="Stosunek sumy indeksów jednostek wewn. do indeksu agregatu">
                            Przewymiarowanie j. wewn.
                        </label>
                        <div 
                            className={`text-2xl font-bold ${!selectedOutdoorModel ? 'text-slate-400 dark:text-slate-600' : ''}`}
                            style={{ color: (selectedOutdoorModel && connectionRatio > 0) ? getConnectionRatioColor(connectionRatio) : undefined }}
                        >
                            {selectedOutdoorModel && connectionRatio > 0 ? `${connectionRatio.toFixed(1)}%` : '-'}
                        </div>
                    </div>
                </div>
                
                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <label className="flex items-center gap-2 cursor-pointer mb-2">
                        <input 
                            type="checkbox" 
                            checked={applyTempCorrection}
                            onChange={(e) => dispatch({ type: 'UPDATE_MULTI_SPLIT_CONFIG', payload: { applyTempCorrection: e.target.checked } })}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            Uwzględnij korekcję mocy agregatu w zależności od temperatur
                        </span>
                    </label>

                    {applyTempCorrection && selectedOutdoorModel && calculatedWB !== null && (
                        <div className="flex flex-wrap items-center gap-4 text-sm mt-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-lg">
                            <div className="flex flex-col">
                                <span className="text-slate-500 text-xs">Korekcja mocy agregatu</span>
                                <span className="font-bold text-indigo-600 dark:text-indigo-400 text-lg">
                                    {(correctionFactor * 100).toFixed(1)}%
                                </span>
                            </div>
                            <div className="w-px h-8 bg-slate-200 dark:bg-slate-700 hidden sm:block"></div>
                            <div className="flex flex-col">
                                <span className="text-slate-500 text-xs">Temp. zewn. (DB) w szczycie</span>
                                <span className="font-semibold text-slate-700 dark:text-slate-300">
                                    {tExt.toFixed(1)}°C
                                </span>
                            </div>
                            <div className="w-px h-8 bg-slate-200 dark:bg-slate-700 hidden sm:block"></div>
                            <div className="flex flex-col">
                                <span className="text-slate-500 text-xs">Temp. mokrego termometru wewn. (WB)</span>
                                <span className={`font-semibold ${isWbWarning ? 'text-red-500' : 'text-slate-700 dark:text-slate-300'}`}>
                                    {calculatedWB.toFixed(2)}°C
                                </span>
                            </div>
                            {isWbWarning && (
                                <div className="w-full mt-2 text-xs text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-900/10 p-2 rounded border border-amber-200 dark:border-amber-800/30">
                                    <strong>Uwaga:</strong> Parametry powietrza poza zakresem DTR (WB &lt; 17°C, niska temperatura wewnętrzna). Nastąpi znaczny spadek mocy agregatu, brak dokładnych danych producenta.
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-800/50">
                        <tr>
                            <th scope="col" className="w-10 px-4 py-3"></th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Pomieszczenie
                            </th>
                            <th 
                                scope="col" 
                                className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-indigo-600 transition-colors"
                                onClick={() => toggleSort('individualPeakLoad')}
                            >
                                <div className="flex items-center justify-end gap-1">
                                    Obciążenie maksymalne [kW]
                                    {sortConfig.key === 'individualPeakLoad' ? (
                                        sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                                    ) : (
                                        <ChevronsUpDown size={14} className="opacity-30" />
                                    )}
                                </div>
                            </th>
                            <th 
                                scope="col" 
                                className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-indigo-600 transition-colors"
                                onClick={() => toggleSort('requiredPeakKw')}
                            >
                                <div className="flex items-center justify-end gap-1">
                                    Obciążenie jednoczesne [kW]
                                    {sortConfig.key === 'requiredPeakKw' ? (
                                        sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                                    ) : (
                                        <ChevronsUpDown size={14} className="opacity-30" />
                                    )}
                                </div>
                            </th>
                            <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Indeks j.wewn.
                            </th>
                            <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Moc rzecz. [kW]
                            </th>
                            <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Pokrycie [%]
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                        {calculationResults.map((room) => (
                            <tr key={room.id} className={`${room.bgClass} ${room.isDeactivated ? 'opacity-40' : ''} transition-all`}>
                                <td className="px-4 py-3 whitespace-nowrap">
                                    <input 
                                        type="checkbox" 
                                        checked={!room.isDeactivated}
                                        onChange={() => toggleRoomDeactivation(room.id)}
                                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                        title={room.isDeactivated ? "Aktywuj pomieszczenie" : "Dezaktywuj pomieszczenie (pomiń w doborze)"}
                                    />
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                    {room.name}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-400 dark:text-gray-500 italic">
                                    {(room.individualPeakLoad / 1000).toFixed(2)}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-700 dark:text-gray-300 font-bold">
                                    {room.requiredPeakKw > 0 ? room.requiredPeakKw.toFixed(2) : '-'}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                                    <select
                                        value={room.index || ''}
                                        onChange={(e) => handleIndexChange(room.id, e.target.value)}
                                        className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-20 ml-auto p-1 text-sm text-right"
                                    >
                                        <option value="0">-</option>
                                        {availableIndices.map(idx => (
                                            <option key={idx} value={idx}>{idx}</option>
                                        ))}
                                    </select>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-700 dark:text-gray-300">
                                    {room.index > 0 ? (room.realCapacityKw > 0 ? room.realCapacityKw.toFixed(2) : 'brak komb.') : '-'}
                                </td>
                                <td className={`px-4 py-3 whitespace-nowrap text-sm text-right ${room.colorClass}`}>
                                    {room.index > 0 && room.requiredPeakKw > 0 && room.realCapacityKw > 0 ? room.ratio.toFixed(1) + '%' : '-'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="mt-6">
                <div className="flex flex-wrap gap-4 text-xs font-medium mb-3">
                    <div className="flex items-center gap-2 px-2 py-1 rounded bg-green-50 dark:bg-green-900/10 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800">
                        <span className="w-2 h-2 rounded-full bg-green-500"></span> 
                        Optymalny (90% - 150%)
                    </div>
                    <div className="flex items-center gap-2 px-2 py-1 rounded bg-orange-50 dark:bg-orange-900/10 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-800">
                        <span className="w-2 h-2 rounded-full bg-orange-500"></span> 
                        Dopuszczalny niedobór (75% - 90%)
                    </div>
                    <div className="flex items-center gap-2 px-2 py-1 rounded bg-red-50 dark:bg-red-900/10 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800">
                        <span className="w-2 h-2 rounded-full bg-red-500"></span> 
                        Niedobór (&lt; 75%)
                    </div>
                    <div className="flex items-center gap-2 px-2 py-1 rounded bg-blue-50 dark:bg-blue-900/10 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                        <span className="w-2 h-2 rounded-full bg-blue-500"></span> 
                        Przewymiarowanie (&gt; 150%)
                    </div>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed italic">
                    * Progi doboru uwzględniają specyfikę systemów Multi-Split: rzadkie występowanie jednoczesnego szczytowego zapotrzebowania we wszystkich pomieszczeniach oraz możliwość dynamicznego przekierowania mocy przez agregat.
                </p>
            </div>

            {selectedOutdoorModel && sumOfSelectedIndices > 0 && calculationResults.every(r => r.index === 0 || r.realCapacityKw === 0) && (
                <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg text-sm border border-red-200 dark:border-red-900">
                    Brak obsługiwanej kombinacji dla wybranych jednostek dla agregatu {selectedOutdoorModel}. Sprawdź tabelę kombinacji producenta lub zmniejsz liczbę/wielkość jednostek.
                </div>
            )}
        </Card>
    );
};

export default MultiSplitCalculator;

