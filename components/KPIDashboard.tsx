
import React from 'react';
import { useCalculator } from '../contexts/CalculatorContext';

const KPIDashboard: React.FC = () => {
    const { state } = useCalculator();
    const { activeResults, input, theme } = state;

    if (!activeResults) return null;

    const { finalGains } = activeResults;
    
    // Find peak
    const maxLoad = Math.max(...finalGains.clearSky.total);
    const roomArea = parseFloat(input.roomArea) || 1;
    const loadDensity = maxLoad / roomArea;

    const bgColor = theme === 'dark' ? 'bg-slate-800/95 border-slate-700' : 'bg-white/95 border-slate-200';
    const textColor = theme === 'dark' ? 'text-white' : 'text-slate-800';

    return (
        <div className={`fixed bottom-0 left-0 w-full z-50 border-t shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] backdrop-blur-sm transition-all duration-300 ${bgColor}`}>
            <div className="max-w-[1920px] mx-auto px-4 py-3 flex items-center justify-between lg:justify-center lg:gap-16">
                
                <div className="flex flex-col items-start lg:items-center">
                    <span className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">Szczytowe Obciążenie</span>
                    <div className={`text-xl md:text-2xl font-bold ${textColor}`}>
                        {maxLoad.toFixed(0)} <span className="text-sm font-normal text-slate-500">W</span>
                    </div>
                </div>

                <div className="h-8 w-px bg-slate-300 dark:bg-slate-600 mx-2"></div>

                <div className="flex flex-col items-end lg:items-center">
                    <span className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">Wskaźnik Powierzchniowy</span>
                    <div className={`text-xl md:text-2xl font-bold ${textColor}`}>
                        {loadDensity.toFixed(1)} <span className="text-sm font-normal text-slate-500">W/m²</span>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default KPIDashboard;
