import React, { useState } from 'react';
import { useCalculator } from '../contexts/CalculatorContext';
import Card from './ui/Card';
import { ChevronDownIcon } from './Icons';

const ResultsTable: React.FC = () => {
    const { state } = useCalculator();
    const [isCollapsed, setIsCollapsed] = useState(true);

    if (!state.activeResults) return null;

    const { finalGains } = state.activeResults;
    const localHours = Array.from({ length: 24 }, (_, i) => i);
    
    const month = parseInt(state.currentMonth, 10);
    const isSummerTime = (month >= 4 && month <= 10);
    const offset = isSummerTime ? 2 : 1;

    return (
        <Card>
            <h3 
                className="text-lg font-semibold mb-2 text-slate-800 dark:text-white flex justify-between items-center cursor-pointer"
                onClick={() => setIsCollapsed(!isCollapsed)}
                aria-expanded={!isCollapsed}
            >
                <span>Wyniki Godzinowe (Clear Sky)</span>
                <ChevronDownIcon className={`w-5 h-5 transition-transform duration-200 ${!isCollapsed ? 'rotate-180' : ''}`} />
            </h3>
             <div className={`collapsible-content ${!isCollapsed ? 'expanded' : ''}`}>
                <div className="max-h-64 overflow-y-auto">
                    <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                        <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-700 dark:text-slate-300 sticky top-0">
                            <tr>
                                <th scope="col" className="px-2 py-2">Godz. (lokalna)</th>
                                <th scope="col" className="px-2 py-2 text-right">Jawne [W]</th>
                                <th scope="col" className="px-2 py-2 text-right">Utajone [W]</th>
                                <th scope="col" className="px-2 py-2 text-right">Całkowite [W]</th>
                            </tr>
                        </thead>
                        <tbody>
                            {localHours.map(localHour => {
                                const utcHour = (localHour - offset + 24) % 24;
                                return (
                                <tr key={localHour} className="bg-white border-b dark:bg-slate-800 dark:border-slate-700">
                                    <th scope="row" className="px-2 py-1 font-medium text-slate-900 dark:text-white">{`${String(localHour).padStart(2, '0')}:00`}</th>
                                    <td className="px-2 py-1 text-right">{finalGains.clearSky.sensible[utcHour].toFixed(0)}</td>
                                    <td className="px-2 py-1 text-right">{finalGains.clearSky.latent[utcHour].toFixed(0)}</td>
                                    <td className="px-2 py-1 text-right font-semibold">{finalGains.clearSky.total[utcHour].toFixed(0)}</td>
                                </tr>
                            )})}
                        </tbody>
                    </table>
                </div>
            </div>
        </Card>
    );
};

export default ResultsTable;