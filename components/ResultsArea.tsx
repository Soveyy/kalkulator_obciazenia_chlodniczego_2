
import React from 'react';
import { useCalculator } from '../contexts/CalculatorContext';
import { ANALYSIS_MONTHS } from '../constants';
import HeatGainChart from './HeatGainChart';
import PeakSummary from './PeakSummary';

import { ChartBarIcon, ChartLineIcon } from './Icons';

interface ResultsAreaProps {
    bottomRightContent?: React.ReactNode;
}

const ResultsArea: React.FC<ResultsAreaProps> = ({ bottomRightContent }) => {
    const { state, dispatch } = useCalculator();

    if (!state.results || !state.activeResults) {
        return null;
    }

    const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        dispatch({ type: 'RECALCULATE_VIEW', payload: e.target.value });
    };

    const availableMonths = ANALYSIS_MONTHS.ARRAY;

    return (
        <div className="mt-2">
            <div className="text-sm mb-4 text-slate-600 dark:text-slate-400" dangerouslySetInnerHTML={{ __html: state.resultMessage }} />

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <div className="lg:col-span-3 flex flex-col gap-4">
                    <HeatGainChart />
                    
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                            <div className="flex items-center gap-3">
                                <label htmlFor="month-selector" className="font-semibold text-slate-800 dark:text-white whitespace-nowrap">Miesiąc analizy:</label>
                                <select id="month-selector" value={state.currentMonth} onChange={handleMonthChange} className="p-2 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white border-none focus:ring-2 focus:ring-blue-500 cursor-pointer text-sm font-medium min-w-[120px] capitalize">
                                    {availableMonths.map((monthIndex) => (
                                        <option key={monthIndex} value={monthIndex}>
                                            {new Date(0, monthIndex - 1).toLocaleString('pl-PL', { month: 'long' })}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            
                            {state.monthlyPeaks?.length > 0 && (
                                <span className="text-sm text-slate-500 dark:text-slate-400">
                                    Miesiąc maksymalny: <strong className="text-slate-700 dark:text-slate-300 capitalize">
                                        {new Date(0, parseInt(state.monthlyPeaks.reduce((max, current) => max.peak > current.peak ? max : current, state.monthlyPeaks[0]).month, 10) - 1).toLocaleString('pl-PL', { month: 'long' })}
                                    </strong>
                                </span>
                            )}
                        </div>
                        
                        <div className="flex items-center bg-slate-100 dark:bg-slate-700 p-1 rounded-lg">
                            <button 
                                onClick={() => state.chartType !== 'line' && dispatch({type: 'TOGGLE_CHART_TYPE'})}
                                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${state.chartType === 'line' ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
                            >
                                <ChartLineIcon className="w-4 h-4" /> Liniowy
                            </button>
                            <button 
                                onClick={() => state.chartType !== 'bar' && dispatch({type: 'TOGGLE_CHART_TYPE'})}
                                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${state.chartType === 'bar' ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
                            >
                                <ChartBarIcon className="w-4 h-4" /> Słupkowy
                            </button>
                        </div>
                    </div>
                </div>
                <div className="lg:col-span-2 flex flex-col gap-4">
                    <PeakSummary />
                    {bottomRightContent}
                </div>
            </div>
        </div>
    );
};

export default ResultsArea;
