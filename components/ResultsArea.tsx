
import React from 'react';
import { useCalculator } from '../contexts/CalculatorContext';
import HeatGainChart from './HeatGainChart';
import PeakSummary from './PeakSummary';
import ResultsPlaceholder from './ResultsPlaceholder';

interface ResultsAreaProps {
    bottomRightContent?: React.ReactNode;
}

const ResultsArea: React.FC<ResultsAreaProps> = ({ bottomRightContent }) => {
    const { state } = useCalculator();

    if (!state.results || !state.activeResults) {
        return <ResultsPlaceholder />;
    }

    return (
        <div className="mt-2 text-sm text-slate-600 dark:text-slate-400 h-full flex flex-col">
            <div className="mb-4 space-y-1">
                <div className="inline-flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
                    <span>{state.resultMessage}</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                    Automatyczny miesiąc wymiarujący jest celowo wybierany tylko z okresu kwiecień–wrzesień.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-stretch">
                <div className="lg:col-span-3 flex flex-col h-full">
                    <HeatGainChart />
                </div>
                <div className="lg:col-span-2 flex flex-col gap-4 h-full">
                    <PeakSummary />
                    {bottomRightContent}
                </div>
            </div>
        </div>
    );
};

export default ResultsArea;
