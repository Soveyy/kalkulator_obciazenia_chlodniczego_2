
import React, { useState, useMemo } from 'react';
import { useCalculator } from '../contexts/CalculatorContext';
import { MONTH_NAMES } from '../constants';
import { motion, AnimatePresence } from 'framer-motion';
import { InfoIcon, SunIcon, ZapIcon } from './Icons';

const SolarHeatMap: React.FC = () => {
    const { state } = useCalculator();
    const [dataType, setDataType] = useState<'total' | 'solar' | 'solarInstant'>('solar');
    const [hoveredCell, setHoveredCell] = useState<{ month: number, hour: number, value: number } | null>(null);

    const matrix = useMemo(() => {
        if (dataType === 'total') return state.yearlyMatrix;
        if (dataType === 'solar') return state.solarMatrix;
        return state.solarInstantMatrix;
    }, [dataType, state.yearlyMatrix, state.solarMatrix, state.solarInstantMatrix]);

    if (!matrix || matrix.length === 0) return null;

    // Find max value for color scaling
    const maxValue = useMemo(() => {
        let max = 0;
        matrix.forEach(row => {
            row.forEach(val => {
                if (val > max) max = val;
            });
        });
        return max || 1;
    }, [matrix]);

    const getColor = (value: number) => {
        if (value <= 0) return 'rgb(241, 245, 249)'; // slate-100
        
        const ratio = value / maxValue;
        
        // Color scale: Blue -> Yellow -> Red
        if (ratio < 0.33) {
            // Blue to Cyan
            const r = Math.round(59 + (ratio / 0.33) * (6 - 59));
            const g = Math.round(130 + (ratio / 0.33) * (182 - 130));
            const b = Math.round(246 + (ratio / 0.33) * (212 - 246));
            return `rgb(${r}, ${g}, ${b})`;
        } else if (ratio < 0.66) {
            // Cyan to Yellow
            const r = Math.round(6 + ((ratio - 0.33) / 0.33) * (234 - 6));
            const g = Math.round(182 + ((ratio - 0.33) / 0.33) * (179 - 182));
            const b = Math.round(212 + ((ratio - 0.33) / 0.33) * (8 - 212));
            return `rgb(${r}, ${g}, ${b})`;
        } else {
            // Yellow to Red
            const r = Math.round(234 + ((ratio - 0.66) / 0.34) * (239 - 234));
            const g = Math.round(179 + ((ratio - 0.66) / 0.34) * (68 - 179));
            const b = Math.round(8 + ((ratio - 0.66) / 0.34) * (68 - 8));
            return `rgb(${r}, ${g}, ${b})`;
        }
    };

    const getTitle = () => {
        if (dataType === 'solarInstant') return 'Zyski Słoneczne (Chwilowe)';
        if (dataType === 'solar') return 'Obciążenie Słoneczne (RTS)';
        return 'Obciążenie Całkowite';
    };

    const hours = Array.from({ length: 24 }, (_, i) => i);

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        {dataType === 'total' ? <ZapIcon className="w-5 h-5 text-blue-500" /> : <SunIcon className="w-5 h-5 text-orange-500" />}
                        Mapa Ciepła: {getTitle()}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Rozkład godzinowy w skali całego roku [W]</p>
                </div>

                <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                    <button
                        onClick={() => setDataType('solarInstant')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${dataType === 'solarInstant' ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                        Słońce (Chw.)
                    </button>
                    <button
                        onClick={() => setDataType('solar')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${dataType === 'solar' ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                        Słońce (RTS)
                    </button>
                    <button
                        onClick={() => setDataType('total')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${dataType === 'total' ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                        Obciążenie
                    </button>
                </div>
            </div>

            <div className="relative">
                <div className="overflow-x-auto pb-4 scrollbar-hide">
                    <div className="min-w-[800px]">
                        {/* Header: Hours */}
                        <div className="flex mb-2">
                            <div className="w-24 shrink-0"></div>
                            <div className="flex flex-1 justify-between px-2">
                                {hours.map(h => (
                                    <div key={h} className="text-[10px] font-medium text-slate-400 w-full text-center">
                                        {h === 0 || h === 6 || h === 12 || h === 18 || h === 23 ? `${h}:00` : ''}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Grid */}
                        <div className="space-y-1">
                            {matrix.map((row, mIdx) => (
                                <div key={mIdx} className="flex items-center group">
                                    <div className="w-24 shrink-0 text-xs font-medium text-slate-500 dark:text-slate-400 pr-4 text-right">
                                        {MONTH_NAMES[mIdx]}
                                    </div>
                                    <div className="flex flex-1 gap-0.5 h-8">
                                        {row.map((val, hIdx) => (
                                            <motion.div
                                                key={hIdx}
                                                initial={false}
                                                animate={{ backgroundColor: getColor(val) }}
                                                className="flex-1 rounded-sm cursor-crosshair transition-transform hover:scale-110 hover:z-10 hover:shadow-lg"
                                                onMouseEnter={() => setHoveredCell({ month: mIdx, hour: hIdx, value: val })}
                                                onMouseLeave={() => setHoveredCell(null)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Tooltip */}
                <AnimatePresence>
                    {hoveredCell && (
                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="absolute top-[-60px] left-1/2 -translate-x-1/2 bg-slate-900 text-white px-4 py-2 rounded-xl shadow-2xl border border-white/10 z-30 pointer-events-none flex items-center gap-3 whitespace-nowrap"
                        >
                            <div className="flex flex-col">
                                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                                    {MONTH_NAMES[hoveredCell.month]} • {hoveredCell.hour}:00
                                </span>
                                <span className="text-lg font-bold">
                                    {Math.round(hoveredCell.value).toLocaleString()} W
                                </span>
                            </div>
                            <div className="w-px h-8 bg-white/20" />
                            <div className="text-xs text-slate-300">
                                {dataType === 'solar' ? 'Zysk słoneczny' : 'Obciążenie całkowite'}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-slate-100 dark:border-slate-700/50">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700" />
                        <span className="text-[10px] text-slate-500">0 W</span>
                    </div>
                    <div className="h-2 w-32 rounded-full bg-gradient-to-r from-blue-500 via-yellow-400 to-red-500" />
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-red-500" />
                        <span className="text-[10px] text-slate-500">{Math.round(maxValue).toLocaleString()} W</span>
                    </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-400 italic">
                    <InfoIcon className="w-4 h-4" />
                    Wykres uwzględnia RTS (bezwładność cieplną)
                </div>
            </div>
        </div>
    );
};

export default SolarHeatMap;
