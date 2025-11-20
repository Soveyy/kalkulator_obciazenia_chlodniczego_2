
import React from 'react';
import { useCalculator } from '../contexts/CalculatorContext';
import HeatGainChart from './HeatGainChart';
import PeakSummary from './PeakSummary';
import ResultsTable from './ResultsTable';
import Button from './ui/Button';

const ResultsArea: React.FC = () => {
    const { state, dispatch } = useCalculator();

    if (!state.results || !state.activeResults) {
        return null;
    }

    const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        dispatch({ type: 'RECALCULATE_VIEW', payload: e.target.value });
    };

    // Restrict available months to April (4) through September (9)
    const availableMonths = Array.from({ length: 6 }, (_, i) => i + 4);

    return (
        <div className="mt-6">
            <div className="mb-4 bg-white dark:bg-slate-800 p-4 rounded-lg shadow-md">
                <label htmlFor="month-selector" className="mr-2 font-semibold text-slate-800 dark:text-white">Zmień miesiąc do analizy:</label>
                <select id="month-selector" value={state.currentMonth} onChange={handleMonthChange} className="p-2 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white">
                    {availableMonths.map((monthIndex) => (
                        <option key={monthIndex} value={monthIndex}>
                            {new Date(0, monthIndex - 1).toLocaleString('pl-PL', { month: 'long' })}
                        </option>
                    ))}
                </select>
                <div className="text-sm mt-2 text-slate-600 dark:text-slate-400" dangerouslySetInnerHTML={{ __html: state.resultMessage }} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <div className="lg:col-span-3">
                    <HeatGainChart />
                </div>
                <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-6">
                    <PeakSummary />
                    <ResultsTable />
                </div>
            </div>

             <div className="text-center mt-6">
                <Button variant="secondary" onClick={() => dispatch({type: 'TOGGLE_CHART_TYPE'})}>
                    Zmień na widok {state.chartType === 'line' ? 'słupkowy' : 'liniowy'}
                </Button>
             </div>
        </div>
    );
};

export default ResultsArea;
